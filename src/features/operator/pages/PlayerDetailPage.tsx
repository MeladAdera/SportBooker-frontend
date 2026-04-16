import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldBan,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { unwrap, ApiError } from '@/api';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import {
  useUsersControllerGetTenantUser,
  useUsersControllerAssignRole,
  useUsersControllerBanPlayer,
  useUsersControllerUnbanPlayer,
  getUsersControllerGetTenantUserQueryKey,
  useUsersControllerListPlayerBookings,
} from '@/api/generated/users/users';
import { AssignRoleDtoRole } from '@/api/generated/models/assignRoleDtoRole';
import { UsersControllerListPlayerBookingsStatus } from '@/api/generated/models/usersControllerListPlayerBookingsStatus';

import { useQueryClient } from '@tanstack/react-query';

// ── Ban duration options ──────────────────────────────────────────────────────

const BAN_DURATION_OPTIONS = [
  { label: 'permanent', days: null },
  { label: '1', days: 1 },
  { label: '7', days: 7 },
  { label: '30', days: 30 },
] as const;

// ── Booking history constants ─────────────────────────────────────────────────

const BOOKING_PAGE_SIZE = 10;

const BOOKING_STATUS_BADGE: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  confirmed: 'default',
  waitlisted: 'secondary',
  cancelled: 'destructive',
};

// ── Role hierarchy ────────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  platform_admin: 5,
  super_admin: 4,
  tenant_admin: 3,
  tenant_staff: 2,
  player: 1,
};

function rankOf(role: string): number {
  return ROLE_RANK[normalizeRole(role)] ?? 0;
}

/** Roles the viewer is allowed to assign, given their own rank. */
function assignableRoles(viewerRole: string): AssignRoleDtoRole[] {
  const viewerRank = rankOf(viewerRole);
  return Object.values(AssignRoleDtoRole).filter((r) => rankOf(r) < viewerRank);
}

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

const ROLE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  super_admin: 'default',
  tenant_admin: 'default',
  tenant_staff: 'secondary',
  player: 'outline',
};

// ── BookingHistoryCard ────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
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

