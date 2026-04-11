import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Coins,
  Dumbbell,
  ExternalLink,
  MapPin,
  Shield,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMatchesControllerGetById } from '@/api/generated/matches/matches';
import { useUsersControllerListMyBookings } from '@/api/generated/users/users';
import { useBookingsControllerCancelMyBooking } from '@/api/generated/bookings/bookings';
import { BookingPosition } from '@/api/generated/models/bookingPosition';
import { MatchDetailResponseDtoStatus } from '@/api/generated/models/matchDetailResponseDtoStatus';
import type { MatchDetailResponseDto } from '@/api/generated/models/matchDetailResponseDto';
import type { MyBookingItemDto } from '@/api/generated/models/myBookingItemDto';
import { useQueryClient } from '@tanstack/react-query';
import { getMatchesControllerGetByIdQueryKey } from '@/api/generated/matches/matches';
import { getUsersControllerListMyBookingsQueryKey } from '@/api/generated/users/users';
import { BookingModal } from '@/features/player/components/BookingModal';
import { MAX_GK } from '@/features/player/constants';
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

function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Backend may send venueAddress or address */
function venueAddressText(match: MatchDetailResponseDto): string | null {
  const a = match.venueAddress ?? match.address;
  if (a == null) return null;
  const s = typeof a === 'string' ? a.trim() : '';
  return s.length > 0 ? s : null;
}

const SPORT_ICONS: Record<string, React.ElementType> = {
  football: Shield,
  padel: Shield,
  cricket: Shield,
  generic: Dumbbell,
};

// ── Capacity bar ──────────────────────────────────────────────────────────────

function CapacityBar({ confirmed, max }: { confirmed: number; max: number }) {
  const { t } = useTranslation('player');
  const pct = max > 0 ? Math.min((confirmed / max) * 100, 100) : 0;
  const isFull = confirmed >= max;

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
    </div>
  );
}

// ── GK slots indicator ────────────────────────────────────────────────────────

function GkSlots({ roster }: { roster: MatchDetailResponseDto['roster'] }) {
  const { t } = useTranslation('player');
  const gkCount = roster.filter(
    (p) => p.position === BookingPosition.goalkeeper,
  ).length;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Shield className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">
        {t('matchDetail.gkSlots.label')}
      </span>
      <span
        className={cn(
          'font-medium tabular-nums',
          gkCount >= MAX_GK ? 'text-destructive' : 'text-foreground',
        )}
      >
        {gkCount} / {MAX_GK}
      </span>
    </div>
  );
}

// ── Roster list ───────────────────────────────────────────────────────────────

function RosterList({ roster }: { roster: MatchDetailResponseDto['roster'] }) {
  const { t } = useTranslation('player');

  if (roster.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('matchDetail.roster.empty')}
      </p>
    );
  }

  return (
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
  );
}

// ── Booking CTA ───────────────────────────────────────────────────────────────

type BookingCtaProps = {
  match: MatchDetailResponseDto;
  myBooking: MyBookingItemDto | undefined;
  myBookingId: string | undefined;
  onBook: () => void;
};

