import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bike, Dumbbell, Search, Shield, Swords, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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

const SPORT_ICONS: Record<SportType, React.ElementType> = {
  football: Shield,
  padel: Swords,
  cricket: Bike,
  generic: Dumbbell,
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
  const Icon = SPORT_ICONS[match.sportType] ?? Dumbbell;
  const formattedDate = formatScheduledAt(match.scheduledAt);
  const bookedSpots = match.maxCapacity - match.spotsRemaining;
  const waitlistCount = match.waitlistCount;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/matches/${match.id}`)}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground">
              {match.title}
            </p>
          </div>
          <Badge
            variant={STATUS_VARIANT[match.status] ?? 'outline'}
            className="shrink-0"
          >
            {t(`discover.status.${match.status}`, {
              defaultValue: match.status,
            })}
          </Badge>
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
    <div className="animate-pulse rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted" />
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
  dayOfWeek?: DayOfWeek;
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
 * Seven pill buttons (Sun–Sat) + sort select + availability toggle on one row.
 * Day filtering is client-side; sort is also applied client-side.
 */
function DayChips({
  value,
  onChange,
  sortBy,
  onSortChange,
}: {
  value?: DayOfWeek;
  onChange: (day: DayOfWeek | undefined) => void;
  sortBy?: SortOption;
  onSortChange: (sort: SortOption | undefined) => void;
}) {
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const active = value === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(active ? undefined : day)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-transparent text-foreground hover:bg-muted',
              )}
            >
              {DAY_LABELS[day]}
            </button>
          );
        })}
      </div>

      <Select
        value={sortBy ?? ''}
        onValueChange={(v) => onSortChange((v as SortOption) || undefined)}
      >
        <SelectTrigger size="sm" className="min-w-[130px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="date-asc">Date ↑</SelectItem>
          <SelectItem value="date-desc">Date ↓</SelectItem>
          <SelectItem value="price-asc">Price ↑</SelectItem>
          <SelectItem value="price-desc">Price ↓</SelectItem>
          <SelectItem value="spots-desc">Spots: most first</SelectItem>
          <SelectItem value="spots-asc">Spots: fewest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterBar({ filters, onChange, onClear }: FilterBarProps) {
  const { t } = useTranslation('player');
  const { data: venuesData, isLoading: isVenuesLoading } =
    useVenuesControllerList({ limit: 100 });
  if (isVenuesLoading) return <div>Loading...</div>;

  const venues = unwrap(venuesData)?.items ?? [];

  const hasActiveFilters =
    !!filters.sportType ||
    !!filters.venueId ||
    !!filters.date ||
    !!filters.available ||
    !!filters.sortBy ||
    filters.dayOfWeek !== undefined;

  const selectClass =
    'h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

  return (
    <div className="flex flex-col gap-3">
      <DayChips
        value={filters.dayOfWeek}
        onChange={(day) => onChange({ dayOfWeek: day, page: 1 })}
        sortBy={filters.sortBy}
        onSortChange={(sort) => onChange({ sortBy: sort, page: 1 })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={filters.sportType ?? ''}
          onChange={(e) =>
            onChange({
              sportType: (e.target.value as SportType) || undefined,
              page: 1,
            })
          }
          aria-label={t('discover.filters.sport')}
        >
          <option value="">{t('discover.filters.allSports')}</option>
          {SPORT_TYPES.map((s) => (
            <option key={s} value={s}>
              {t(`discover.sports.${s}`)}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.venueId ?? ''}
          onChange={(e) =>
            onChange({ venueId: e.target.value || undefined, page: 1 })
          }
          aria-label={t('discover.filters.venue')}
        >
          <option value="">{t('discover.filters.allVenues')}</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

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

        <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={!!filters.available}
            onChange={(e) =>
              onChange({ available: e.target.checked || undefined, page: 1 })
            }
          />
          {t('discover.filters.availableOnly')}
        </label>

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

export function DiscoverPage() {
  const { i18n } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const phrases =
    TYPEWRITER_PHRASES[i18n.language] ?? TYPEWRITER_PHRASES['en']!;
  const typedTitle = useTypewriter(phrases);

  const { page, limit, dayOfWeek, sortBy, ...queryParams } = filters;
  const { data, isLoading, isError } = useMatchesControllerList({
    ...queryParams,
    page,
    limit,
  });
  const matchesData = unwrap(data);
  const allMatches = matchesData?.items ?? [];

  const filtered =
    dayOfWeek !== undefined
      ? allMatches.filter((m) => new Date(m.scheduledAt).getDay() === dayOfWeek)
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

  const handleFilterChange = useCallback((next: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const handleClear = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-xl font-semibold text-foreground">
        {typedTitle}
        <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" />
      </h1>

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
