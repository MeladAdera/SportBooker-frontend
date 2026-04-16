import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMatchesControllerList } from '@/api/generated/matches/matches';
import { useVenuesControllerList } from '@/api/generated/venues/venues';
import type { MatchBrowseItemDto } from '@/api/generated/models/matchBrowseItemDto';
import type { MatchesControllerListParams } from '@/api/generated/models/matchesControllerListParams';
import { MatchesControllerListSportType } from '@/api/generated/models/matchesControllerListSportType';
import { unwrap } from '@/api';
import { ALL_SPORTS_ICON, getSportIcon } from '@/lib/sportIcons';

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

type SportType =
  (typeof MatchesControllerListSportType)[keyof typeof MatchesControllerListSportType];

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

type SortOption =
  | 'date-asc'
  | 'date-desc'
  | 'price-asc'
  | 'price-desc'
  | 'spots-asc'
  | 'spots-desc';

const TYPEWRITER_PHRASES: Record<string, readonly string[]> = {
  en: [
    'Discover Matches...',
    'Choose Your Day...',
    'Find Your Game...',
    'Book Your Spot..',
    'Play Today..',
  ],
  ar: [
    'ابحث عن مباراتك الان...',
    'اختر اليوم المناسب لك...',
    'ابحث عن لعبتك المفضلة ...',
    'احجز مقعدك الان...',
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatScheduledAt(isoString: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  upcoming: 'default',
  open: 'default',
  full: 'secondary',
  cancelled: 'destructive',
  completed: 'outline',
  in_progress: 'secondary',
};

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: MatchBrowseItemDto }) {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const sportIcon = getSportIcon(match.sportType);
  const formattedDate = formatScheduledAt(match.scheduledAt);
  const bookedSpots = match.maxCapacity - match.spotsRemaining;
  const waitlistCount = match.waitlistCount;

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      onClick={() => navigate(`/matches/${match.id}`)}
    >
      {/* Venue image banner */}
      <div className="relative h-36 w-full bg-muted">
        {match.venuePictureUrl ? (
          <img
            src={match.venuePictureUrl}
            alt={match.venueName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {createElement(sportIcon, {
              className: 'size-10 text-muted-foreground/40',
              'aria-hidden': true,
            })}
          </div>
        )}
        <Badge
          variant={STATUS_VARIANT[match.status] ?? 'outline'}
          className="absolute right-2 top-2 shrink-0"
        >
          {t(`discover.status.${match.status}`, {
            defaultValue: match.status,
          })}
        </Badge>
      </div>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {createElement(sportIcon, {
              className: 'size-4',
              'aria-hidden': true,
            })}
          </span>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground">
            {match.title}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">{match.venueName}</p>
        <p className="text-xs font-medium text-foreground">{formattedDate}</p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {t('discover.card.pricePerPlayer', {
            price: match.pricePerPlayer,
          })}
        </span>

        <span
          className={cn(
            'text-xs tabular-nums',
            match.spotsRemaining === 0
              ? 'text-destructive'
              : match.spotsRemaining <= 2
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground',
          )}
        >
          {match.spotsRemaining === 0 && waitlistCount > 0
            ? t('discover.card.fullWithWaitlist', { count: waitlistCount })
            : t('discover.card.spotsRemaining', {
                booked: bookedSpots,
                total: match.maxCapacity,
              })}
        </span>
      </CardFooter>
    </Card>
  );
}

function MatchCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {/* image banner placeholder */}
      <div className="h-36 w-full bg-muted" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-36 rounded bg-muted" />
      </div>
      <div className="flex items-center justify-between border-t bg-muted/50 px-4 py-3">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const SPORT_TYPES = Object.values(MatchesControllerListSportType);

type FilterState = MatchesControllerListParams & {
  page: number;
  /** When set and non-empty, only matches on these weekdays (0=Sun … 6=Sat). */
  dayOfWeek?: DayOfWeek[];
  sortBy?: SortOption;
};

type FilterBarProps = {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
};

