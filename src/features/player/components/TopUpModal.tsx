import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePaymentsControllerCreateTopup } from '@/api/generated/payments/payments';
import { unwrap, ApiError } from '@/api';

const topUpSchema = z.object({
  amount: z.coerce
    .number({ error: 'wallet.topUp.min' })
    .min(10, 'wallet.topUp.min')
    .max(5000, 'wallet.topUp.max')
    .refine((v) => Math.round(v * 100) === v * 100, 'wallet.topUp.amountLabel'),
});

type TopUpFormValues = z.infer<typeof topUpSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
};

export function TopUpModal({ open, onOpenChange, currentBalance }: Props) {
  const { t } = useTranslation('player');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopUpFormValues>({
    resolver: zodResolver(topUpSchema),
  });

  const mutation = usePaymentsControllerCreateTopup();

  function getErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.statusCode === 422)
        return t('wallet.topUp.error.ziinaNotConfigured');
      if (err.statusCode === 429) return t('wallet.topUp.error.rateLimit');
    }
    return t('wallet.topUp.error.generic');
  }

  function handleClose() {
    if (mutation.isPending) return;
    onOpenChange(false);
    setTimeout(() => {
      reset();
      mutation.reset();
    }, 150);
  }

  function onSubmit(values: TopUpFormValues) {
    mutation.mutate(
      { data: { amount: values.amount } },
      {
        onSuccess: (res) => {
          const data = unwrap(res);
          if (!data) return;
          sessionStorage.setItem(
            'topup_session',
            JSON.stringify({
              paymentIntentId: data.paymentIntentId,
              previousBalance: currentBalance,
            }),
          );
          window.location.href = data.redirectUrl;
        },
      },
    );
  }

  const amountError = errors.amount?.message
    ? t(errors.amount.message as string)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{t('wallet.topUp.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="topup-amount"
              className="text-sm font-medium text-foreground"
            >
              {t('wallet.topUp.amountLabel')}
            </label>
            <Input
              id="topup-amount"
              type="number"
              step="0.01"
              min={10}
              max={5000}
              placeholder={t('wallet.topUp.amountPlaceholder')}
              autoComplete="off"
              {...register('amount')}
            />
            {amountError && (
              <p className="text-xs text-destructive">{amountError}</p>
            )}
          </div>

          {mutation.isError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
            >
              {getErrorMessage(mutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              {t('booking.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  {t('wallet.topUp.submitting')}
                </>
              ) : (
                t('wallet.topUp.submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
