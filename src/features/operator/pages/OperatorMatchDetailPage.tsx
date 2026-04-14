import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  Dumbbell,
  ExternalLink,
  Info,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMatchesControllerGetById } from '@/api/generated/matches/matches';
import { BookingPosition } from '@/api/generated/models/bookingPosition';
import { MatchDetailResponseDtoStatus } from '@/api/generated/models/matchDetailResponseDtoStatus';
import type { MatchDetailResponseDto } from '@/api/generated/models/matchDetailResponseDto';
import { unwrap } from '@/api';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('matchDetail.info.capacity')}
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function OperatorMatchDetailPage() {
  const { t } = useTranslation('operator');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
        <div
          className={cn(
            'relative flex h-52 items-end overflow-hidden px-4 pb-4 md:mx-6 md:rounded-xl md:px-6',
            !match?.venuePictureUrl &&
              'bg-linear-to-br from-primary/20 via-primary/10 to-background',
          )}
        >
          {match?.venuePictureUrl ? (
            <>
              <img
                src={match.venuePictureUrl}
                alt={
                  match.venueName
                    ? t('matchDetail.info.venuePhotoAlt', {
                        venue: match.venueName,
                      })
                    : ''
                }
                className="absolute inset-0 size-full object-cover"
              />
              <div
                className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/20"
                aria-hidden
              />
            </>
          ) : null}

          <div className="relative flex w-full items-end justify-between gap-3">
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
                <span>{formatDate(match.scheduledAt)}</span>
              </div>

              {/* Time + duration */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4 shrink-0" aria-hidden />
                <span>
                  {formatTime(match.scheduledAt)} &middot;{' '}
                  {t('matchDetail.info.duration', { mins: match.durationMins })}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="size-4 shrink-0" aria-hidden />
                <span>
                  {t('matchDetail.info.price', {
                    price: match.pricePerPlayer,
                  })}
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

          {/* Waitlist — API gap placeholder */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t('matchDetail.waitlist.title')}
            </h2>
            <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{t('matchDetail.waitlist.apiGapNotice')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
