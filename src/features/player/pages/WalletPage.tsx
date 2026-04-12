import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Gift,
  ChevronDown,
  PlusCircle,
  Receipt,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUsersControllerGetMyWallet } from '@/api/generated/users/users';
import type { WalletTransactionItemDto } from '@/api/generated/models/walletTransactionItemDto';
import { WalletTransactionItemDtoType } from '@/api/generated/models/walletTransactionItemDtoType';
import { TopUpModal } from '../components/TopUpModal';

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

type TxType = WalletTransactionItemDto['type'] | 'all';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatAmount(
  raw: string,
  type: WalletTransactionItemDto['type'],
): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  const sign = type === WalletTransactionItemDtoType.deduction ? '-' : '+';
  return `${sign}${formatCurrency(Math.abs(n))}`;
}

function isCredit(type: WalletTransactionItemDto['type']): boolean {
  return (
    type === WalletTransactionItemDtoType.refund ||
    type === WalletTransactionItemDtoType.topup ||
    type === WalletTransactionItemDtoType.credit
  );
}

// ── Type badge ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<WalletTransactionItemDto['type'], React.ElementType> =
  {
    deduction: ArrowDownLeft,
    refund: RotateCcw,
    topup: ArrowUpRight,
    credit: Gift,
  };

type TypeBadgeProps = { type: WalletTransactionItemDto['type'] };

function TypeBadge({ type }: TypeBadgeProps) {
  const { t } = useTranslation('player');
  const Icon = TYPE_ICONS[type];

  const cls = cn(
    'flex items-center gap-1 font-medium',
    type === WalletTransactionItemDtoType.deduction
      ? 'border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20'
      : type === WalletTransactionItemDtoType.refund
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'border-primary/30 bg-primary/10 text-primary',
  );

  return (
    <Badge variant="outline" className={cls}>
      <Icon className="size-3" aria-hidden />
      {t(`wallet.types.${type}`)}
    </Badge>
  );
}

// ── Transaction row ────────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: WalletTransactionItemDto }) {
  const credit = isCredit(tx.type);

  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-foreground">
          {tx.description}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={tx.type} />
          <span className="text-xs text-muted-foreground">
            {format(parseISO(tx.createdAt), 'dd MMM yyyy, HH:mm')}
          </span>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          credit
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-destructive',
        )}
      >
        {formatAmount(tx.amount, tx.type)}
      </span>
    </div>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────────

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

// ── Balance card ───────────────────────────────────────────────────────────────

function BalanceCard({
  balance,
  loading,
  onTopUp,
}: {
  balance: number;
  loading: boolean;
  onTopUp: () => void;
}) {
  const { t } = useTranslation('player');

  return (
    <Card className="overflow-hidden bg-linear-to-br from-primary/90 to-primary text-primary-foreground">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-sm font-medium opacity-80">
          <Wallet className="size-4" aria-hidden />
          {t('wallet.balanceLabel')}
        </div>

        {loading ? (
          <Skeleton className="h-10 w-40 bg-primary-foreground/20" />
        ) : (
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {formatCurrency(balance)}
          </p>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={onTopUp}
        >
          <PlusCircle className="size-4" aria-hidden />
          {t('wallet.topUp.submit')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Type filter dropdown ───────────────────────────────────────────────────────

const TX_TYPE_OPTIONS: TxType[] = [
  'all',
  WalletTransactionItemDtoType.deduction,
  WalletTransactionItemDtoType.refund,
  WalletTransactionItemDtoType.topup,
  WalletTransactionItemDtoType.credit,
];

function TypeFilter({
  value,
  onChange,
}: {
  value: TxType;
  onChange: (v: TxType) => void;
}) {
  const { t } = useTranslation('player');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            {t(`wallet.filter.${value}`)}
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as TxType)}
        >
          {TX_TYPE_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt} value={opt}>
              {t(`wallet.filter.${opt}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Date range filter ──────────────────────────────────────────────────────────

type DateRange = { from: string; to: string };

function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const { t } = useTranslation('player');

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="w-36"
        aria-label={t('wallet.filter.dateFrom')}
        placeholder={t('wallet.filter.dateFrom')}
      />
      <span className="text-xs text-muted-foreground">–</span>
      <Input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        className="w-36"
        aria-label={t('wallet.filter.dateTo')}
        placeholder={t('wallet.filter.dateTo')}
      />
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
  onChange: (p: number) => void;
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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
      <Receipt className="size-10 opacity-40" aria-hidden />
      <p className="text-base font-medium">{t('wallet.empty')}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function WalletPage() {
  const { t } = useTranslation('player');

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TxType>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [topUpOpen, setTopUpOpen] = useState(false);

  const { data, isLoading, isFetching, isError, refetch } =
    useUsersControllerGetMyWallet({ page, limit: PAGE_SIZE });

  const wallet = data?.status === 200 ? data.data.data : null;
  const allTransactions = wallet?.transactions ?? [];
  const total = wallet?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const balance = wallet?.balance ?? 0;

  // Client-side filters (type + date range) applied on top of the paginated results
  const filtered = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      if (dateRange.from || dateRange.to) {
        const txDate = parseISO(tx.createdAt);
        const from = dateRange.from
          ? startOfDay(parseISO(dateRange.from))
          : new Date(0);
        const to = dateRange.to
          ? endOfDay(parseISO(dateRange.to))
          : new Date(8640000000000000);
        if (!isWithinInterval(txDate, { start: from, end: to })) return false;
      }

      return true;
    });
  }, [allTransactions, typeFilter, dateRange]);

  const hasActiveFilters =
    typeFilter !== 'all' || dateRange.from !== '' || dateRange.to !== '';

  function handleClearFilters() {
    setTypeFilter('all');
    setDateRange({ from: '', to: '' });
  }

  function handleTopUp() {
    setTopUpOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">
          {t('wallet.pageTitle')}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label={t('wallet.refresh')}
        >
          <RefreshCw
            className={cn('size-4', isFetching && 'animate-spin')}
            aria-hidden
          />
        </Button>
      </div>

      <BalanceCard
        balance={balance}
        loading={isLoading}
        onTopUp={handleTopUp}
      />

      {isError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t('wallet.error')}
        </p>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <TypeFilter
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        />
        <DateRangeFilter
          value={dateRange}
          onChange={(v) => {
            setDateRange(v);
            setPage(1);
          }}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            {t('wallet.filter.clear')}
          </Button>
        )}
      </div>

      {/* ── Transaction list ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TransactionSkeleton key={i} />
            ))
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            filtered.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </CardContent>
      </Card>

      {!isLoading && !hasActiveFilters && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        currentBalance={balance}
      />
    </div>
  );
}
