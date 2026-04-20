import { createElement, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';
import {
  useMatchesControllerGetById,
  useMatchesControllerUpdate,
  getMatchesControllerGetByIdQueryKey,
} from '@/api/generated/matches/matches';
import { getTenantMatchesControllerListQueryKey } from '@/api/generated/tenant-—-matches/tenant-—-matches';
import { useVenuesControllerList } from '@/api/generated/venues/venues';
import { UpdateMatchDtoSportType } from '@/api/generated/models/updateMatchDtoSportType';
import { MatchDetailResponseDtoStatus } from '@/api/generated/models/matchDetailResponseDtoStatus';
import type { MatchDetailResponseDto } from '@/api/generated/models/matchDetailResponseDto';
import { ApiError, unwrap } from '@/api';
import { ALL_SPORTS_ICON, getSportIcon } from '@/lib/sportIcons';
import { scheduledIsoToDateAndTime, toZonedISO } from '@/lib/format';
import { useTenantTimezone } from '@/shared/hooks';

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;
const CAPACITY_MIN = 2;
const CAPACITY_MAX = 100;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function buildEditMatchSchema(rosterConfirmed: number) {
  const capFloor = Math.max(CAPACITY_MIN, rosterConfirmed);
  return z
    .object({
      title: z.string().min(3, 'validation.titleMin'),
      sportType: z.enum(
        Object.values(UpdateMatchDtoSportType) as [string, ...string[]],
        { error: 'validation.sportRequired' },
      ),
      venueId: z.string().min(1, 'validation.venueRequired'),
      scheduledDate: z
        .date({ error: 'validation.dateRequired' })
        .refine((d) => d >= today(), { message: 'validation.datePast' }),
      scheduledTime: z.string().min(1, 'validation.timeRequired'),
      durationMins: z
        .number({ error: 'validation.durationMin' })
        .min(10, 'validation.durationMin')
        .max(240, 'validation.durationMax'),
      maxCapacity: z
        .number({ error: 'validation.capacityMin' })
        .min(capFloor, 'validation.capacityBelowRoster')
        .max(CAPACITY_MAX, 'validation.capacityMax'),
      pricePerPlayer: z
        .number({ error: 'validation.priceMin' })
        .min(1, 'validation.priceMin')
        .refine((v) => Number.isInteger(v), 'validation.priceInteger'),
      minRealSpots: z.number().int().min(0).default(0),
    })
    .superRefine((data, ctx) => {
      if (data.minRealSpots > data.maxCapacity) {
        ctx.addIssue({
          code: 'custom',
          path: ['minRealSpots'],
          message: 'validation.minRealSpotsExceedsCapacity',
        });
      }
    });
}

type FormValues = z.output<ReturnType<typeof buildEditMatchSchema>>;

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  hasError?: boolean;
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  hasError,
}: StepperProps) {
  return (
    <div
      className={cn(
        'flex h-9 items-center rounded-lg border border-input',
        hasError && 'border-destructive ring-3 ring-destructive/20',
      )}
    >
      <button
        type="button"
        className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-10 flex-1 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function resolveFieldError(
  t: (key: string, opts?: Record<string, unknown>) => string,
  message?: string,
) {
  if (!message) return undefined;
  if (message === 'validation.capacityBelowRoster') {
    return t(`editMatch.${message}`);
  }
  if (message === 'validation.minRealSpotsExceedsCapacity') {
    return t(`editMatch.${message}`);
  }
  return t(`createMatch.${message}`, { defaultValue: message });
}

type MatchDetailWithFake = MatchDetailResponseDto & {
  isFake?: boolean;
  minRealSpots?: number;
  fakeBookingsCount?: number;
};

interface EditMatchFormProps {
  match: MatchDetailWithFake;
}

function EditMatchForm({ match }: EditMatchFormProps) {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantTz = useTenantTimezone();

  const rosterConfirmed = match.maxCapacity - match.spotsRemaining;
  const capacityFloor = Math.max(CAPACITY_MIN, rosterConfirmed);

  const schema = useMemo(
    () => buildEditMatchSchema(rosterConfirmed),
    [rosterConfirmed],
  );

  const { data: venuesData, isLoading: venuesLoading } =
    useVenuesControllerList({ limit: 100 });
  const venues = useMemo(() => unwrap(venuesData)?.items ?? [], [venuesData]);

  const venueOptions = useMemo<SearchableComboboxOption[]>(
    () => venues.map((v) => ({ value: v.id, label: v.name })),
    [venues],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  });

  useEffect(() => {
    const { date, time } = scheduledIsoToDateAndTime(
      match.scheduledAt,
      tenantTz,
    );
    reset({
      title: match.title,
      sportType: match.sportType,
      venueId: match.venueId,
      scheduledDate: date,
      scheduledTime: time,
      durationMins: match.durationMins,
      maxCapacity: match.maxCapacity,
      pricePerPlayer: match.pricePerPlayer,
      minRealSpots: match.minRealSpots ?? 0,
    });
  }, [match, tenantTz, reset]);

  const mutation = useMatchesControllerUpdate({
    mutation: {
      onSuccess: () => {
        toast.success(t('editMatch.success'));
        void queryClient.invalidateQueries({
          queryKey: getMatchesControllerGetByIdQueryKey(match.id),
        });
        void queryClient.invalidateQueries({
          queryKey: getTenantMatchesControllerListQueryKey(),
        });
        navigate(`/operator/matches/${match.id}`);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.statusCode === 403) {
            toast.error(t('editMatch.error.forbidden'));
          } else if (err.statusCode === 409) {
            toast.error(t('editMatch.error.overlap'));
          } else {
            toast.error(t('editMatch.error.generic'));
          }
        } else {
          toast.error(t('editMatch.error.generic'));
        }
      },
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({
      id: match.id,
      data: {
        title: values.title,
        sportType: values.sportType as UpdateMatchDtoSportType,
        venueId: values.venueId,
        scheduledAt: toZonedISO(
          values.scheduledDate,
          values.scheduledTime,
          tenantTz,
        ),
        durationMins: values.durationMins,
        maxCapacity: values.maxCapacity,
        pricePerPlayer: values.pricePerPlayer,
        ...(match.isFake ? { minRealSpots: values.minRealSpots } : {}),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t('createMatch.sections.details')}
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-match-title">
              {t('createMatch.fields.title')}
            </Label>
            <Input
              id="edit-match-title"
              placeholder={t('createMatch.fields.titlePlaceholder')}
              {...register('title')}
            />
            <FieldError message={resolveFieldError(t, errors.title?.message)} />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-match-sport">
                {t('createMatch.fields.sport')}
              </Label>
              <Controller
                control={control}
                name="sportType"
                render={({ field }) => {
                  const sportTriggerIcon = field.value
                    ? getSportIcon(field.value)
                    : ALL_SPORTS_ICON;
                  return (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="edit-match-sport"
                        size="default"
                        className="h-9 w-full gap-2"
                        aria-invalid={!!errors.sportType}
                      >
                        {createElement(sportTriggerIcon, {
                          className: 'size-3.5 shrink-0 text-muted-foreground',
                          'aria-hidden': true,
                        })}
                        <SelectValue
                          placeholder={t('createMatch.fields.sportPlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(UpdateMatchDtoSportType).map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-1.5">
                              {createElement(getSportIcon(s), {
                                className:
                                  'size-3.5 shrink-0 text-muted-foreground',
                              })}
                              {t(`matches.sport.${s}`, { defaultValue: s })}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              <FieldError
                message={resolveFieldError(t, errors.sportType?.message)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-match-venue">
                {t('createMatch.fields.venue')}
              </Label>
              <Controller
                control={control}
                name="venueId"
                render={({ field }) => (
                  <SearchableCombobox
                    options={venueOptions}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('createMatch.fields.venuePlaceholder')}
                    searchPlaceholder={t('createMatch.fields.venueSearch')}
                    emptyLabel={t('createMatch.fields.venueEmpty')}
                    isLoading={venuesLoading}
                    hasError={!!errors.venueId}
                  />
                )}
              />
              <FieldError
                message={resolveFieldError(t, errors.venueId?.message)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t('createMatch.sections.schedule')}
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-match-date">
                {t('createMatch.fields.date')}
              </Label>
              <Controller
                control={control}
                name="scheduledDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t('createMatch.fields.date')}
                    fromDate={today()}
                    className="h-9 w-full"
                  />
                )}
              />
              <FieldError
                message={resolveFieldError(t, errors.scheduledDate?.message)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('createMatch.fields.time')}</Label>
              <Controller
                control={control}
                name="scheduledTime"
                render={({ field }) => {
                  const [h = '', m = ''] = field.value
                    ? field.value.split(':')
                    : [];
                  const setTime = (hour: string, minute: string) => {
                    if (hour && minute) field.onChange(`${hour}:${minute}`);
                    else field.onChange('');
                  };
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={h}
                        onValueChange={(v) => setTime(v ?? '', m || '00')}
                      >
                        <SelectTrigger
                          size="default"
                          className="h-9 w-full"
                          aria-invalid={!!errors.scheduledTime}
                        >
                          <SelectValue
                            placeholder={t('createMatch.fields.hour')}
                          />
                        </SelectTrigger>
                        <SelectContent
                          alignItemWithTrigger={false}
                          className="max-h-56"
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const val = String(i).padStart(2, '0');
                            return (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      <Select
                        value={m}
                        onValueChange={(v) => setTime(h || '00', v ?? '')}
                      >
                        <SelectTrigger
                          size="default"
                          className="h-9 w-full"
                          aria-invalid={!!errors.scheduledTime}
                        >
                          <SelectValue
                            placeholder={t('createMatch.fields.minute')}
                          />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {['00', '15', '30', '45'].map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }}
              />
              <FieldError
                message={resolveFieldError(t, errors.scheduledTime?.message)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('createMatch.fields.duration')}</Label>
            <Controller
              control={control}
              name="durationMins"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger
                    size="default"
                    className="h-9 w-full"
                    aria-invalid={!!errors.durationMins}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {DURATION_OPTIONS.map((mins) => (
                      <SelectItem key={mins} value={String(mins)}>
                        {t('createMatch.fields.durationOption', { mins })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              message={resolveFieldError(t, errors.durationMins?.message)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t('createMatch.sections.pricing')}
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('createMatch.fields.maxCapacity')}</Label>
              <Controller
                control={control}
                name="maxCapacity"
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={field.onChange}
                    min={capacityFloor}
                    max={CAPACITY_MAX}
                    step={1}
                    hasError={!!errors.maxCapacity}
                  />
                )}
              />
              <FieldError
                message={resolveFieldError(t, errors.maxCapacity?.message)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-match-price">
                {t('createMatch.fields.price')}
              </Label>
              <div
                className={cn(
                  'flex h-9 items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
                  errors.pricePerPlayer &&
                    'border-destructive ring-3 ring-destructive/20',
                )}
              >
                <span className="flex h-full items-center bg-muted px-3 text-xs font-medium text-muted-foreground">
                  {t('createMatch.fields.currency')}
                </span>
                <input
                  id="edit-match-price"
                  type="number"
                  min={1}
                  step={1}
                  className="h-full w-full bg-transparent px-2.5 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="0"
                  {...register('pricePerPlayer', { valueAsNumber: true })}
                />
                <span className="flex h-full items-center pe-3 text-xs text-muted-foreground">
                  {t('createMatch.fields.perPlayer')}
                </span>
              </div>
              <FieldError
                message={resolveFieldError(t, errors.pricePerPlayer?.message)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─ Section: Demo Match (only when isFake) ───────────────── */}
      {match.isFake && (
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t('editMatch.sections.demo')}
            </p>

            {/* Read-only demo indicator */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                {t('editMatch.demoLabel')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('editMatch.demoHint')}
              </span>
            </div>

            {/* minRealSpots stepper */}
            <div className="flex flex-col gap-1.5">
              <Label>{t('editMatch.fields.minRealSpots')}</Label>
              <Controller
                control={control}
                name="minRealSpots"
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={field.onChange}
                    min={0}
                    max={CAPACITY_MAX}
                    step={1}
                    hasError={!!errors.minRealSpots}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t('editMatch.fields.minRealSpotsHint')}
              </p>
              <FieldError
                message={resolveFieldError(t, errors.minRealSpots?.message)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending} size="lg">
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t('editMatch.submitting')}
            </>
          ) : (
            t('editMatch.submit')
          )}
        </Button>
      </div>
    </form>
  );
}

export function EditMatchPage() {
  const { t } = useTranslation('operator');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: matchRes,
    isLoading,
    isError,
  } = useMatchesControllerGetById(id ?? '', { query: { enabled: !!id } });

  const match = unwrap(matchRes) as MatchDetailWithFake | undefined;

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{t('editMatch.error.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/operator/matches')}>
          {t('editMatch.backMatches')}
        </Button>
      </div>
    );
  }

  if (isError || (!isLoading && !match)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{t('editMatch.error.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/operator/matches')}>
          {t('editMatch.backMatches')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!match) return null;

  const blocked =
    match.status === MatchDetailResponseDtoStatus.cancelled ||
    match.status === MatchDetailResponseDtoStatus.completed;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => navigate(`/operator/matches/${id}`)}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('editMatch.back')}
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {t('editMatch.title')}
        </h1>
      </div>

      {blocked ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {match.status === MatchDetailResponseDtoStatus.cancelled
              ? t('editMatch.blockedCancelled')
              : t('editMatch.blockedCompleted')}
          </CardContent>
        </Card>
      ) : (
        <EditMatchForm match={match} />
      )}
    </div>
  );
}
