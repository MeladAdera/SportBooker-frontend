import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from '@/shared/components/LocaleSwitcher';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

import { BrandLogo } from './BrandLogo';

type Props = {
  displayName: string;
  logoUrl: string | null;
  /** Path the "Open app" button navigates to when the visitor is signed in. */
  appHomePath: string | null;
};

/**
 * Sticky landing header. Transparent over the hero, transitions to a frosted
 * blur once the page scrolls past ~24px. CTAs collapse to a single
 * "Open app" button when the visitor already has an active session.
 */
export function LandingHeader({ displayName, logoUrl, appHomePath }: Props) {
  const { t } = useTranslation('tenant-public');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled
          ? 'border-b border-border/60 bg-background/75 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={displayName}
        >
          <BrandLogo
            name={displayName}
            logoUrl={logoUrl}
            className="h-9 w-9 transition-transform group-hover:scale-105"
            rounded="rounded-xl"
          />
          <span className="hidden text-base font-semibold tracking-tight text-foreground sm:inline">
            {displayName}
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher className="h-9 w-9" />
          <ThemeToggle className="h-9 w-9" />

          {appHomePath ? (
            <Link
              to={appHomePath}
              className={cn(buttonVariants({ size: 'lg' }), 'ms-1 h-10 px-4')}
            >
              {t('header.openApp')}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'lg' }),
                  'hidden h-10 px-3 sm:inline-flex',
                )}
              >
                {t('header.signIn')}
              </Link>
              <Link
                to="/register"
                className={cn(buttonVariants({ size: 'lg' }), 'ms-1 h-10 px-4')}
              >
                {t('header.createAccount')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
