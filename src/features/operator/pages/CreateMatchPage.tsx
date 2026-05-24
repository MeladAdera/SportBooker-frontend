import { createElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

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
import { useMatchesControllerCreate } from '@/api/generated/matches/matches';
import { useVenuesControllerList } from '@/api/generated/venues/venues';
import { CreateMatchDtoSportType } from '@/api/generated/models/createMatchDtoSportType';
import { ApiError, unwrap } from '@/api';
import { ALL_SPORTS_ICON, getSportIcon } from '@/lib/sportIcons';
import { toZonedISO } from '@/lib/format';
import { useTenantTimezone } from '@/shared/hooks';

// ── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;
const CAPACITY_MIN = 2;
const CAPACITY_MAX = 100;

// ── Schema ────────────────────────────────────────────────────────────────────

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const createMatchSchema = z
  .object({
    title: z.string().min(3, 'validation.titleMin'),
    sportType: z.enum(
      Object.values(CreateMatchDtoSportType) as [string, ...string[]],
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
      .min(CAPACITY_MIN, 'validation.capacityMin')
      .max(CAPACITY_MAX, 'validation.capacityMax'),
    pricePerPlayer: z
      .number({ error: 'validation.priceMin' })
      .min(0, 'validation.priceMin')
      .refine((v) => Number.isInteger(v), 'validation.priceInteger'),
    isFake: z.boolean().default(false),
    minRealSpots: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (!data.isFake && data.minRealSpots > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['minRealSpots'],
        message: 'validation.minRealSpotsOnReal',
      });
    }
    if (data.minRealSpots > data.maxCapacity) {
      ctx.addIssue({
        code: 'custom',
        path: ['minRealSpots'],
        message: 'validation.minRealSpotsExceedsCapacity',
      });
    }
  });

type FormValues = z.output<typeof createMatchSchema>;

// ── Stepper ───────────────────────────────────────────────────────────────────

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

// ── FieldError ────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveError(
  t: (key: string, opts?: Record<string, unknown>) => string,
  message?: string,
) {
  if (!message) return undefined;
  return t(`createMatch.${message}`, { defaultValue: message });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CreateMatchPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const tenantTz = useTenantTimezone();

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
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createMatchSchema) as any,
    defaultValues: {
      durationMins: 60,
      maxCapacity: 10,
      pricePerPlayer: 0,
      isFake: false,
      minRealSpots: 0,
    },
  });

  const isFakeValue = watch('isFake');

  const mutation = useMatchesControllerCreate({
    mutation: {
      onSuccess: () => {
        toast.success(t('createMatch.success'));
        navigate('/operator/matches');
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.statusCode === 403) {
            toast.error(t('createMatch.error.forbidden'));
          } else if (err.statusCode === 409) {
            toast.error(t('createMatch.error.overlap'));
          } else {
            toast.error(t('createMatch.error.generic'));
          }
        } else {
          toast.error(t('createMatch.error.generic'));
        }
      },
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({
      data: {
        title: values.title,
        sportType: values.sportType as CreateMatchDtoSportType,
        venueId: values.venueId,
        scheduledAt: toZonedISO(
          values.scheduledDate,
          values.scheduledTime,
          tenantTz,
        ),
        durationMins: values.durationMins,
        maxCapacity: values.maxCapacity,
        pricePerPlayer: values.pricePerPlayer,
        ...(values.isFake
          ? { isFake: true, minRealSpots: values.minRealSpots }
          : {}),
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => navigate('/operator/matches')}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('createMatch.back')}
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {t('createMatch.title')}
        </h1>
      </div>

      {/* ── Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        {/* ─ Section: Match Details ─────────────────────────────── */}
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t('createMatch.sections.details')}
            </p>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-title">
                {t('createMatch.fields.title')}
              </Label>
              <Input
                id="match-title"
                placeholder={t('createMatch.fields.titlePlaceholder')}
                {...register('title')}
              />
              <FieldError message={resolveError(t, errors.title?.message)} />
            </div>

            {/* Sport (icons) + venue — side by side on desktop */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-sport">
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="match-sport"
                          size="default"
                          className="h-9 w-full gap-2"
                          aria-invalid={!!errors.sportType}
                        >
                          {createElement(sportTriggerIcon, {
                            className:
                              'size-3.5 shrink-0 text-muted-foreground',
                            'aria-hidden': true,
                          })}
                          <SelectValue
                            placeholder={t(
                              'createMatch.fields.sportPlaceholder',
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CreateMatchDtoSportType).map((s) => (
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
                  message={resolveError(t, errors.sportType?.message)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-venue">
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
                  message={resolveError(t, errors.venueId?.message)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─ Section: Schedule ──────────────────────────────────── */}
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t('createMatch.sections.schedule')}
            </p>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-date">
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
                  message={resolveError(t, errors.scheduledDate?.message)}
                />
              </div>

              {/* Kick-off time (hour + minute selects) */}
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
                  message={resolveError(t, errors.scheduledTime?.message)}
                />
              </div>
            </div>

            {/* Duration */}
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
                          {t('createMatch.fields.durationOption', {
                            mins,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                message={resolveError(t, errors.durationMins?.message)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─ Section: Capacity & Pricing ────────────────────────── */}
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
                      min={CAPACITY_MIN}
                      max={CAPACITY_MAX}
                      step={1}
                      hasError={!!errors.maxCapacity}
                    />
                  )}
                />
                <FieldError
                  message={resolveError(t, errors.maxCapacity?.message)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-price">
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
                    id="match-price"
                    type="number"
                    min={0}
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
                  message={resolveError(t, errors.pricePerPlayer?.message)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─ Section: Demo Match ────────────────────────────────── */}
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t('createMatch.sections.demo')}
            </p>

            {/* isFake toggle */}
            <Controller
              control={control}
              name="isFake"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    onClick={() => field.onChange(!field.value)}
                    className={cn(
                      'relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      field.value ? 'bg-primary' : 'bg-input',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                        field.value ? 'translate-x-4' : 'translate-x-0',
                      )}
                    />
                  </button>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-none">
                      {t('createMatch.fields.isFake')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('createMatch.fields.isFakeHint')}
                    </span>
                  </span>
                </label>
              )}
            />

            {/* minRealSpots — only when isFake is on */}
            {isFakeValue && (
              <div className="flex flex-col gap-1.5">
                <Label>{t('createMatch.fields.minRealSpots')}</Label>
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
                  {t('createMatch.fields.minRealSpotsHint')}
                </p>
                <FieldError
                  message={resolveError(t, errors.minRealSpots?.message)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─ Submit ─────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} size="lg">
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                {t('createMatch.submitting')}
              </>
            ) : (
              t('createMatch.submit')
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
