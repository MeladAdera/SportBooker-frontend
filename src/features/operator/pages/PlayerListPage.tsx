import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { unwrap } from '@/api';
import { cn } from '@/lib/utils';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/shared/hooks';
import { useUsersControllerListTenantUsers } from '@/api/generated/users/users';
import { UsersControllerListTenantUsersRole } from '@/api/generated/models/usersControllerListTenantUsersRole';
import type { TenantUserListItemDto } from '@/api/generated/models/tenantUserListItemDto';
import {
  bulkCreateFakePlayers,
  deleteFakePlayer,
  fakePlayersKeys,
} from '@/features/operator/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type TenantUserWithFake = TenantUserListItemDto & { isFake?: boolean };

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

type FakeFilter = '' | 'fake' | 'real';

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

const col = createColumnHelper<TenantUserWithFake>();

// ── BulkFakeModal ─────────────────────────────────────────────────────────────

interface BulkFakeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkFakeModal({ open, onClose, onSuccess }: BulkFakeModalProps) {
  const { t } = useTranslation('operator');
  const [count, setCount] = useState(10);
  const [seed, setSeed] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      bulkCreateFakePlayers({
        count,
        ...(seed.trim() !== '' ? { seed: Number(seed) } : {}),
      }),
    onSuccess: (data) => {
      toast.success(t('players.bulkFakeModal.success', { count: data.count }));
      onSuccess();
      onClose();
    },
    onError: () => {
      toast.error(t('players.bulkFakeModal.error'));
    },
  });

  function handleClose() {
    if (mutation.isPending) return;
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('players.bulkFakeModal.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fake-count">
              {t('players.bulkFakeModal.countLabel')}
            </Label>
            <Input
              id="fake-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) =>
                setCount(Math.min(200, Math.max(1, Number(e.target.value))))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fake-seed">
              {t('players.bulkFakeModal.seedLabel')}
            </Label>
            <Input
              id="fake-seed"
              type="number"
              placeholder="e.g. 12345"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                {t('players.bulkFakeModal.submitting')}
              </>
            ) : (
              t('players.bulkFakeModal.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DeleteFakeConfirmModal ─────────────────────────────────────────────────────

interface DeleteFakeConfirmProps {
  playerId: string | null;
  playerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteFakeConfirmModal({
  playerId,
  playerName,
  onClose,
  onSuccess,
}: DeleteFakeConfirmProps) {
  const { t } = useTranslation('operator');

  const mutation = useMutation({
    mutationFn: () => deleteFakePlayer(playerId!),
    onSuccess: () => {
      toast.success(t('players.deleteFakeConfirm.success'));
      onSuccess();
      onClose();
    },
    onError: () => {
      toast.error(t('players.deleteFakeConfirm.error'));
    },
  });

  return (
    <Dialog open={!!playerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('players.deleteFakeConfirm.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('players.deleteFakeConfirm.body')}
        </p>
        <p className="text-sm font-medium">{playerName}</p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t('players.deleteFakeConfirm.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                {t('players.deleteFakeConfirm.confirm')}…
              </>
            ) : (
              t('players.deleteFakeConfirm.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PlayerListPage ────────────────────────────────────────────────────────────

export function PlayerListPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => normalizeRole(s.user?.role ?? ''));

  const canManageFake = role === 'super_admin' || role === 'tenant_admin';
  const canSeeDeleted = role === 'super_admin' || role === 'tenant_admin';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>('');
  const [fakeFilter, setFakeFilter] = useState<FakeFilter>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(activeFilter !== '' ? { isActive: activeFilter === 'active' } : {}),
      ...(bannedFilter !== '' ? { isBanned: bannedFilter === 'banned' } : {}),
      ...(fakeFilter !== '' ? { isFake: fakeFilter === 'fake' } : {}),
      ...(includeDeleted && canSeeDeleted ? { includeDeleted: true } : {}),
    }),
    [
      page,
      limit,
      debouncedSearch,
      roleFilter,
      activeFilter,
      bannedFilter,
      fakeFilter,
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
  const items = (paginated?.items ?? []) as TenantUserWithFake[];
  const total = paginated?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  function invalidateUsers() {
    void queryClient.invalidateQueries({ queryKey: fakePlayersKeys.all });
    void refetch();
  }

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
              {row.isFake && (
                <Badge
                  variant="secondary"
                  className="border border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                >
                  {t('players.status.fake')}
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
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/operator/players/${row.id}`)}
              >
                {t('players.actions.view')}
              </Button>
              {row.isFake && canManageFake && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() =>
                    setDeleteTarget({ id: row.id, name: row.name })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only">{t('players.actions.delete')}</span>
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [t, navigate, includeDeleted, canManageFake],
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
        <div className="flex items-center gap-2">
          {canManageFake && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setBulkModalOpen(true)}
            >
              <Wand2 className="size-4" aria-hidden />
              {t('players.actions.generateFake')}
            </Button>
          )}
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

        {/* Fake / Real filter — admin only */}
        {canManageFake && (
          <Select
            value={fakeFilter}
            onValueChange={(v) => {
              setFakeFilter(v as FakeFilter);
              resetPage();
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('players.filters.fakeAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('players.filters.fakeAll')}</SelectItem>
              <SelectItem value="real">
                {t('players.filters.realOnly')}
              </SelectItem>
              <SelectItem value="fake">
                {t('players.filters.fakeOnly')}
              </SelectItem>
            </SelectContent>
          </Select>
        )}

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

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {canManageFake && (
        <BulkFakeModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={invalidateUsers}
        />
      )}
      {deleteTarget && (
        <DeleteFakeConfirmModal
          playerId={deleteTarget.id}
          playerName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onSuccess={invalidateUsers}
        />
      )}
    </div>
  );
}
