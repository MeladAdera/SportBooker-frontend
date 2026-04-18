import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { AlertCircle, RefreshCw, Search, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/shared/hooks';
import { useUsersControllerListTenantUsers } from '@/api/generated/users/users';
import { UsersControllerListTenantUsersRole } from '@/api/generated/models/usersControllerListTenantUsersRole';
import type { TenantUserListItemDto } from '@/api/generated/models/tenantUserListItemDto';

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const ROLE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  super_admin: 'default',
  tenant_admin: 'default',
  tenant_staff: 'secondary',
  player: 'outline',
};

type RoleFilter =
  | ''
  | (typeof UsersControllerListTenantUsersRole)[keyof typeof UsersControllerListTenantUsersRole];

type ActiveFilter = '' | 'active' | 'inactive';

type BannedFilter = '' | 'banned' | 'notBanned';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Column helper ────────────────────────────────────────────────────────────

const col = createColumnHelper<TenantUserListItemDto>();

// ── PlayerListPage ────────────────────────────────────────────────────────────

export function PlayerListPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const role = useAuthStore((s) => normalizeRole(s.user?.role ?? ''));

  const canSeeDeleted = role === 'super_admin' || role === 'tenant_admin';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [spinning, setSpinning] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(activeFilter !== '' ? { isActive: activeFilter === 'active' } : {}),
      ...(bannedFilter !== '' ? { isBanned: bannedFilter === 'banned' } : {}),
      ...(includeDeleted && canSeeDeleted ? { includeDeleted: true } : {}),
    }),
    [
      page,
      limit,
      debouncedSearch,
      roleFilter,
      activeFilter,
      bannedFilter,
      includeDeleted,
      canSeeDeleted,
    ],
  );

  const {
    data: raw,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useUsersControllerListTenantUsers(params);

  const paginated = unwrap(raw);
  const items = paginated?.items ?? [];
  const total = paginated?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: t('players.table.name'),
        cell: (info) => (
          <span className="font-medium text-foreground">{info.getValue()}</span>
        ),
      }),
      col.accessor('email', {
        header: t('players.table.email'),
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      col.accessor('role', {
        header: t('players.table.role'),
        cell: (info) => {
          const r = info.getValue();
          return (
            <Badge variant={ROLE_BADGE_VARIANT[r] ?? 'outline'}>
              {t(`players.role.${r}`, { defaultValue: r })}
            </Badge>
          );
        },
      }),
      col.accessor('isActive', {
        header: t('players.table.status'),
        cell: (info) => {
          const row = info.row.original;
          const deleted = !row.isActive && includeDeleted;
          if (deleted) {
            return (
              <div className="flex flex-wrap gap-1">
                <Badge variant="destructive">
                  {t('players.status.deleted')}
                </Badge>
              </div>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              <Badge variant={info.getValue() ? 'default' : 'secondary'}>
                {info.getValue()
                  ? t('players.status.active')
                  : t('players.status.inactive')}
              </Badge>
              {row.isBanned && (
                <Badge
                  variant="destructive"
                  title={
                    row.bannedUntil
                      ? t('players.status.bannedUntil', {
                          date: formatDate(String(row.bannedUntil)),
                        })
                      : t('players.status.bannedPermanent')
                  }
                >
                  {t('players.status.banned')}
                </Badge>
              )}
            </div>
          );
        },
      }),
      col.accessor('createdAt', {
        header: t('players.table.registered'),
        cell: (info) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(`/operator/players/${info.row.original.id}`)
            }
          >
            {t('players.actions.view')}
          </Button>
        ),
      }),
    ],
    [t, navigate, includeDeleted],
  );

  /* eslint-disable react-hooks/incompatible-library */
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  /* eslint-enable react-hooks/incompatible-library */

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-xl font-semibold text-foreground">
            {t('players.title')}
          </h1>
        </div>
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
          aria-label={t('players.refreshAria')}
          title={t('common.refresh')}
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

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-48 flex-1">
          <Search
            className="absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="ps-9"
            placeholder={t('players.filters.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </div>

        {/* Role filter */}
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as RoleFilter);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('players.filters.roleAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('players.filters.roleAll')}</SelectItem>
            {Object.values(UsersControllerListTenantUsersRole).map((r) => (
              <SelectItem key={r} value={r}>
                {t(`players.role.${r}`, { defaultValue: r })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filter */}
        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v as ActiveFilter);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('players.filters.statusAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('players.filters.statusAll')}</SelectItem>
            <SelectItem value="active">{t('players.status.active')}</SelectItem>
            <SelectItem value="inactive">
              {t('players.status.inactive')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Banned filter — admin only */}
        {canSeeDeleted && (
          <Select
            value={bannedFilter}
            onValueChange={(v) => {
              setBannedFilter(v as BannedFilter);
              resetPage();
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('players.filters.bannedAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('players.filters.bannedAll')}</SelectItem>
              <SelectItem value="banned">
                {t('players.filters.bannedOnly')}
              </SelectItem>
              <SelectItem value="notBanned">
                {t('players.filters.notBanned')}
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Include deleted — admin only */}
        {canSeeDeleted && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
            <input
              type="checkbox"
              className="accent-primary"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                resetPage();
              }}
            />
            {t('players.filters.includeDeleted')}
          </label>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-destructive">
              <AlertCircle className="size-6" aria-hidden />
              <p className="text-sm">{t('players.error.load')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr
                      key={hg.id}
                      className="border-b border-border bg-muted/40"
                    >
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {columns.map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {t('players.empty')}
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                        onClick={() =>
                          navigate(`/operator/players/${row.original.id}`)
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-3"
                            onClick={
                              cell.column.id === 'actions'
                                ? (e) => e.stopPropagation()
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {!isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          {/* Result count */}
          <span className="tabular-nums">
            {isLoading
              ? t('players.pagination.loading')
              : t('players.pagination.range', {
                  from: rangeStart,
                  to: rangeEnd,
                  total,
                })}
          </span>

          <div className="flex items-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <span className="shrink-0">
                {t('players.pagination.perPage')}
              </span>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(Number(v) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-18 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page nav */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('players.pagination.prev')}
              </Button>
              <span className="tabular-nums">
                {t('players.pagination.page', { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('players.pagination.next')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
