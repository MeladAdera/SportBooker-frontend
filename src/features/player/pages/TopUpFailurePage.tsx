import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function TopUpFailurePage() {
  const { t } = useTranslation('player');
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-10 text-destructive" aria-hidden />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">
          {t('wallet.topUp.failure.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('wallet.topUp.failure.subtitle')}
        </p>
      </div>

      <Button onClick={() => navigate('/wallet')}>
        {t('wallet.topUp.failure.tryAgain')}
      </Button>
    </div>
  );
}