function BookingRowSkeleton() {
  return (
    <tr className="border-b border-border">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

function BookingHistoryCard({ userId }: { userId: string }) {
  const { t } = useTranslation('operator');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    | ''
    | (typeof UsersControllerListPlayerBookingsStatus)[keyof typeof UsersControllerListPlayerBookingsStatus]
  >('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  const params = {
    page,
    limit: BOOKING_PAGE_SIZE,
    ...(statusFilter
      ? {
          status:
            statusFilter as (typeof UsersControllerListPlayerBookingsStatus)[keyof typeof UsersControllerListPlayerBookingsStatus],
        }
      : {}),
    ...(upcomingOnly ? { upcoming: true } : {}),
  };

  const {
    data: raw,
    isLoading,
    isError,
  } = useUsersControllerListPlayerBookings(userId, params, {
    query: { enabled: !!userId },
  });

  const paginatedBookings = unwrap(raw);

  const items = paginatedBookings?.items ?? [];
  const total = paginatedBookings?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BOOKING_PAGE_SIZE));

  function resetPage() {
    setPage(1);
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header + filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden
            />
            <h2 className="text-base font-semibold text-foreground">
              {t('players.detail.bookingHistory.title')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as typeof statusFilter);
                resetPage();
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue
                  placeholder={t('players.detail.bookingHistory.statusAll')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {t('players.detail.bookingHistory.statusAll')}
                </SelectItem>
                {Object.values(UsersControllerListPlayerBookingsStatus).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {t(`players.detail.bookingHistory.status.${s}`, {
                        defaultValue: s,
                      })}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            {/* Upcoming toggle */}
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                className="accent-primary"
                checked={upcomingOnly}
                onChange={(e) => {
                  setUpcomingOnly(e.target.checked);
                  resetPage();
                }}
              />
              {t('players.detail.bookingHistory.upcomingOnly')}
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {(
                  [
                    'players.detail.bookingHistory.colMatch',
                    'players.detail.bookingHistory.colVenue',
                    'players.detail.bookingHistory.colDate',
                    'players.detail.bookingHistory.colStatus',
                    'players.detail.bookingHistory.colPaid',
                  ] as const
                ).map((key) => (
                  <th
                    key={key}
                    className="px-4 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <BookingRowSkeleton key={i} />
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-1.5 text-destructive">
                      <AlertCircle className="size-5" aria-hidden />
                      <p className="text-xs">
                        {t('players.detail.bookingHistory.error')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {t('players.detail.bookingHistory.empty')}
                  </td>
                </tr>
              ) : (
                items.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {booking.matchTitle}
                      <span className="ms-1.5 text-xs text-muted-foreground">
                        {t(`matches.sport.${booking.sportType}`, {
                          defaultValue: booking.sportType,
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {booking.venueName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(booking.matchScheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          BOOKING_STATUS_BADGE[booking.status] ?? 'outline'
                        }
                      >
                        {t(
                          `players.detail.bookingHistory.status.${booking.status}`,
                          { defaultValue: booking.status },
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {booking.paidAmount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── PlayerDetailPage ──────────────────────────────────────────────────────────

export function PlayerDetailPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const { id: userId = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const viewerRole = useAuthStore((s) => normalizeRole(s.user?.role ?? ''));
  const viewerId = useAuthStore((s) => s.user?.id ?? '');

  const canAssignRoles =
    viewerRole === 'super_admin' || viewerRole === 'tenant_admin';

  const {
    data: raw,
    isLoading,
    isError,
  } = useUsersControllerGetTenantUser(userId);

  const user = unwrap(raw);

  const assignMutation = useUsersControllerAssignRole({
    mutation: {
      onSuccess: () => {
        toast.success(t('players.detail.roleSuccess'));
        void queryClient.invalidateQueries({
          queryKey: getUsersControllerGetTenantUserQueryKey(userId),
        });
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.statusCode === 403) {
            toast.error(t('players.detail.roleErrorForbidden'));
            return;
          }
          if (err.statusCode === 400) {
            toast.error(t('players.detail.roleErrorSelf'));
            return;
          }
        }
        toast.error(t('players.detail.roleErrorGeneric'));
      },
    },
  });

  const isSelf = user?.id === viewerId;
  const targetRank = user ? rankOf(user.role) : 0;
  const viewerRank = rankOf(viewerRole);

  /** Viewer can change this user's role */
  const canChangeRole = canAssignRoles && !isSelf && targetRank < viewerRank;

  const roles = assignableRoles(viewerRole);

  const [pendingRole, setPendingRole] = useState<AssignRoleDtoRole | null>(
    null,
  );
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banDurationDays, setBanDurationDays] = useState<number | null>(null);
  const [banReason, setBanReason] = useState('');

  const canBan =
    (viewerRole === 'super_admin' || viewerRole === 'tenant_admin') &&
    !isSelf &&
    user?.role === 'player';

  const banMutation = useUsersControllerBanPlayer({
    mutation: {
      onSuccess: (res) => {
        const data = unwrap(res);
        const count = data?.cancelledBookings ?? 0;
        toast.success(
          t('players.detail.banSuccess', {
            count,
            defaultValue: `Player banned. ${count} upcoming booking(s) cancelled and refunded.`,
          }),
        );
        void queryClient.invalidateQueries({
          queryKey: getUsersControllerGetTenantUserQueryKey(userId),
        });
        setBanModalOpen(false);
        setBanReason('');
        setBanDurationDays(null);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.statusCode === 403) {
            toast.error(t('players.detail.banErrorForbidden'));
            return;
          }
          if (err.statusCode === 400) {
            toast.error(t('players.detail.banErrorSelf'));
            return;
          }
        }
        toast.error(t('players.detail.banError'));
      },
    },
  });

  const unbanMutation = useUsersControllerUnbanPlayer({
    mutation: {
      onSuccess: () => {
        toast.success(t('players.detail.unbanSuccess'));
        void queryClient.invalidateQueries({
          queryKey: getUsersControllerGetTenantUserQueryKey(userId),
        });
      },
      onError: () => {
        toast.error(t('players.detail.unbanError'));
      },
    },
  });

  function handleRoleChange(newRole: string | null) {
    if (!userId || !newRole) return;
    setPendingRole(newRole as AssignRoleDtoRole);
  }

  function confirmRoleChange() {
    if (!pendingRole) return;
    assignMutation.mutate(
      { userId, data: { role: pendingRole } },
      { onSettled: () => setPendingRole(null) },
    );
  }

  function confirmBan() {
    banMutation.mutate({
      userId,
      data: {
        ...(banDurationDays !== null ? { durationDays: banDurationDays } : {}),
        ...(banReason.trim() ? { reason: banReason.trim() } : {}),
      },
    });
  }

  function handleUnban() {
    unbanMutation.mutate({ userId });
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 w-fit"
          onClick={() => navigate('/operator/players')}
        >
          <ArrowLeft className="me-1.5 size-4" aria-hidden />
          {t('players.detail.back')}
        </Button>
        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (isError || !user) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 w-fit"
          onClick={() => navigate('/operator/players')}
        >
          <ArrowLeft className="me-1.5 size-4" aria-hidden />
          {t('players.detail.back')}
        </Button>
        <div className="flex flex-col items-center gap-2 py-16 text-center text-destructive">
          <AlertCircle className="size-6" aria-hidden />
          <p className="text-sm">{t('players.detail.notFound')}</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Back ───────────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 w-fit"
        onClick={() => navigate('/operator/players')}
      >
        <ArrowLeft className="me-1.5 size-4" aria-hidden />
        {t('players.detail.back')}
      </Button>

      {/* ── Profile card ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <User className="size-8 text-muted-foreground" aria-hidden />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">
                  {user.name}
                </h1>
                <Badge variant={ROLE_BADGE_VARIANT[user.role] ?? 'outline'}>
                  {t(`players.role.${user.role}`, { defaultValue: user.role })}
                </Badge>
                {!user.isActive && (
                  <Badge variant="destructive">
                    {t('players.status.inactive')}
                  </Badge>
                )}
                {user.isBanned && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldBan className="size-3" aria-hidden />
                    {t('players.status.banned')}
                  </Badge>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    {t('players.detail.email')}
                  </dt>
                  <dd className="font-medium text-foreground">{user.email}</dd>
                </div>

                {user.phone && (
                  <div>
                    <dt className="text-muted-foreground">
                      {t('players.detail.phone')}
                    </dt>
                    <dd className="font-medium text-foreground">
                      {user.phone}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-muted-foreground">
                    {t('players.detail.wallet')}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {t('players.detail.walletValue', {
                      amount: user.walletBalance.toFixed(2),
                    })}
                  </dd>
                </div>

                <div>
                  <dt className="text-muted-foreground">
                    {t('players.detail.registered')}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {formatDate(user.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Role assignment ─────────────────────────────────────────── */}
      {canAssignRoles && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-1.5 mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {t('players.detail.roleSection')}
              </h2>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  {t('players.detail.roleSelfHint')}
                </p>
              )}
              {!isSelf && !canChangeRole && (
                <p className="text-xs text-muted-foreground">
                  {t('players.detail.roleHigherRankHint')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={user.role}
                onValueChange={handleRoleChange}
                disabled={
                  !canChangeRole ||
                  assignMutation.isPending ||
                  roles.length === 0
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Show current role even if not assignable, so the dropdown reflects reality */}
                  {!roles.includes(user.role as AssignRoleDtoRole) && (
                    <SelectItem value={user.role} disabled>
                      {t(`players.role.${user.role}`, {
                        defaultValue: user.role,
                      })}
                    </SelectItem>
                  )}
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`players.role.${r}`, { defaultValue: r })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {assignMutation.isPending && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-hidden
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Ban / Unban ─────────────────────────────────────────────── */}
      {canBan && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldBan
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <h2 className="text-base font-semibold text-foreground">
                    {t('players.detail.banSection')}
                  </h2>
                </div>

                {user.isBanned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnban}
                    disabled={unbanMutation.isPending}
                  >
                    {unbanMutation.isPending ? (
                      <>
                        <Loader2
                          className="me-2 size-4 animate-spin"
                          aria-hidden
                        />
                        {t('players.detail.unbanning')}
                      </>
                    ) : (
                      t('players.detail.unbanBtn')
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBanModalOpen(true)}
                  >
                    {t('players.detail.banBtn')}
                  </Button>
                )}
              </div>

              {user.isBanned && (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {user.bannedAt && (
                    <div>
                      <dt className="text-muted-foreground">
                        {t('players.detail.bannedAt')}
                      </dt>
                      <dd className="font-medium text-foreground">
                        {formatDate(String(user.bannedAt))}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">
                      {t('players.detail.bannedUntil')}
                    </dt>
                    <dd className="font-medium text-foreground">
                      {user.bannedUntil
                        ? formatDate(String(user.bannedUntil))
                        : t('players.detail.bannedPermanent')}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">
                      {t('players.detail.banReason')}
                    </dt>
                    <dd className="font-medium text-foreground">
                      {user.banReason
                        ? String(user.banReason)
                        : t('players.detail.banReasonNone')}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Booking history ─────────────────────────────────────────── */}
      <BookingHistoryCard userId={userId} />

      {/* ── Role change confirm dialog ──────────────────────────────── */}
      <Dialog
        open={!!pendingRole}
        onOpenChange={(open) => {
          if (!open) setPendingRole(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('players.detail.roleConfirm.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('players.detail.roleConfirm.body', {
              name: user.name,
              role: t(`players.role.${pendingRole}`, {
                defaultValue: pendingRole ?? '',
              }),
            })}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRole(null)}
              disabled={assignMutation.isPending}
            >
              {t('players.detail.roleConfirm.cancel')}
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                  {t('players.detail.roleConfirm.confirming')}
                </>
              ) : (
                t('players.detail.roleConfirm.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Ban player dialog ────────────────────────────────────────── */}
      <Dialog
        open={banModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBanModalOpen(false);
            setBanReason('');
            setBanDurationDays(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('players.detail.banModal.title')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('players.detail.banModal.durationLabel')}
              </label>
              <Select
                value={
                  banDurationDays === null
                    ? 'permanent'
                    : String(banDurationDays)
                }
                onValueChange={(v) =>
                  setBanDurationDays(v === 'permanent' ? null : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATION_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.label}
                      value={opt.days === null ? 'permanent' : String(opt.days)}
                    >
                      {opt.days === null
                        ? t('players.detail.banModal.permanent')
                        : t('players.detail.banModal.day_other', {
                            count: opt.days,
                          })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('players.detail.banModal.reasonLabel')}
              </label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder={t('players.detail.banModal.reasonPlaceholder')}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBanModalOpen(false);
                setBanReason('');
                setBanDurationDays(null);
              }}
              disabled={banMutation.isPending}
            >
              {t('players.detail.banModal.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBan}
              disabled={banMutation.isPending}
            >
              {banMutation.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                  {t('players.detail.banModal.confirming')}
                </>
              ) : (
                t('players.detail.banModal.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