function BookingCta({
  match,
  myBooking,
  myBookingId,
  onBook,
}: BookingCtaProps) {
  const { t } = useTranslation('player');
  const qc = useQueryClient();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: getMatchesControllerGetByIdQueryKey(match.id),
    });
    void qc.invalidateQueries({
      queryKey: getUsersControllerListMyBookingsQueryKey(),
    });
  };

  const cancelBooking = useBookingsControllerCancelMyBooking({
    mutation: {
      onSuccess: () => {
        setCancelError(null);
        invalidate();
      },
      onError: () => setCancelError(t('matchDetail.cta.cancelError')),
    },
  });

  const matchInPast = isPast(match.scheduledAt);
  const matchCancelled =
    match.status === MatchDetailResponseDtoStatus.cancelled;

  if (matchCancelled) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        {t('matchDetail.cta.cancelled')}
      </div>
    );
  }

  if (matchInPast) {
    return null;
  }

  if (myBooking?.status === 'confirmed') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white hover:bg-green-700">
            {t('matchDetail.cta.alreadyBooked')}
          </Badge>
        </div>
        {cancelError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          >
            {cancelError}
          </p>
        )}
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={cancelBooking.isPending}
          onClick={() => {
            if (myBookingId) {
              cancelBooking.mutate({
                matchId: match.id,
                bookingId: myBookingId,
              });
            }
          }}
        >
          {cancelBooking.isPending
            ? t('matchDetail.cta.cancelling')
            : t('matchDetail.cta.cancelBooking')}
        </Button>
      </div>
    );
  }

  if (myBooking?.status === 'waitlisted') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t('matchDetail.cta.onWaitlist')}</Badge>
        </div>
        {cancelError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          >
            {cancelError}
          </p>
        )}
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={cancelBooking.isPending}
          onClick={() => {
            if (myBookingId) {
              cancelBooking.mutate({
                matchId: match.id,
                bookingId: myBookingId,
              });
            }
          }}
        >
          {cancelBooking.isPending
            ? t('matchDetail.cta.cancelling')
            : t('matchDetail.cta.leaveWaitlist')}
        </Button>
      </div>
    );
  }

  if (match.spotsRemaining === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium">
            {t('matchDetail.cta.waitlistNotice.title')}
          </p>
          <p className="mt-1">{t('matchDetail.cta.waitlistNotice.body')}</p>
        </div>
        <Button className="w-full" onClick={onBook}>
          {t('matchDetail.cta.joinWaitlist')}
        </Button>
      </div>
    );
  }

  return (
    <Button className="w-full" onClick={onBook}>
      {t('matchDetail.cta.bookNow')}
    </Button>
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
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MatchDetailPage() {
  const { t } = useTranslation('player');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const {
    data: matchData,
    isLoading: matchLoading,
    isError: matchError,
  } = useMatchesControllerGetById(id ?? '', { query: { enabled: !!id } });

  const { data: bookingsData, isLoading: bookingsLoading } =
    useUsersControllerListMyBookings(
      { upcoming: true, limit: 100 },
      { query: { enabled: !!id } },
    );

  const match = matchData?.status === 200 ? matchData.data.data : undefined;

  const venueAddressLine = match ? venueAddressText(match) : null;

  const myBookings =
    bookingsData?.status === 200 ? bookingsData.data.data.items : [];

  // MyBookingItemDto has no matchId — confirmed status is derived from the roster
  // (which only includes confirmed players); waitlist is matched by title since the
  // backend doesn't expose matchId on booking list items yet. TODO: request matchId
  // from backend to make this exact.
  const isConfirmedInRoster =
    !!currentUserId && !!match?.roster.some((p) => p.userId === currentUserId);

  const myWaitlistBooking = match
    ? myBookings.find(
        (b) => b.matchTitle === match.title && b.status === 'waitlisted',
      )
    : undefined;

  const myBookingForThisMatch: MyBookingItemDto | undefined =
    isConfirmedInRoster
      ? (myBookings.find(
          (b) => b.matchTitle === match!.title && b.status === 'confirmed',
        ) ?? ({ status: 'confirmed' } as MyBookingItemDto))
      : myWaitlistBooking;

  // We need the booking ID for cancellation — MyBookingItemDto has `id`
  const myBookingId = myBookingForThisMatch?.id;

  const confirmedCount = match ? match.maxCapacity - match.spotsRemaining : 0;

  const SportIcon = match
    ? (SPORT_ICONS[match.sportType] ?? Dumbbell)
    : Dumbbell;

  if (matchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{t('matchDetail.error.notFound')}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('matchDetail.error.goBack')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      {matchLoading ? (
        <HeroSkeleton />
      ) : (
        <div
          className={cn(
            'relative flex h-48 items-end overflow-hidden px-4 pb-4 md:mx-6 md:mt-6 md:rounded-xl md:px-6',
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
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <SportIcon className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {match &&
                  t(`discover.sports.${match.sportType}`, {
                    defaultValue: match.sportType,
                  })}
              </p>
              <h1 className="text-xl font-bold text-foreground">
                {match?.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────── */}
      {matchLoading || bookingsLoading ? (
        <DetailSkeleton />
      ) : !match ? null : (
        <div className="flex flex-col gap-6 p-4 md:p-6">
          {/* Match info */}
          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              <div className="flex gap-2.5 text-sm">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="font-medium text-foreground">
                    {match.venueName ?? match.venueId}
                  </span>
                  {venueAddressLine ? (
                    <>
                      <p className="whitespace-pre-wrap leading-snug text-muted-foreground">
                        {venueAddressLine}
                      </p>
                      <a
                        href={googleMapsSearchUrl(venueAddressLine)}
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4 shrink-0" aria-hidden />
                <span>{formatDate(match.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4 shrink-0" aria-hidden />
                <span>
                  {formatTime(match.scheduledAt)} &middot; {match.durationMins}{' '}
                  {t('matchDetail.info.mins')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="size-4 shrink-0" aria-hidden />
                <span>
                  {match.pricePerPlayer} {t('matchDetail.info.perPlayer')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Capacity + GK */}
          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              <CapacityBar confirmed={confirmedCount} max={match.maxCapacity} />
              <GkSlots roster={match.roster} />
            </CardContent>
          </Card>

          {/* Booking CTA */}
          <BookingCta
            match={match}
            myBooking={myBookingForThisMatch}
            myBookingId={myBookingId}
            onBook={() => setBookingOpen(true)}
          />

          <BookingModal
            match={match}
            open={bookingOpen}
            onOpenChange={setBookingOpen}
          />

          {/* Roster */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t('matchDetail.roster.title')} ({match.roster.length})
            </h2>
            <Card>
              <CardContent className="pt-2 pb-2">
                <RosterList roster={match.roster} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
