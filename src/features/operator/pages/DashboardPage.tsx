import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, CalendarDays, DollarSign, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { unwrap } from '@/api';
import { formatCurrency } from '@/lib/format';
import { useTenantMatchesControllerList } from '@/api/generated/tenant-—-matches/tenant-—-matches';
import type { OperatorMatchItemDto } from '@/api/generated/models/operatorMatchItemDto';

// ── Period helpers ────────────────────────────────────────────────────────────

function getMonthBounds(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: first.toISOString().slice(0, 10),
    dateTo: last.toISOString().slice(0, 10),
  };
}

function formatPeriodLabel(
  dateFrom: string,
  dateTo: string,
  locale: string,
): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
}

// ── Stats derivation ─────────────────────────────────────────────────────────

interface DashboardStats {
  todayMatches: number;
  playersThisMonth: number;
  occupancyPct: number;
  revenue: number;
}

function deriveStats(items: OperatorMatchItemDto[]): DashboardStats {
  const todayStr = new Date().toDateString();
  const active = items.filter((m) => m.status !== 'cancelled');

  const todayMatches = active.filter(
    (m) => new Date(m.scheduledAt).toDateString() === todayStr,
  ).length;

  const playersThisMonth = active.reduce((sum, m) => sum + m.confirmedCount, 0);

  const totalCapacity = active.reduce((sum, m) => sum + m.maxCapacity, 0);
  const totalConfirmed = active.reduce((sum, m) => sum + m.confirmedCount, 0);
  const occupancyPct =
    totalCapacity > 0 ? Math.round((totalConfirmed / totalCapacity) * 100) : 0;

  const revenue = active.reduce(
    (sum, m) => sum + m.pricePerPlayer * m.confirmedCount,
    0,
  );

  return { todayMatches, playersThisMonth, occupancyPct, revenue };
}

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  loading?: boolean;
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-7 w-20 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t, i18n } = useTranslation('operator');
  const { dateFrom, dateTo } = useMemo(() => getMonthBounds(), []);

  const { data, isLoading, isError } = useTenantMatchesControllerList({
    dateFrom,
    dateTo,
    limit: 100,
  });

  const paginated = unwrap(data);
  const items = paginated?.items ?? [];

  const stats = useMemo(() => deriveStats(items), [items]);

  const periodLabel = useMemo(
    () => formatPeriodLabel(dateFrom, dateTo, i18n.language),
    [dateFrom, dateTo, i18n.language],
  );

  const statCards: StatCardProps[] = [
    {
      icon: CalendarDays,
      label: t('dashboard.stats.todayMatches'),
      value: isError ? '—' : String(stats.todayMatches),
    },
    {
      icon: Users,
      label: t('dashboard.stats.playersThisMonth'),
      value: isError ? '—' : String(stats.playersThisMonth),
    },
    {
      icon: Activity,
      label: t('dashboard.stats.matchOccupancy'),
      value: isError ? '—' : `${stats.occupancyPct}%`,
    },
    {
      icon: DollarSign,
      label: t('dashboard.stats.revenueThisMonth'),
      value: isError ? '—' : formatCurrency(stats.revenue),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold text-foreground">
          {t('dashboard.title')}
        </h1>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} loading={isLoading} />
        ))}
      </div>

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('dashboard.stats.noMatches')}
        </p>
      )}
    </div>
  );
}
