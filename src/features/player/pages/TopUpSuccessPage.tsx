import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useUsersControllerGetMyWallet } from '@/api/generated/users/users';
import { formatCurrency } from '@/lib/format';

const MAX_POLL_ATTEMPTS = 6;

function readPreviousBalance(): number | null {
  try {
    const raw = sessionStorage.getItem('topup_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { previousBalance?: number };
    return typeof parsed.previousBalance === 'number'
      ? parsed.previousBalance
      : null;
  } catch {
    return null;
  }
}

export function TopUpSuccessPage() {
  const { t } = useTranslation('player');
  const navigate = useNavigate();

  const [previousBalance] = useState<number | null>(() => {
    const balance = readPreviousBalance();
    sessionStorage.removeItem('topup_session');
    return balance;
  });

  // Poll window: MAX_POLL_ATTEMPTS × 1.5 s, fixed at mount
  const [pollDeadline] = useState(() => Date.now() + MAX_POLL_ATTEMPTS * 1500);

  const { data } = useUsersControllerGetMyWallet(
    { page: 1, limit: 1 },
    {
      query: {
        refetchInterval: (query) => {
          const balance =
            (
              query.state.data as
                | { status: number; data: { data: { balance: number } } }
                | undefined
            )?.data?.data?.balance ?? null;
          const increased =
            previousBalance !== null &&
            balance !== null &&
            balance > previousBalance;
          if (increased || Date.now() >= pollDeadline) return false;
          return 1500;
        },
      },
    },
  );

  const currentBalance = data?.status === 200 ? data.data.data.balance : null;

  const balanceUpdated =
    previousBalance !== null &&
    currentBalance !== null &&
    currentBalance > previousBalance;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2
          className="size-10 text-green-600 dark:text-green-400"
          aria-hidden
        />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">
          {t('wallet.topUp.success.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('wallet.topUp.success.subtitle')}
        </p>
      </div>

      {currentBalance === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('wallet.topUp.success.subtitle')}
        </div>
      )}

      {currentBalance !== null && balanceUpdated && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400">
          {t('wallet.topUp.success.balanceUpdated', {
            balance: formatCurrency(currentBalance),
          })}
        </p>
      )}

      <Button onClick={() => navigate('/wallet')}>
        {t('wallet.topUp.success.backToWallet')}
      </Button>
    </div>
  );
}
