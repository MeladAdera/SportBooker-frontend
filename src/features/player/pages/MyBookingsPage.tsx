import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Coins,
  History,
  ListOrdered,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUsersControllerListMyBookings } from '@/api/generated/users/users';
import type { MyBookingItemDto } from '@/api/generated/models/myBookingItemDto';
import { MyBookingItemDtoStatus } from '@/api/generated/models/myBookingItemDtoStatus';
import { unwrap } from '@/api';

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type Tab = 'upcoming' | 'past' | 'waitlist' | 'cancelled';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

function formatMoney(amount: string): string {
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// ── Status badge ───────────────────────────────────────────────────────────────

type StatusBadgeProps = { status: MyBookingItemDto['status'] };

function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation('player');

  const variantMap: Record<
    MyBookingItemDto['status'],
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    confirmed: 'default',
    waitlisted: 'secondary',
    cancelled: 'destructive',
  };

  return (
    <Badge variant={variantMap[status]}>
      {t(`myBookings.status.${status}`)}
    </Badge>
  );
}

// ── Booking card ───────────────────────────────────────────────────────────────

type BookingCardProps = { booking: MyBookingItemDto };

function BookingCard({ booking }: BookingCardProps) {
  const { t } = useTranslation('player');
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="button"
      tabIndex={0}
      aria-label={booking.matchTitle}
      onClick={() => navigate(`/matches/${booking.matchId}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/matches/${booking.matchId}`);
        }
      }}
    >
      {/* Venue image banner */}
      <div className="relative h-32 w-full bg-muted">
        {booking.venuePictureUrl ? (
          <img
            src={booking.venuePictureUrl}
            alt={booking.venueName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="size-8 text-muted-foreground/40" aria-hidden />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <CardContent className="flex flex-col gap-3 p-4">
        {/* Title */}
        <h3 className="text-sm font-semibold leading-tight text-foreground">
          {booking.matchTitle}
        </h3>

        {/* Venue */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{booking.venueName}</span>
        </div>

        {/* Date & time */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            {formatDate(booking.matchScheduledAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            {formatTime(booking.matchScheduledAt)}
          </span>
        </div>

        {/* Paid amount */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Coins
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span>
            {t('myBookings.paid', { amount: formatMoney(booking.paidAmount) })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none" />
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

const EMPTY_ICONS: Record<Tab, React.ElementType> = {
  upcoming: Calendar,
  past: History,
  waitlist: ListOrdered,
  cancelled: XCircle,
};

function EmptyState({ tab }: { tab: Tab }) {
  const { t } = useTranslation('player');
  const Icon = EMPTY_ICONS[tab];

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
      <Icon className="size-10 opacity-40" aria-hidden />
      <p className="text-base font-medium">{t(`myBookings.empty.${tab}`)}</p>
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

// ── Tab bar ────────────────────────────────────────────────────────────────────

const TABS: Tab[] = ['upcoming', 'waitlist', 'past', 'cancelled'];

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const { t } = useTranslation('player');

  return (
    <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            active === tab
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(`myBookings.tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
}

// ── Tab content ────────────────────────────────────────────────────────────────

function tabToParams(tab: Tab): {
  upcoming?: boolean;
  status?: 'confirmed' | 'cancelled' | 'waitlisted';
} {
  if (tab === 'upcoming')
    return { status: MyBookingItemDtoStatus.confirmed, upcoming: true };
  if (tab === 'past')
    return { status: MyBookingItemDtoStatus.confirmed, upcoming: false };
  if (tab === 'waitlist') return { status: MyBookingItemDtoStatus.waitlisted };
  return { status: MyBookingItemDtoStatus.cancelled };
}

function isPast(booking: MyBookingItemDto): boolean {
  return new Date(booking.matchScheduledAt) < new Date();
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function MyBookingsPage() {
  const { t } = useTranslation('player');
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [page, setPage] = useState(1);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const { data, isLoading, isError } = useUsersControllerListMyBookings({
    page,
    limit: PAGE_SIZE,
    ...tabToParams(activeTab),
  });

  const bookingsData = unwrap(data);
  const rawItems = bookingsData?.items ?? [];
  // Backend may not filter `upcoming=false` as past-only — enforce client-side
  const bookings =
    activeTab === 'upcoming'
      ? rawItems.filter((b) => !isPast(b))
      : activeTab === 'past'
        ? rawItems.filter((b) => isPast(b))
        : rawItems;
  const total = bookingsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-xl font-semibold text-foreground">
        {t('myBookings.pageTitle')}
      </h1>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {isError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t('myBookings.error')}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
