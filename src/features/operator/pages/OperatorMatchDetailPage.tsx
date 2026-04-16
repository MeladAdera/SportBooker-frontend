import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Dumbbell,
  ExternalLink,
  Loader2,
  MapPin,
  Shield,
  Star,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateInTz, formatTimeInTz } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMatchesControllerGetById,
  getMatchesControllerGetByIdQueryKey,
} from '@/api/generated/matches/matches';
import { BookingPosition } from '@/api/generated/models/bookingPosition';
import { MatchDetailResponseDtoStatus } from '@/api/generated/models/matchDetailResponseDtoStatus';
import type { MatchDetailResponseDto } from '@/api/generated/models/matchDetailResponseDto';
import type { MatchRosterPlayerDto } from '@/api/generated/models/matchRosterPlayerDto';
import { unwrap } from '@/api';
import type { ApiError } from '@/api/client';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import { useTenantTimezone } from '@/shared/hooks';
import {
  useMatchesControllerGetWaitlist,
  getMatchesControllerGetWaitlistQueryKey,
  useMatchesControllerRemoveFromWaitlist,
} from '@/api/generated/matches/matches';
import {
  useTenantMatchesControllerGetResults,
  useTenantMatchesControllerSubmitResults,
  getTenantMatchesControllerGetResultsQueryKey,
} from '@/api/generated/tenant-—-matches/tenant-—-matches';
import type { MatchResultsResponseDto } from '@/api/generated/models/matchResultsResponseDto';
import { PlayerStatEntryDtoTeamSide } from '@/api/generated/models/playerStatEntryDtoTeamSide';
import { SubmitMatchResultsDtoWinningSide } from '@/api/generated/models/submitMatchResultsDtoWinningSide';
import type { OperatorWaitlistEntryDto } from '@/api/generated/models/operatorWaitlistEntryDto';

// ── Helpers ───────────────────────────────────────────────────────────────────

function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const SPORT_ICONS: Record<string, React.ElementType> = {
  football: Shield,
  padel: Shield,
  cricket: Shield,
  generic: Dumbbell,
};

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

// ── CapacityBar ───────────────────────────────────────────────────────────────

function CapacityBar({ confirmed, max }: { confirmed: number; max: number }) {
  const { t } = useTranslation('operator');
  const pct = max > 0 ? Math.min((confirmed / max) * 100, 100) : 0;
  const isFull = confirmed >= max;
  const spotsLeft = max - confirmed;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('matchDetail.capacity.label')}
        </span>
        <span
          className={cn(
            'font-medium tabular-nums',
            isFull ? 'text-destructive' : 'text-foreground',
          )}
        >
          {confirmed} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isFull ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={confirmed}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      <p
        className={cn(
          'text-xs',
          isFull ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {isFull
          ? t('matchDetail.capacity.full')
          : t('matchDetail.capacity.spotsLeft', { count: spotsLeft })}
      </p>
    </div>
  );
}

// ── RosterList ────────────────────────────────────────────────────────────────

