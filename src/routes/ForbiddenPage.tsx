import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';
import { getRoleHomePath } from '@/features/auth/utils';
import { cn } from '@/lib/utils';
import { PageControls } from '@/shared/components/PageControls';
import { useAuthStore } from '@/stores/authStore';

export function ForbiddenPage() {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const safePath = user?.role ? getRoleHomePath(user.role) : '/login';

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-6xl font-bold text-muted-foreground">403</p>
          <h1 className="text-xl font-semibold text-foreground">
            {t('forbidden.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('forbidden.description')}
          </p>
          <Link
            to={safePath}
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'mt-2 inline-flex',
            )}
          >
            {t('forbidden.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
