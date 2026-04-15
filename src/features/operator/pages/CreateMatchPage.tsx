import { createElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useMatchesControllerCreate } from '@/api/generated/matches/matches';
import { useVenuesControllerList } from '@/api/generated/venues/venues';
import type { VenueBrowseItemDto } from '@/api/generated/models/venueBrowseItemDto';
import { CreateMatchDtoSportType } from '@/api/generated/models/createMatchDtoSportType';
import { ApiError, unwrap } from '@/api';
import { ALL_SPORTS_ICON, getSportIcon } from '@/lib/sportIcons';

// ── Schema ────────────────────────────────────────────────────────────────────

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const createMatchSchema = z.object({
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
    .min(2, 'validation.capacityMin')
    .max(100, 'validation.capacityMax'),
  pricePerPlayer: z
    .number({ error: 'validation.priceMin' })
    .min(1, 'validation.priceMin')
    .refine((v) => Number.isInteger(v), 'validation.priceInteger'),
});

type FormValues = z.infer<typeof createMatchSchema>;

// ── VenueCombobox ─────────────────────────────────────────────────────────────

interface VenueComboboxProps {
  venues: VenueBrowseItemDto[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  isLoading: boolean;
  hasError: boolean;
}

function VenueCombobox({
  venues,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  isLoading,
  hasError,
}: VenueComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      venues.filter((v) => v.name.toLowerCase().includes(search.toLowerCase())),
    [venues, search],
  );

  const selectedName = venues.find((v) => v.id === value)?.name;

  if (isLoading) return <Skeleton className="h-9 w-full rounded-lg" />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive ring-3 ring-destructive/20',
          !selectedName && 'text-muted-foreground',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedName ?? placeholder}</span>
        <ChevronsUpDown
          className="ml-2 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        sideOffset={4}
      >
        {/* Search input inside dropdown */}
        <div className="border-b border-border p-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>

        <ul role="listbox" className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              No venues found.
            </li>
          ) : (
            filtered.map((v) => (
              <li
                key={v.id}
                role="option"
                aria-selected={v.id === value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  v.id === value && 'bg-accent text-accent-foreground',
                )}
                onClick={() => {
                  onChange(v.id);
                  setSearch('');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    v.id === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {v.name}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// ── FieldError ────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CreateMatchPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();

  const { data: venuesData, isLoading: venuesLoading } =
    useVenuesControllerList({ limit: 100 });
  const venues = useMemo(() => unwrap(venuesData)?.items ?? [], [venuesData]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      durationMins: 60,
      maxCapacity: 10,
      pricePerPlayer: 1,
    },
  });

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
    const [hours, minutes] = values.scheduledTime.split(':').map(Number);
    const scheduledAt = new Date(values.scheduledDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    mutation.mutate({
      data: {
        title: values.title,
        sportType: values.sportType as CreateMatchDtoSportType,
        venueId: values.venueId,
        scheduledAt: scheduledAt.toISOString(),
        durationMins: values.durationMins,
        maxCapacity: values.maxCapacity,
        pricePerPlayer: values.pricePerPlayer,
      },
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => navigate('/operator/matches')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('createMatch.back')}
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {t('createMatch.title')}
        </h1>
      </div>

      {/* ── Form card ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
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
              <FieldError
                message={
                  errors.title?.message
                    ? t(`createMatch.${errors.title.message}`, {
                        defaultValue: errors.title.message,
                      })
                    : undefined
                }
              />
            </div>

            {/* Sport */}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="match-sport"
                        size="default"
                        className="h-9 w-full"
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
                message={
                  errors.sportType?.message
                    ? t(`createMatch.${errors.sportType.message}`, {
                        defaultValue: errors.sportType.message,
                      })
                    : undefined
                }
              />
            </div>

            {/* Venue — searchable combobox */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-venue">
                {t('createMatch.fields.venue')}
              </Label>
              <Controller
                control={control}
                name="venueId"
                render={({ field }) => (
                  <VenueCombobox
                    venues={venues}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('createMatch.fields.venuePlaceholder')}
                    searchPlaceholder={t('createMatch.fields.venueSearch')}
                    isLoading={venuesLoading}
                    hasError={!!errors.venueId}
                  />
                )}
              />
              <FieldError
                message={
                  errors.venueId?.message
                    ? t(`createMatch.${errors.venueId.message}`, {
                        defaultValue: errors.venueId.message,
                      })
                    : undefined
                }
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  message={
                    errors.scheduledDate?.message
                      ? t(`createMatch.${errors.scheduledDate.message}`, {
                          defaultValue: errors.scheduledDate.message,
                        })
                      : undefined
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-time">
                  {t('createMatch.fields.time')}
                </Label>
                <Input
                  id="match-time"
                  type="time"
                  className="h-9"
                  {...register('scheduledTime')}
                />
                <FieldError
                  message={
                    errors.scheduledTime?.message
                      ? t(`createMatch.${errors.scheduledTime.message}`, {
                          defaultValue: errors.scheduledTime.message,
                        })
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Duration + Capacity */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-duration">
                  {t('createMatch.fields.duration')}
                </Label>
                <Input
                  id="match-duration"
                  type="number"
                  min={10}
                  max={240}
                  step={5}
                  {...register('durationMins', { valueAsNumber: true })}
                />
                <FieldError
                  message={
                    errors.durationMins?.message
                      ? t(`createMatch.${errors.durationMins.message}`, {
                          defaultValue: errors.durationMins.message,
                        })
                      : undefined
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="match-capacity">
                  {t('createMatch.fields.maxCapacity')}
                </Label>
                <Input
                  id="match-capacity"
                  type="number"
                  min={2}
                  max={100}
                  {...register('maxCapacity', { valueAsNumber: true })}
                />
                <FieldError
                  message={
                    errors.maxCapacity?.message
                      ? t(`createMatch.${errors.maxCapacity.message}`, {
                          defaultValue: errors.maxCapacity.message,
                        })
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-price">
                {t('createMatch.fields.price')}
              </Label>
              <Input
                id="match-price"
                type="number"
                min={1}
                step={1}
                {...register('pricePerPlayer', { valueAsNumber: true })}
              />
              <FieldError
                message={
                  errors.pricePerPlayer?.message
                    ? t(`createMatch.${errors.pricePerPlayer.message}`, {
                        defaultValue: errors.pricePerPlayer.message,
                      })
                    : undefined
                }
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={mutation.isPending}>
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
        </CardContent>
      </Card>
    </div>
  );
}