function RosterList({ roster }: { roster: MatchDetailResponseDto['roster'] }) {
  const { t } = useTranslation('operator');

  if (roster.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('matchDetail.roster.empty')}
      </p>
    );
  }

  const gkCount = roster.filter(
    (p) => p.position === BookingPosition.goalkeeper,
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="size-3.5" aria-hidden />
        <span>
          {t('matchDetail.roster.position.goalkeeper')}: {gkCount}
        </span>
        <span className="mx-1">·</span>
        <Users className="size-3.5" aria-hidden />
        <span>
          {t('matchDetail.roster.position.field_player')}:{' '}
          {roster.length - gkCount}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {roster.map((player) => (
          <li key={player.userId} className="flex items-center gap-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
              {player.name.charAt(0)}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">
              {player.name}
            </span>
            <Badge variant="outline" className="shrink-0 text-xs capitalize">
              {t(`matchDetail.roster.position.${player.position}`, {
                defaultValue: player.position.replace('_', ' '),
              })}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return <Skeleton className="h-48 w-full rounded-none md:rounded-xl" />;
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

// ── Kick confirm dialog ─────────────────────────────────────────────────────

function KickConfirmDialog({
  entry,
  matchId,
  open,
  onOpenChange,
}: {
  entry: OperatorWaitlistEntryDto | null;
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('operator');
  const qc = useQueryClient();
  const kick = useMatchesControllerRemoveFromWaitlist({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getMatchesControllerGetWaitlistQueryKey(matchId),
        });
        void qc.invalidateQueries({
          queryKey: getMatchesControllerGetByIdQueryKey(matchId),
        });
        onOpenChange(false);
      },
    },
  });

  function handleConfirm() {
    if (!entry) return;
    kick.mutate({ matchId, bookingId: entry.bookingId });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent showCloseButton={!kick.isPending}>
        <DialogHeader>
          <DialogTitle>
            {t('matchDetail.waitlist.kickConfirm.title')}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('matchDetail.waitlist.kickConfirm.body', {
            name: entry?.name ?? '',
          })}
        </p>
        {kick.isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {t('matchDetail.waitlist.kickError')}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={kick.isPending}
          >
            {t('matchDetail.waitlist.kickConfirm.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={kick.isPending}
          >
            {kick.isPending
              ? t('matchDetail.waitlist.kicking')
              : t('matchDetail.waitlist.kickConfirm.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Operator waitlist section ────────────────────────────────────────────────

function OperatorWaitlistSection({
  matchId,
  canKick,
}: {
  matchId: string;
  canKick: boolean;
}) {
  const { t } = useTranslation('operator');
  const [kickTarget, setKickTarget] = useState<OperatorWaitlistEntryDto | null>(
    null,
  );

  const {
    data: waitlistData,
    isLoading,
    isError,
  } = useMatchesControllerGetWaitlist(matchId);

  const waitlist =
    (unwrap(waitlistData) as OperatorWaitlistEntryDto[] | undefined) ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 pb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {t('matchDetail.waitlist.kickError')}
      </p>
    );
  }

  if (waitlist.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('matchDetail.waitlist.empty')}
      </p>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="overflow-x-auto pt-0 pb-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2.5 pe-2 text-start font-medium">
                  {t('matchDetail.waitlist.table.position')}
                </th>
                <th className="py-2.5 pe-2 text-start font-medium">
                  {t('matchDetail.waitlist.table.player')}
                </th>
                <th className="hidden py-2.5 pe-2 text-start font-medium sm:table-cell">
                  {t('matchDetail.waitlist.table.email')}
                </th>
                <th className="py-2.5 pe-2 text-start font-medium">
                  {t('matchDetail.waitlist.table.role')}
                </th>
                <th className="py-2.5 pe-2 text-end font-medium">
                  {t('matchDetail.waitlist.table.paid')}
                </th>
                {canKick && (
                  <th className="py-2.5 text-end font-medium">
                    {t('matchDetail.waitlist.table.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {waitlist.map((entry) => (
                <tr key={entry.bookingId}>
                  <td className="py-2.5 pe-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-400">
                      {entry.queuePosition}
                    </span>
                  </td>
                  <td className="py-2.5 pe-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
                        {entry.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">
                        {entry.name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden py-2.5 pe-2 text-muted-foreground sm:table-cell">
                    {entry.email}
                  </td>
                  <td className="py-2.5 pe-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {t(`matchDetail.roster.position.${entry.position}`, {
                        defaultValue: entry.position.replace('_', ' '),
                      })}
                    </Badge>
                  </td>
                  <td className="py-2.5 pe-2 text-end tabular-nums text-foreground">
                    {formatCurrency(parseFloat(entry.paidAmount))}
                  </td>
                  {canKick && (
                    <td className="py-2.5 text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKickTarget(entry)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        <span className="sr-only">
                          {t('matchDetail.waitlist.kick')}
                        </span>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <KickConfirmDialog
        entry={kickTarget}
        matchId={matchId}
        open={!!kickTarget}
        onOpenChange={(open) => !open && setKickTarget(null)}
      />
    </>
  );
}

// ── Match Results ─────────────────────────────────────────────────────────────

type PlayerRow = {
  userId: string;
  name: string;
  teamSide: PlayerStatEntryDtoTeamSide;
  goals: number;
  assists: number;
  isMvp: boolean;
};

type WinnerOption = SubmitMatchResultsDtoWinningSide | 'draw';

function ResultsReadOnly({
  results,
  roster,
}: {
  results: MatchResultsResponseDto;
  roster: MatchRosterPlayerDto[];
}) {
  const { t } = useTranslation('operator');
  const tenantTz = useTenantTimezone();
  const nameMap = Object.fromEntries(roster.map((r) => [r.userId, r.name]));

  const teamA = results.players.filter(
    (p) => p.teamSide === PlayerStatEntryDtoTeamSide.team_a,
  );
  const teamB = results.players.filter(
    (p) => p.teamSide === PlayerStatEntryDtoTeamSide.team_b,
  );

  const winnerLabel =
    results.winningSide == null
      ? t('matchDetail.results.draw')
      : t(`matchDetail.results.${results.winningSide}`);

  return (
    <div className="flex flex-col gap-4">
      {/* Winner banner */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border px-4 py-3',
          results.winningSide == null
            ? 'border-muted bg-muted/40'
            : 'border-primary/30 bg-primary/5',
        )}
      >
        <Trophy
          className={cn(
            'size-4',
            results.winningSide == null
              ? 'text-muted-foreground'
              : 'text-primary',
          )}
          aria-hidden
        />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            {t('matchDetail.results.winner')}
          </p>
          <p className="font-semibold text-foreground">{winnerLabel}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('matchDetail.results.submittedAt', {
            date: formatDateInTz(results.createdAt, tenantTz),
          })}
        </p>
      </div>

      {/* Teams grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { side: PlayerStatEntryDtoTeamSide.team_a, players: teamA },
          { side: PlayerStatEntryDtoTeamSide.team_b, players: teamB },
        ].map(({ side, players }) => (
          <div key={side} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {t(`matchDetail.results.${side}`)}
              </h3>
              {results.winningSide === side && (
                <Badge className="text-[10px]">
                  {t('matchDetail.results.winner')}
                </Badge>
              )}
            </div>
            {players.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border">
                {players.map((p) => {
                  const displayName = nameMap[p.userId] ?? p.userId;
                  return (
                    <li
                      key={p.userId}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
                        {displayName.charAt(0)}
                      </div>
                      <span className="flex-1 text-sm text-foreground">
                        {displayName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span title={t('matchDetail.results.goalsLabel')}>
                          ⚽ {p.goals}
                        </span>
                        <span title={t('matchDetail.results.assistsLabel')}>
                          🅰 {p.assists}
                        </span>
                        {p.isMvp && (
                          <Star
                            className="size-3.5 fill-amber-400 text-amber-400"
                            aria-label={t('matchDetail.results.mvpLabel')}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmitResultsForm({
  matchId,
  roster,
  onSubmitted,
}: {
  matchId: string;
  roster: MatchRosterPlayerDto[];
  onSubmitted: () => void;
}) {
  const { t } = useTranslation('operator');
  const qc = useQueryClient();

  const [rows, setRows] = useState<PlayerRow[]>(() =>
    roster.map((p) => ({
      userId: p.userId,
      name: p.name,
      teamSide: PlayerStatEntryDtoTeamSide.team_a,
      goals: 0,
      assists: 0,
      isMvp: false,
    })),
  );
  const [winner, setWinner] = useState<WinnerOption>('draw');
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useTenantMatchesControllerSubmitResults({
    mutation: {
      onSuccess: async () => {
        await qc.invalidateQueries({
          queryKey: getTenantMatchesControllerGetResultsQueryKey(matchId),
        });
        onSubmitted();
      },
      onError: (err: unknown) => {
        const status = (err as ApiError | null)?.statusCode;
        if (status === 409) {
          setServerError(t('matchDetail.results.error.alreadySubmitted'));
        } else if (status === 400) {
          setServerError(t('matchDetail.results.error.matchNotCompleted'));
        } else {
          setServerError(t('matchDetail.results.error.generic'));
        }
      },
    },
  });

  function updateRow(
    userId: string,
    patch: Partial<Omit<PlayerRow, 'userId' | 'name'>>,
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.userId !== userId) {
          // If setting MVP, clear it from other rows
          if (patch.isMvp) return { ...r, isMvp: false };
          return r;
        }
        return { ...r, ...patch };
      }),
    );
  }

  function handleSubmit() {
    setServerError(null);
    mutation.mutate({
      id: matchId,
      data: {
        winningSide:
          winner === 'draw'
            ? undefined
            : (winner as SubmitMatchResultsDtoWinningSide),
        players: rows.map((r) => ({
          userId: r.userId,
          teamSide: r.teamSide,
          goals: r.goals,
          assists: r.assists,
          isMvp: r.isMvp,
        })),
      },
    });
  }

  if (roster.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('matchDetail.results.noPlayers')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {t('matchDetail.results.form.heading')}
      </p>

      {/* Player table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2.5 ps-3 pe-2 text-start font-medium">
                  {t('matchDetail.results.form.player')}
                </th>
                <th className="py-2.5 pe-2 text-start font-medium">
                  {t('matchDetail.results.form.teamSide')}
                </th>
                <th className="py-2.5 pe-2 text-center font-medium">
                  {t('matchDetail.results.form.goals')}
                </th>
                <th className="py-2.5 pe-2 text-center font-medium">
                  {t('matchDetail.results.form.assists')}
                </th>
                <th className="py-2.5 pe-3 text-center font-medium">
                  {t('matchDetail.results.form.mvp')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.userId}>
                  <td className="py-2 ps-3 pe-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
                        {row.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pe-2">
                    <Select
                      value={row.teamSide}
                      onValueChange={(v) =>
                        updateRow(row.userId, {
                          teamSide: (v ??
                            PlayerStatEntryDtoTeamSide.team_a) as PlayerStatEntryDtoTeamSide,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PlayerStatEntryDtoTeamSide.team_a}>
                          {t('matchDetail.results.team_a')}
                        </SelectItem>
                        <SelectItem value={PlayerStatEntryDtoTeamSide.team_b}>
                          {t('matchDetail.results.team_b')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 pe-2">
                    <input
                      type="number"
                      min={0}
                      value={row.goals}
                      onChange={(e) =>
                        updateRow(row.userId, {
                          goals: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="h-7 w-14 rounded-lg border border-input bg-transparent px-2 text-center text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                  </td>
                  <td className="py-2 pe-2">
                    <input
                      type="number"
                      min={0}
                      value={row.assists}
                      onChange={(e) =>
                        updateRow(row.userId, {
                          assists: Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0,
                          ),
                        })
                      }
                      className="h-7 w-14 rounded-lg border border-input bg-transparent px-2 text-center text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                  </td>
                  <td className="py-2 pe-3 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(row.userId, { isMvp: !row.isMvp })
                      }
                      aria-pressed={row.isMvp}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                        row.isMvp
                          ? 'border-amber-400 bg-amber-400/10 text-amber-500'
                          : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-400',
                      )}
                    >
                      <Star
                        className={cn('size-3.5', row.isMvp && 'fill-current')}
                        aria-hidden
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Winner selector */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-foreground">
          {t('matchDetail.results.form.winningSide')}
        </p>
        <div className="flex gap-2">
          {(
            [
              {
                value: SubmitMatchResultsDtoWinningSide.team_a,
                label: t('matchDetail.results.form.team_a'),
              },
              {
                value: SubmitMatchResultsDtoWinningSide.team_b,
                label: t('matchDetail.results.form.team_b'),
              },
              {
                value: 'draw' as const,
                label: t('matchDetail.results.form.drawOption'),
              },
            ] satisfies { value: WinnerOption; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setWinner(value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                winner === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={mutation.isPending}
        className="w-fit"
      >
        {mutation.isPending && (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        )}
        {mutation.isPending
          ? t('matchDetail.results.form.submitting')
          : t('matchDetail.results.form.submit')}
      </Button>
    </div>
  );
}

function MatchResultsSection({
  matchId,
  roster,
}: {
  matchId: string;
  roster: MatchRosterPlayerDto[];
}) {
  const { t } = useTranslation('operator');
  const [submitted, setSubmitted] = useState(false);

  const {
    data: resultsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useTenantMatchesControllerGetResults(matchId, {
    query: { retry: false },
  });

  const results = unwrap(resultsData);

  const is404 =
    isError && (error as unknown as ApiError | null)?.statusCode === 404;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 pb-5">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          {results || submitted ? (
            <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
          ) : (
            <Trophy className="size-4 text-primary" aria-hidden />
          )}
          {t('matchDetail.results.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        {/* Non-404 errors */}
        {isError && !is404 && !submitted && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-destructive">
              {t('matchDetail.results.error.generic')}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Results already submitted — read-only view */}
        {results && !submitted && (
          <ResultsReadOnly results={results} roster={roster} />
        )}

        {/* 404 means not submitted yet — show form */}
        {(is404 || submitted) && !results && (
          <SubmitResultsForm
            matchId={matchId}
            roster={roster}
            onSubmitted={() => setSubmitted(true)}
          />
        )}

        {/* After optimistic submit, show pending message until refetch returns */}
        {submitted && !results && !is404 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            {t('matchDetail.results.notSubmitted')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OperatorMatchDetailPage() {
  const { t } = useTranslation('operator');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenantTz = useTenantTimezone();

  const role = useAuthStore((s) => s.user?.role ?? '');
  const normalized = normalizeRole(role);
  const canCancel =
    normalized === 'super_admin' || normalized === 'tenant_admin';

  const {
    data: matchData,
    isLoading,
    isError,
  } = useMatchesControllerGetById(id ?? '', { query: { enabled: !!id } });

  const match = unwrap(matchData);

  const isCancelled = match?.status === MatchDetailResponseDtoStatus.cancelled;

  const confirmedCount = match ? match.maxCapacity - match.spotsRemaining : 0;

  const SportIcon = match
    ? (SPORT_ICONS[match.sportType] ?? Dumbbell)
    : Dumbbell;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{t('matchDetail.error.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/operator/matches')}>
          {t('matchDetail.error.goBack')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── Back nav ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-4 md:px-6 md:pt-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => navigate('/operator/matches')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('matchDetail.back')}
        </Button>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <div className="flex flex-col gap-0 md:mx-6">
          {match?.venuePictureUrl && (
            <div className="relative h-60 overflow-hidden md:rounded-xl">
              <img
                src={match.venuePictureUrl}
                alt={
                  match.venueName
                    ? t('matchDetail.info.venuePhotoAlt', {
                        venue: match.venueName,
                      })
                    : ''
                }
                className="size-full object-cover"
              />
            </div>
          )}

          <div
            className={cn(
              'flex w-full items-center justify-between gap-3 px-4 py-3 md:px-6',
              !match?.venuePictureUrl &&
                'rounded-xl bg-linear-to-br from-primary/20 via-primary/10 to-background',
              match?.venuePictureUrl && 'border-b',
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <SportIcon className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">
                  {match &&
                    t(`matches.sport.${match.sportType}`, {
                      defaultValue: match.sportType,
                    })}
                </p>
                <h1 className="text-xl font-bold text-foreground">
                  {match?.title}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {match && <StatusBadge status={match.status} />}
              {match && !isCancelled && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(`/operator/matches/${match.id}/edit`)
                    }
                  >
                    {t('matchDetail.edit')}
                  </Button>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        navigate(`/operator/matches/${match.id}/cancel`)
                      }
                    >
                      {t('matchDetail.cancel')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <DetailSkeleton />
      ) : !match ? null : (
        <div className="flex flex-col gap-6 p-4 md:p-6">
          {/* Match info */}
          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              {/* Venue */}
              <div className="flex gap-2.5 text-sm">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="font-medium text-foreground">
                    {match.venueName ?? match.venueId}
                  </span>
                  {match.venueAddress ? (
                    <>
                      <p className="whitespace-pre-wrap leading-snug text-muted-foreground">
                        {match.venueAddress}
                      </p>
                      <a
                        href={googleMapsSearchUrl(match.venueAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {t('matchDetail.info.openInMaps')}
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4 shrink-0" aria-hidden />
                <span>{formatDateInTz(match.scheduledAt, tenantTz)}</span>
              </div>

              {/* Time + duration */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4 shrink-0" aria-hidden />
                <span>
                  {formatTimeInTz(match.scheduledAt, tenantTz)} &middot;{' '}
                  {t('matchDetail.info.duration', { mins: match.durationMins })}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(match.pricePerPlayer)}
                  </span>{' '}
                  {t('matchDetail.info.perPlayer')}
                </span>
              </div>

              {/* Capacity bar */}
              <CapacityBar confirmed={confirmedCount} max={match.maxCapacity} />
            </CardContent>
          </Card>

          {/* Confirmed players */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t('matchDetail.roster.title')} ({match.roster.length})
            </h2>
            <Card>
              <CardContent className="pb-2 pt-2">
                <RosterList roster={match.roster} />
              </CardContent>
            </Card>
          </div>

          {/* Waitlist */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t('matchDetail.waitlist.title')}
            </h2>
            <OperatorWaitlistSection matchId={match.id} canKick={canCancel} />
          </div>

          {/* Match results — only shown for completed matches */}
          {match.status === MatchDetailResponseDtoStatus.completed && (
            <MatchResultsSection matchId={match.id} roster={match.roster} />
          )}
        </div>
      )}
    </div>
  );
}