/**
 * Cycles through `phrases` with a typewriter effect — types each phrase
 * character by character, pauses, then deletes before moving to the next.
 *
 * @param phrases - List of strings to cycle through (loops indefinitely).
 * @param typeSpeed  - ms per character when typing (default 80).
 * @param deleteSpeed - ms per character when deleting (default 40).
 * @param pauseMs   - ms to pause at the end of a fully typed phrase (default 1800).
 * @returns The currently visible substring to render.
 */
function useTypewriter(
  phrases: readonly string[],
  { typeSpeed = 80, deleteSpeed = 40, pauseMs = 1800 } = {},
) {
  const [displayed, setDisplayed] = useState('');
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    function tick() {
      const phrase = phrases[phraseIdx.current];
      if (!deleting.current) {
        charIdx.current += 1;
        setDisplayed(phrase.slice(0, charIdx.current));
        if (charIdx.current === phrase.length) {
          deleting.current = true;
          return pauseMs;
        }
        return typeSpeed;
      } else {
        charIdx.current -= 1;
        setDisplayed(phrase.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % phrases.length;
          return typeSpeed;
        }
        return deleteSpeed;
      }
    }

    let timeout: ReturnType<typeof setTimeout>;
    function schedule() {
      const delay = tick();
      timeout = setTimeout(schedule, delay);
    }
    timeout = setTimeout(schedule, typeSpeed);
    return () => clearTimeout(timeout);
  }, [phrases, typeSpeed, deleteSpeed, pauseMs]);

  return displayed;
}

/**
 * Seven pill buttons (Sun–Sat), multi-select, plus sort on the same row.
 * Day filtering is client-side; sort is also applied client-side.
 */
