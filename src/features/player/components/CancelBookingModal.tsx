import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBookingsControllerCancelMyBooking } from '@/api/generated/bookings/bookings';
import { getMatchesControllerGetByIdQueryKey } from '@/api/generated/matches/matches';
import { getUsersControllerListMyBookingsQueryKey } from '@/api/generated/users/users';
import type { MyBookingItemDto } from '@/api/generated/models/myBookingItemDto';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isCutoffError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status === 422;
  }
  return false;
}

// ── Success screen ────────────────────────────────────────────────────────────

type SuccessScreenProps = {
  wasConfirmed: boolean;
  paidAmount: number;
  onClose: () => void;
};

function SuccessScreen({
  wasConfirmed,
  paidAmount,
  onClose,
}: SuccessScreenProps) {
  const { t } = useTranslation('player');

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
          {t('cancelBooking.success.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {wasConfirmed
            ? t('cancelBooking.success.noRefund')
            : t('cancelBooking.success.refunded', {
                amount: formatMoney(paidAmount),
              })}
        </p>
      </div>
      <Button className="w-full" onClick={onClose}>
        {t('cancelBooking.success.close')}
      </Button>
    </div>
  );
}

// ── Confirm screen — confirmed booking ────────────────────────────────────────

type ConfirmedCancelProps = {
  paidAmount: number;
  isPending: boolean;
  errorMsg: string | null;
  onConfirm: () => void;
  onGoBack: () => void;
};

function ConfirmedCancelBody({
  paidAmount,
  isPending,
  errorMsg,
  onConfirm,
  onGoBack,
}: ConfirmedCancelProps) {
  const { t } = useTranslation('player');

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('cancelBooking.confirmed.title')}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        {/* No-refund warning banner */}
        <div className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="text-sm font-semibold text-destructive">
              {t('cancelBooking.confirmed.noRefundHeading')}
            </p>
          </div>
          <p className="ps-6 text-xs text-destructive/80">
            {t('cancelBooking.confirmed.noRefundBody')}
          </p>
        </div>

        {/* Forfeit amount */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">
            {t('cancelBooking.confirmed.forfeitLabel')}
          </span>
          <span className="font-semibold tabular-nums text-destructive">
            {formatMoney(paidAmount)}
          </span>
        </div>

        {/* API error */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          >
            <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {errorMsg}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onGoBack} disabled={isPending}>
          {t('cancelBooking.goBack')}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
          {isPending
            ? t('matchDetail.cta.cancelling')
            : t('cancelBooking.confirmed.confirmBtn')}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Confirm screen — waitlist booking ─────────────────────────────────────────

type WaitlistCancelProps = {
  paidAmount: number;
  isPending: boolean;
  errorMsg: string | null;
  onConfirm: () => void;
  onGoBack: () => void;
};

function WaitlistCancelBody({
  paidAmount,
  isPending,
  errorMsg,
  onConfirm,
  onGoBack,
}: WaitlistCancelProps) {
  const { t } = useTranslation('player');

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('cancelBooking.waitlist.title')}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        {/* Refund notice */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {t('cancelBooking.waitlist.refundNotice', {
            amount: formatMoney(paidAmount),
          })}
        </div>

        {/* API error */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          >
            <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {errorMsg}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onGoBack} disabled={isPending}>
          {t('cancelBooking.goBack')}
        </Button>
        <Button onClick={onConfirm} disabled={isPending}>
          {isPending
            ? t('matchDetail.cta.cancelling')
            : t('cancelBooking.waitlist.confirmBtn')}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

type Step = 'confirm' | 'success';

type CancelBookingModalProps = {
  matchId: string;
  myBooking: MyBookingItemDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelBookingModal({
  matchId,
  myBooking,
  open,
  onOpenChange,
}: CancelBookingModalProps) {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>('confirm');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConfirmed = myBooking.status === 'confirmed';
  const paidAmount = parseFloat(myBooking.paidAmount ?? '0');

  const cancelBooking = useBookingsControllerCancelMyBooking({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getMatchesControllerGetByIdQueryKey(matchId),
        });
        void qc.invalidateQueries({
          queryKey: getUsersControllerListMyBookingsQueryKey(),
        });
        setErrorMsg(null);
        setStep('success');
      },
      onError: (error) => {
        setErrorMsg(
          isCutoffError(error)
            ? t('cancelBooking.error.cutoffWindow')
            : t('cancelBooking.error.generic'),
        );
      },
    },
  });

  function handleConfirm() {
    if (!myBooking.id) return;
    setErrorMsg(null);
    cancelBooking.mutate({ matchId, bookingId: myBooking.id });
  }

  function handleClose() {
    if (cancelBooking.isPending) return;
    onOpenChange(false);
    // Reset after animation settles
    setTimeout(() => {
      setStep('confirm');
      setErrorMsg(null);
      cancelBooking.reset();
    }, 150);
  }

  function handleSuccessClose() {
    onOpenChange(false);
    navigate('/bookings');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        showCloseButton={!cancelBooking.isPending && step !== 'success'}
      >
        {step === 'success' ? (
          <SuccessScreen
            wasConfirmed={isConfirmed}
            paidAmount={paidAmount}
            onClose={handleSuccessClose}
          />
        ) : isConfirmed ? (
          <ConfirmedCancelBody
            paidAmount={paidAmount}
            isPending={cancelBooking.isPending}
            errorMsg={errorMsg}
            onConfirm={handleConfirm}
            onGoBack={handleClose}
          />
        ) : (
          <WaitlistCancelBody
            paidAmount={paidAmount}
            isPending={cancelBooking.isPending}
            errorMsg={errorMsg}
            onConfirm={handleConfirm}
            onGoBack={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
