import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useReveal } from '../hooks/useReveal';

type Props = {
  displayName: string;
  appHomePath: string | null;
};

/**
 * Closing call-to-action band. Mirrors the hero CTAs at the bottom of the
 * page so visitors who scrolled all the way through have a clear next step.
 */
export function CtaBanner({ displayName, appHomePath }: Props) {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="landing-reveal relative isolate overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-primary/8 to-accent/12 p-10 text-center shadow-sm sm:p-14"
        >
          <div
            aria-hidden
            className="absolute -top-24 inset-s-[20%] h-64 w-64 rounded-full bg-primary/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 inset-e-[15%] h-72 w-72 rounded-full bg-accent/30 blur-3xl"
          />
          <div className="relative">
            <h2
              id="cta-heading"
              className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              {t('cta.heading')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              {t('cta.body', { name: displayName })}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {appHomePath ? (
                <Link
                  to={appHomePath}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'group h-12 px-6 text-base',
                  )}
                >
                  {t('header.openApp')}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                    aria-hidden
                  />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'group h-12 px-6 text-base',
                    )}
                  >
                    {t('cta.primary')}
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                      aria-hidden
                    />
                  </Link>
                  <Link
                    to="/login"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      'h-12 px-6 text-base',
                    )}
                  >
                    {t('cta.secondary')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
