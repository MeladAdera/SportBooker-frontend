import { useMemo, useState } from 'react';
import { useDebounce } from '@/shared/hooks';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { AlertCircle, Search, SlidersHorizontal, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { unwrap } from '@/api';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import { useTenantMatchesControllerList } from '@/api/generated/tenant-—-matches/tenant-—-matches';
import { useVenuesControllerList } from '@/api/generated/venues/venues';
import type { OperatorMatchItemDto } from '@/api/generated/models/operatorMatchItemDto';
import { TenantMatchesControllerListStatus } from '@/api/generated/models/tenantMatchesControllerListStatus';
import { TenantMatchesControllerListSportType } from '@/api/generated/models/tenantMatchesControllerListSportType';

// ── Types ────────────────────────────────────────────────────────────────────

type StatusFilter =
  | ''
  | (typeof TenantMatchesControllerListStatus)[keyof typeof TenantMatchesControllerListStatus];

type SportFilter =
  | ''
  | (typeof TenantMatchesControllerListSportType)[keyof typeof TenantMatchesControllerListSportType];

interface Filters {
  status: StatusFilter;
  venueId: string;
  sport: SportFilter;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  status: '',
  venueId: '',
  sport: '',
  dateFrom: '',
  dateTo: '',
  search: '',
};

const PAGE_SIZE = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const STATUS_BADGE: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  upcoming: 'default',
  in_progress: 'secondary',
  completed: 'outline',
  cancelled: 'destructive',
};

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('operator');
  return (
    <Badge variant={STATUS_BADGE[status] ?? 'outline'}>
      {t(`matches.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

// ── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: Filters;
  venues: { id: string; name: string }[];
  onFilterChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

function FilterBar({
  filters,
  venues,
  onFilterChange,
  onClear,
}: FilterBarProps) {
  const { t } = useTranslation('operator');
  const isDirty = Object.values(filters).some((v) => v !== '');

  return (
    <div className="flex flex-col gap-3">
      {/* search row */}
      <div className="relative">
        <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          placeholder={t('matches.filters.search')}
          className="ps-9"
        />
      </div>

      {/* filter row */}
      <div className="flex flex-wrap gap-2">
        {/* Status */}
        <Select
          value={filters.status || undefined}
          onValueChange={(val) =>
            onFilterChange({ status: (val ?? '') as StatusFilter })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('matches.filters.statusAll')} />
          </SelectTrigger>
          <SelectContent>
            {Object.values(TenantMatchesControllerListStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`matches.status.${s}`, { defaultValue: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Venue */}
        <Select
          value={filters.venueId || undefined}
          onValueChange={(val) => onFilterChange({ venueId: val ?? '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('matches.filters.venueAll')} />
          </SelectTrigger>
          <SelectContent>
            {venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sport */}
        <Select
          value={filters.sport || undefined}
          onValueChange={(val) =>
            onFilterChange({ sport: (val ?? '') as SportFilter })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('matches.filters.sportAll')} />
          </SelectTrigger>
          <SelectContent>
            {Object.values(TenantMatchesControllerListSportType).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`matches.sport.${s}`, { defaultValue: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date from */}
        <DatePicker
          value={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
          onChange={(d) =>
            onFilterChange({ dateFrom: d ? d.toISOString().slice(0, 10) : '' })
          }
          placeholder={t('matches.filters.dateFrom')}
          toDate={filters.dateTo ? new Date(filters.dateTo) : undefined}
        />

        {/* Date to */}
        <DatePicker
          value={filters.dateTo ? new Date(filters.dateTo) : undefined}
          onChange={(d) =>
            onFilterChange({ dateTo: d ? d.toISOString().slice(0, 10) : '' })
          }
          placeholder={t('matches.filters.dateTo')}
          fromDate={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
        />

        {/* Clear */}
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1.5"
          >
            <X className="size-3.5" aria-hidden />
            {t('matches.filters.clear')}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Desktop table ─────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<OperatorMatchItemDto>();

interface DesktopTableProps {
  matches: OperatorMatchItemDto[];
  canCancel: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
}

function DesktopTable({
  matches,
  canCancel,
  onView,
  onEdit,
  onCancel,
}: DesktopTableProps) {
  const { t } = useTranslation('operator');

  const columns = useMemo(
    () => [
      colHelper.accessor('scheduledAt', {
        header: t('matches.table.date'),
        cell: (info) => (
          <span className="whitespace-nowrap text-sm">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      colHelper.accessor('venueName', {
        header: t('matches.table.venue'),
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      colHelper.accessor('sportType', {
        header: t('matches.table.sport'),
        cell: (info) => (
          <span className="text-sm capitalize">
            {t(`matches.sport.${info.getValue()}`, {
              defaultValue: info.getValue(),
            })}
          </span>
        ),
      }),
      colHelper.accessor('status', {
        header: t('matches.table.status'),
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      colHelper.accessor('confirmedCount', {
        header: t('matches.table.players'),
        cell: (info) => {
          const m = info.row.original;
          return (
            <span className="text-sm tabular-nums">
              {info.getValue()} / {m.maxCapacity}
              {m.waitlistCount > 0 && (
                <span className="ms-1.5 text-xs text-muted-foreground">
                  (+{m.waitlistCount} wl)
                </span>
              )}
            </span>
          );
        },
      }),
      colHelper.display({
        id: 'actions',
        header: t('matches.table.actions'),
        cell: (info) => {
          const id = info.row.original.id;
          const isCancelled = info.row.original.status === 'cancelled';
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="secondary" onClick={() => onView(id)}>
                {t('matches.actions.view')}
              </Button>
              {!isCancelled && (
                <Button variant="outline" onClick={() => onEdit(id)}>
                  {t('matches.actions.edit')}
                </Button>
              )}
              {canCancel && !isCancelled && (
                <Button variant="destructive" onClick={() => onCancel(id)}>
                  {t('matches.actions.cancel')}
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, canCancel],
  );

  const table = useReactTable({
    data: matches,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-3 text-start text-xs font-medium text-muted-foreground"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="bg-card transition-colors hover:bg-muted/50"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

interface MobileCardProps {
  match: OperatorMatchItemDto;
  canCancel: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
}

function MobileMatchCard({
  match,
  canCancel,
  onView,
  onEdit,
  onCancel,
}: MobileCardProps) {
  const { t } = useTranslation('operator');
  const isCancelled = match.status === 'cancelled';
  const waitlistCount = match.waitlistCount;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">{match.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(match.scheduledAt)}
            </p>
          </div>
          <StatusBadge status={match.status} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t('matches.table.venue')}:{' '}
            <span className="text-foreground">{match.venueName}</span>
          </span>
          <span>
            {t('matches.table.sport')}:{' '}
            <span className="text-foreground capitalize">
              {t(`matches.sport.${match.sportType}`, {
                defaultValue: match.sportType,
              })}
            </span>
          </span>
          <span>
            {t('matches.table.players')}:{' '}
            <span className="text-foreground tabular-nums">
              {match.confirmedCount} / {match.maxCapacity}
              {waitlistCount > 0 && (
                <span className="ms-1 text-muted-foreground">
                  (+{waitlistCount} wl)
                </span>
              )}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onView(match.id)}
          >
            {t('matches.actions.view')}
          </Button>
          {!isCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(match.id)}
            >
              {t('matches.actions.edit')}
            </Button>
          )}
          {canCancel && !isCancelled && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(match.id)}
            >
              {t('matches.actions.cancel')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead className="border-b border-border bg-muted">
          <tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="bg-card">
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex justify-between">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

function Pagination({ page, total, pageSize, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹
      </Button>
      <span className="text-xs text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        ›
      </Button>
    </div>
  );
}

// ── MatchListPage ─────────────────────────────────────────────────────────────

export function MatchListPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const normalized = normalizeRole(role);
  const canCancel =
    normalized === 'super_admin' || normalized === 'tenant_admin';

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(filters.search, 400);

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.venueId ? { venueId: filters.venueId } : {}),
      ...(filters.sport ? { sportType: filters.sport } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [filters, page, debouncedSearch],
  );

  const { data, isLoading, isError } =
    useTenantMatchesControllerList(queryParams);
  const { data: venuesData } = useVenuesControllerList({ limit: 50 });

  const paginated = unwrap(data);
  const matches: OperatorMatchItemDto[] = paginated?.items ?? [];
  const total: number = paginated?.total ?? 0;

  const venues = useMemo(() => {
    const v = unwrap(venuesData);
    return v?.items ?? [];
  }, [venuesData]);

  function handleFilterChange(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function handleView(id: string) {
    navigate(`/operator/matches/${id}`);
  }

  function handleEdit(id: string) {
    navigate(`/operator/matches/${id}/edit`);
  }

  function handleCancel(id: string) {
    navigate(`/operator/matches/${id}/cancel`);
  }

  const actionProps = {
    canCancel,
    onView: handleView,
    onEdit: handleEdit,
    onCancel: handleCancel,
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">
          {t('matches.title')}
        </h1>
        <Button size="sm" onClick={() => navigate('/operator/matches/new')}>
          {t('matches.actions.create', { defaultValue: 'New Match' })}
        </Button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <SlidersHorizontal
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          {t('matches.filters.status', { defaultValue: 'Filters' })}
        </div>
        <FilterBar
          filters={filters}
          venues={venues}
          onFilterChange={handleFilterChange}
          onClear={handleClear}
        />
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {t('matches.error')}
        </div>
      )}

      {/* ── Desktop table ─────────────────────────────────────────── */}
      <div className="hidden md:block">
        {isLoading ? (
          <TableSkeleton />
        ) : matches.length === 0 && !isError ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('matches.empty')}
          </p>
        ) : (
          <DesktopTable matches={matches} {...actionProps} />
        )}
      </div>

      {/* ── Mobile cards ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <CardsSkeleton />
        ) : matches.length === 0 && !isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('matches.empty')}
          </p>
        ) : (
          matches.map((m) => (
            <MobileMatchCard key={m.id} match={m} {...actionProps} />
          ))
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      )}
    </div>
  );
}