function DayChips({
  value,
  onChange,
  sortBy,
  onSortChange,
}: {
  value?: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  sortBy?: SortOption;
  onSortChange: (sort: SortOption | undefined) => void;
}) {
  const { t } = useTranslation('player');

  const SORT_OPTIONS: {
    value: SortOption;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      value: 'date-asc',
      label: t('discover.filters.sort.dateAsc'),
      icon: ArrowUp,
    },
    {
      value: 'date-desc',
      label: t('discover.filters.sort.dateDesc'),
      icon: ArrowDown,
    },
    {
      value: 'price-asc',
      label: t('discover.filters.sort.priceAsc'),
      icon: ArrowUp,
    },
    {
      value: 'price-desc',
      label: t('discover.filters.sort.priceDesc'),
      icon: ArrowDown,
    },
    {
      value: 'spots-desc',
      label: t('discover.filters.sort.spotsDesc'),
      icon: ArrowDown,
    },
    {
      value: 'spots-asc',
      label: t('discover.filters.sort.spotsAsc'),
      icon: ArrowUp,
    },
  ];

  const activeSortOption = SORT_OPTIONS.find((o) => o.value === sortBy);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const selected = value ?? [];
          const active = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                const next = active
                  ? selected.filter((d) => d !== day)
                  : [...selected, day].sort((a, b) => a - b);
                onChange(next);
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-transparent text-foreground hover:bg-muted',
              )}
            >
              {t(`discover.filters.days.${day}`)}
            </button>
          );
        })}
      </div>

      <Select
        value={sortBy ?? ''}
        onValueChange={(v) => onSortChange((v as SortOption) || undefined)}
      >
        <SelectTrigger size="sm" className="min-w-[130px]">
          <span className="flex items-center gap-1.5 text-sm">
            {activeSortOption ? (
              <>
                <activeSortOption.icon className="size-3.5 shrink-0" />
                {activeSortOption.label}
              </>
            ) : (
              t('discover.filters.sortBy')
            )}
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                {label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Venue combobox ────────────────────────────────────────────────────────────

type VenueOption = { id: string; name: string };

function VenueCombobox({
  venues,
  value,
  onChange,
}: {
  venues: VenueOption[];
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  const { t } = useTranslation('player');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? venues.filter((v) => v.name.toLowerCase().includes(q)) : venues;
  }, [venues, search]);

  const selectedName = venues.find((v) => v.id === value)?.name;

  function select(id: string | undefined) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setTimeout(() => inputRef.current?.focus(), 0);
        else setSearch('');
      }}
    >
      <PopoverTrigger
        className={cn(
          'flex h-8 min-w-[140px] items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selectedName ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="truncate">
          {selectedName ?? t('discover.filters.allVenues')}
        </span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('discover.filters.searchVenue')}
              className="h-7 pl-7 text-sm"
            />
          </div>
        </div>

        <div className="max-h-52 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => select(undefined)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
              !value && 'font-medium text-foreground',
            )}
          >
            <Check
              className={cn('size-3.5 shrink-0', value ? 'invisible' : '')}
            />
            {t('discover.filters.allVenues')}
          </button>

          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t('discover.filters.noVenueFound')}
            </p>
          ) : (
            filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => select(v.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                  value === v.id && 'font-medium text-foreground',
                )}
              >
                <Check
                  className={cn(
                    'size-3.5 shrink-0',
                    value === v.id ? '' : 'invisible',
                  )}
                />
                {v.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterBar({ filters, onChange, onClear }: FilterBarProps) {
  const { t } = useTranslation('player');
  const { data: venuesData, isLoading: isVenuesLoading } =
    useVenuesControllerList({ limit: 100 });
  if (isVenuesLoading) return <div>Loading...</div>;

  const venues = unwrap(venuesData)?.items ?? [];
  const sportTriggerIcon = filters.sportType
    ? getSportIcon(filters.sportType)
    : ALL_SPORTS_ICON;

  const hasActiveFilters =
    !!filters.sportType ||
    !!filters.venueId ||
    !!filters.date ||
    !!filters.available ||
    !!filters.sortBy ||
    (filters.dayOfWeek?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <DayChips
        value={filters.dayOfWeek}
        onChange={(days) =>
          onChange({ dayOfWeek: days.length > 0 ? days : undefined, page: 1 })
        }
        sortBy={filters.sortBy}
        onSortChange={(sort) => onChange({ sortBy: sort, page: 1 })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.sportType ?? ''}
          onValueChange={(v) =>
            onChange({ sportType: (v as SportType) || undefined, page: 1 })
          }
        >
          <SelectTrigger size="sm" className="min-w-[120px]">
            {createElement(sportTriggerIcon, {
              className: 'size-3.5 shrink-0 text-muted-foreground',
              'aria-hidden': true,
            })}
            <SelectValue placeholder={t('discover.filters.allSports')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <span className="flex items-center gap-1.5">
                {createElement(ALL_SPORTS_ICON, {
                  className: 'size-3.5 shrink-0 text-muted-foreground',
                })}
                {t('discover.filters.allSports')}
              </span>
            </SelectItem>
            {SPORT_TYPES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-1.5">
                  {createElement(getSportIcon(s), {
                    className: 'size-3.5 shrink-0 text-muted-foreground',
                  })}
                  {t(`discover.sports.${s}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <VenueCombobox
          venues={venues}
          value={filters.venueId}
          onChange={(id) => onChange({ venueId: id, page: 1 })}
        />

        <DatePicker
          value={filters.date ? new Date(filters.date) : undefined}
          onChange={(d) =>
            onChange({
              date: d ? d.toISOString().slice(0, 10) : undefined,
              page: 1,
            })
          }
          placeholder={t('discover.filters.date')}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="available-filter"
            checked={!!filters.available}
            onCheckedChange={(checked) =>
              onChange({ available: checked || undefined, page: 1 })
            }
          />
          <label
            htmlFor="available-filter"
            className="cursor-pointer select-none text-sm text-foreground"
          >
            {t('discover.filters.availableOnly')}
          </label>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <X className="size-3.5" aria-hidden />
            {t('discover.filters.clearFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation('player');
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t('discover.pagination.previous')}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t('discover.pagination.page', { current: page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t('discover.pagination.next')}
      </Button>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation('player');
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
      <Search className="size-10 opacity-40" aria-hidden />
      <p className="text-base font-medium">{t('discover.empty.title')}</p>
      <p className="text-sm">{t('discover.empty.description')}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  page: 1,
  limit: PAGE_SIZE,
};

// ── URL ↔ FilterState serialisation ──────────────────────────────────────────

function filtersToParams(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.page && filters.page !== 1) p.set('page', String(filters.page));
  if (filters.sportType) p.set('sportType', filters.sportType);
  if (filters.venueId) p.set('venueId', filters.venueId);
  if (filters.date) p.set('date', filters.date);
  if (filters.available) p.set('available', 'true');
  if (filters.sortBy) p.set('sortBy', filters.sortBy);
  if (filters.dayOfWeek && filters.dayOfWeek.length > 0)
    p.set('dayOfWeek', filters.dayOfWeek.join(','));
  return p;
}

function paramsToFilters(p: URLSearchParams): FilterState {
  const page = parseInt(p.get('page') ?? '1', 10);
  const sportType = p.get('sportType') as SportType | null;
  const venueId = p.get('venueId') ?? undefined;
  const date = p.get('date') ?? undefined;
  const available = p.get('available') === 'true' ? true : undefined;
  const sortBy = (p.get('sortBy') as SortOption | null) ?? undefined;
  const dayParam = p.get('dayOfWeek');
  const dayOfWeek = dayParam
    ? (dayParam
        .split(',')
        .map(Number)
        .filter((n) => n >= 0 && n <= 6) as DayOfWeek[])
    : undefined;

  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: PAGE_SIZE,
    ...(sportType ? { sportType } : {}),
    ...(venueId ? { venueId } : {}),
    ...(date ? { date } : {}),
    ...(available ? { available } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(dayOfWeek && dayOfWeek.length > 0 ? { dayOfWeek } : {}),
  };
}

export function DiscoverPage() {
  const { i18n, t } = useTranslation('player');
  const [searchParams, setSearchParams] = useSearchParams();
  const [spinning, setSpinning] = useState(false);

  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);
  const phrases =
    TYPEWRITER_PHRASES[i18n.language] ?? TYPEWRITER_PHRASES['en']!;
  const typedTitle = useTypewriter(phrases);

  const { page, limit, dayOfWeek, sortBy, ...queryParams } = filters;
  const { data, isLoading, isError, refetch, isFetching } =
    useMatchesControllerList({
      ...queryParams,
      page,
      limit,
    });
  const matchesData = unwrap(data);
  const allMatches = matchesData?.items ?? [];

  const filtered =
    dayOfWeek && dayOfWeek.length > 0
      ? allMatches.filter((m) =>
          dayOfWeek.includes(new Date(m.scheduledAt).getDay() as DayOfWeek),
        )
      : allMatches;

  const matches = sortBy
    ? [...filtered].sort((a, b) => {
        if (sortBy === 'date-asc')
          return (
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime()
          );
        if (sortBy === 'date-desc')
          return (
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime()
          );
        if (sortBy === 'price-asc') return a.pricePerPlayer - b.pricePerPlayer;
        if (sortBy === 'price-desc') return b.pricePerPlayer - a.pricePerPlayer;
        if (sortBy === 'spots-desc') return b.spotsRemaining - a.spotsRemaining;
        if (sortBy === 'spots-asc') return a.spotsRemaining - b.spotsRemaining;
        return 0;
      })
    : filtered;
  const total = matchesData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterChange = useCallback(
    (next: Partial<FilterState>) => {
      setSearchParams(filtersToParams({ ...filters, ...next }), {
        replace: true,
      });
    },
    [filters, setSearchParams],
  );

  const handleClear = useCallback(() => {
    setSearchParams(filtersToParams(DEFAULT_FILTERS), { replace: true });
  }, [setSearchParams]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">
          {typedTitle}
          <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" />
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setSpinning(true);
            void refetch();
          }}
          disabled={isFetching}
          aria-label={t('discover.refreshAria')}
          title={t('discover.refresh')}
        >
          <RefreshCw
            className={cn('size-4', spinning && 'animate-spin')}
            onAnimationIteration={() => {
              if (!isFetching) setSpinning(false);
            }}
            aria-hidden
          />
        </Button>
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClear}
      />

      {isError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Failed to load matches. Please try again.
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) => handleFilterChange({ page: p })}
        />
      )}
    </div>
  );
}
