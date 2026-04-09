import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bike, Dumbbell, Search, Shield, Swords, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMatchesControllerList } from '@/api/generated/matches/matches';
import { useVenuesControllerList } from '@/api/generated/venues/venues';
import type { MatchBrowseItemDto } from '@/api/generated/models/matchBrowseItemDto';
import type { MatchesControllerListParams } from '@/api/generated/models/matchesControllerListParams';
import { MatchesControllerListSportType } from '@/api/generated/models/matchesControllerListSportType';

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

type SportType =
  (typeof MatchesControllerListSportType)[keyof typeof MatchesControllerListSportType];

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
  const Icon = SPORT_ICONS[match.sportType] ?? Dumbbell;
  const formattedDate = formatScheduledAt(match.scheduledAt);
  const bookedSpots = match.maxCapacity - match.spotsRemaining;

  return (
    <Card className="transition-shadow hover:shadow-md">
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
          {t('discover.card.spotsRemaining', {
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

type FilterState = MatchesControllerListParams & { page: number };

type FilterBarProps = {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
};

function FilterBar({ filters, onChange, onClear }: FilterBarProps) {
  const { t } = useTranslation('player');
  const { data: venuesData, isLoading: isVenuesLoading } =
    useVenuesControllerList({ limit: 100 });
  if (isVenuesLoading) return <div>Loading...</div>;

  const venues = venuesData?.status === 200 ? venuesData.data.data.items : [];
  console.log(venuesData);

  const hasActiveFilters =
    !!filters.sportType ||
    !!filters.venueId ||
    !!filters.date ||
    !!filters.available;

  const selectClass =
    'h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

  return (
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

      <input
        type="date"
        className={cn(selectClass, 'w-36')}
        value={filters.date ?? ''}
        onChange={(e) =>
          onChange({ date: e.target.value || undefined, page: 1 })
        }
        aria-label={t('discover.filters.date')}
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
  const { t } = useTranslation('player');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { page, limit, ...queryParams } = filters;
  const { data, isLoading, isError } = useMatchesControllerList({
    ...queryParams,
    page,
    limit,
  });
  const matches = data?.status === 200 ? data.data.data.items : [];
  const total = data?.status === 200 ? data.data.data.total : 0;
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
        {t('discover.pageTitle')}
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
