import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Shield, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useBookingsControllerCreateBooking } from '@/api/generated/bookings/bookings';
import { BookingPosition } from '@/api/generated/models/bookingPosition';
import { CreateBookingResponseDtoStatus } from '@/api/generated/models/createBookingResponseDtoStatus';
import type { CreateBookingResponseDto } from '@/api/generated/models/createBookingResponseDto';
import type { MatchDetailResponseDto } from '@/api/generated/models/matchDetailResponseDto';
import { getMatchesControllerGetByIdQueryKey } from '@/api/generated/matches/matches';
import {
  getUsersControllerListMyBookingsQueryKey,
  getUsersControllerGetMyWalletQueryKey,
  useUsersControllerGetMyWallet,
} from '@/api/generated/users/users';
import { unwrap, ApiError } from '@/api';
import { MAX_GK } from '@/features/player/constants';
import { TopUpModal } from './TopUpModal';

// ── Position selector ─────────────────────────────────────────────────────────

type PositionSelectorProps = {
  value: BookingPosition;
  onChange: (v: BookingPosition) => void;
  gkCount: number;
};

function PositionSelector({ value, onChange, gkCount }: PositionSelectorProps) {
  const { t } = useTranslation('player');
  const gkFull = gkCount >= MAX_GK;

  const options: {
    position: BookingPosition;
    labelKey: string;
    icon: React.ElementType;
  }[] = [
    {
      position: BookingPosition.field_player,
      labelKey: 'booking.position.fieldPlayer',
      icon: User,
    },
    {
      position: BookingPosition.goalkeeper,
      labelKey: 'booking.position.goalkeeper',
      icon: Shield,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">
        {t('booking.position.label')}
      </span>
      <div
        role="radiogroup"
        aria-label={t('booking.position.label')}
        className="flex gap-2"
      >
        {options.map(({ position, labelKey, icon: Icon }) => {
          const isGk = position === BookingPosition.goalkeeper;
          const disabled = isGk && gkFull;
          const selected = value === position;

          return (
            <button
              key={position}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => !disabled && onChange(position)}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-input bg-transparent text-foreground hover:bg-muted/50',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex flex-col items-start">
                <span>{t(labelKey)}</span>
                {disabled && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {t('booking.position.gkFull')}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────

type SuccessScreenProps = {
  booking: CreateBookingResponseDto;
  walletBalance: number | null | undefined;
  onClose: () => void;
};

function SuccessScreen({
  booking,
  walletBalance,
  onClose,
}: SuccessScreenProps) {
  const { t } = useTranslation('player');
  const isWaitlist = booking.status === CreateBookingResponseDtoStatus.pending;
  const paidAmount = parseFloat(booking.paidAmount);
  const optimisticBalance =
    walletBalance != null && !isNaN(paidAmount)
      ? walletBalance - paidAmount
      : null;

  if (isWaitlist) {
    const waitlistPosition =
      (booking.waitlistPosition as number | null) ?? null;
    const waitlistNotice =
      (booking.waitlistNotice as string | null) ??
      t('booking.waitlist.refundPromise');

    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <Clock
            className="size-7 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-foreground">
            {waitlistPosition
              ? t('booking.waitlist.title', { position: waitlistPosition })
              : t('booking.waitlist.titleNoPosition')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('booking.waitlist.charged', {
              amount: formatCurrency(paidAmount),
            })}
          </p>
        </div>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          {waitlistNotice}
        </p>
        {optimisticBalance != null && (
          <p className="text-xs text-muted-foreground">
            {t('booking.waitlist.estimatedBalance', {
              balance: formatCurrency(optimisticBalance),
            })}
          </p>
        )}
        <NavLink to="/bookings" onClick={onClose} className="w-full">
          <Button className="w-full" variant="outline">
            {t('booking.waitlist.viewBookings')}
          </Button>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2
          className="size-7 text-green-600 dark:text-green-400"
          aria-hidden
        />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">
          {t('booking.success.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('booking.success.charged', { amount: formatCurrency(paidAmount) })}
        </p>
      </div>
      {optimisticBalance != null && (
        <p className="text-xs text-muted-foreground">
          {t('booking.success.estimatedBalance', {
            balance: formatCurrency(optimisticBalance),
          })}
        </p>
      )}
      <NavLink to="/bookings" onClick={onClose} className="w-full">
        <Button className="w-full">{t('booking.success.viewBookings')}</Button>
      </NavLink>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

type Step = 'form' | 'confirmed' | 'waitlist';

type BookingModalProps = {
  match: MatchDetailResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isInsufficientFundsError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.statusCode === 422 &&
    err.message.toLowerCase().includes('insufficient wallet balance')
  );
}

export function BookingModal({ match, open, onOpenChange }: BookingModalProps) {
  const { t } = useTranslation('player');
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>('form');
  const [position, setPosition] = useState<BookingPosition>(
    BookingPosition.field_player,
  );
  const [result, setResult] = useState<CreateBookingResponseDto | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const { data: walletData } = useUsersControllerGetMyWallet(undefined);
  const walletBalance = unwrap(walletData)?.balance ?? null;

  const insufficientFunds =
    walletBalance != null && walletBalance < match.pricePerPlayer;

  const gkCount = match.roster.filter(
    (p) => p.position === BookingPosition.goalkeeper,
  ).length;

  const createBooking = useBookingsControllerCreateBooking({
    mutation: {
      onSuccess: (res) => {
        const booking = unwrap(res);
        if (!booking) return;
        setResult(booking);
        setStep(
          booking.status === CreateBookingResponseDtoStatus.confirmed
            ? 'confirmed'
            : 'waitlist',
        );
        void qc.invalidateQueries({
          queryKey: getMatchesControllerGetByIdQueryKey(match.id),
        });
        void qc.invalidateQueries({
          queryKey: getUsersControllerListMyBookingsQueryKey(),
        });
        void qc.invalidateQueries({
          queryKey: getUsersControllerGetMyWalletQueryKey(),
        });
      },
    },
  });

  const serverInsufficientFunds = isInsufficientFundsError(createBooking.error);
  const showInsufficientFunds = insufficientFunds || serverInsufficientFunds;
  const showGenericError = createBooking.isError && !serverInsufficientFunds;

  function handleClose() {
    if (createBooking.isPending) return;
    onOpenChange(false);
    setTimeout(() => {
      setStep('form');
      setPosition(BookingPosition.field_player);
      setResult(null);
      createBooking.reset();
    }, 150);
  }

  function handleConfirm() {
    createBooking.mutate({ matchId: match.id, data: { position } });
  }

  const isSuccessStep = step === 'confirmed' || step === 'waitlist';

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent showCloseButton={!createBooking.isPending}>
          {isSuccessStep && result ? (
            <SuccessScreen
              booking={result}
              walletBalance={walletBalance}
              onClose={handleClose}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('booking.title')}</DialogTitle>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {match.title}
                </p>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                {/* Position selector */}
                <PositionSelector
                  value={position}
                  onChange={setPosition}
                  gkCount={gkCount}
                />

                {/* GK availability */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="size-4 shrink-0" aria-hidden />
                  <span>
                    {t('booking.gkAvailability', {
                      taken: gkCount,
                      max: MAX_GK,
                    })}
                  </span>
                </div>

                {/* Price + wallet */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t('matchDetail.info.perPlayer').replace('/ ', '')}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {t('booking.price', { price: match.pricePerPlayer })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t('booking.walletBalanceLabel')}
                    </span>
                    <span
                      className={cn(
                        'tabular-nums',
                        showInsufficientFunds
                          ? 'font-medium text-destructive'
                          : 'text-foreground',
                      )}
                    >
                      {walletBalance != null
                        ? t('booking.walletBalance', {
                            balance: formatCurrency(walletBalance),
                          })
                        : t('booking.walletBalanceUnknown')}
                    </span>
                  </div>
                </div>

                {/* Insufficient funds warning */}
                {showInsufficientFunds && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                    <AlertTriangle
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden
                    />
                    <span className="flex-1">
                      {t('booking.insufficientFunds')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTopUpOpen(true)}
                      className="shrink-0 font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none"
                    >
                      {t('booking.insufficientFundsAction')}
                    </button>
                  </div>
                )}

                {/* API error */}
                {showGenericError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
                  >
                    {t('booking.error')}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={createBooking.isPending}
                >
                  {t('booking.cancel')}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={createBooking.isPending || showInsufficientFunds}
                >
                  {createBooking.isPending
                    ? t('booking.confirming')
                    : t('booking.confirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        currentBalance={walletBalance ?? 0}
      />
    </>
  );
}
