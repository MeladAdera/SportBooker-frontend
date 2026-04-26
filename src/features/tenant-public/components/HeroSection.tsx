import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BrandLogo } from './BrandLogo';

type Props = {
  displayName: string;
  logoUrl: string | null;
  appHomePath: string | null;
};

/**
 * Full-bleed hero. Animated mesh-gradient background with three drifting
 * radial blobs (defined in `src/index.css`), tenant brand mark in a frosted
 * card, eyebrow tag, display headline + accent split, subheadline, dual CTAs,
 * and a scroll cue at the bottom.
 *
 * Uses `min-h-svh` (small viewport height) to avoid mobile address-bar
 * jank; `id="top"` lets the scroll cue link target it.
 */
export function HeroSection({ displayName, logoUrl, appHomePath }: Props) {
  const { t } = useTranslation('tenant-public');

  const ctaBase = 'h-12 px-6 text-base';

  return (
    <section
      id="top"
      className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:px-8"
    >
      <div className="landing-mesh" aria-hidden>
        <div className="landing-mesh-blob" />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] bg-size-[24px_24px] opacity-40 mask-[radial-gradient(ellipse_at_center,black_50%,transparent_85%)] dark:opacity-30"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-7 inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-2.5 shadow-sm backdrop-blur-md">
          <BrandLogo
            name={displayName}
            logoUrl={logoUrl}
            className="h-12 w-12"
            rounded="rounded-xl"
          />
          <div className="pe-3 text-start">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" aria-hidden />
                {t('hero.eyebrow', { name: displayName })}
              </span>
            </p>
            <p className="text-sm font-semibold text-foreground">
              {displayName}
            </p>
          </div>
        </div>

        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="block">{t('hero.headline')}</span>
          <span className="mt-1 block bg-linear-to-br from-primary via-primary to-accent bg-clip-text text-transparent">
            {t('hero.headlineAccent')}
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl">
          {t('hero.subheadline')}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-3">
          {appHomePath ? (
            <Link
              to={appHomePath}
              className={cn(buttonVariants({ size: 'lg' }), ctaBase, 'group')}
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
                className={cn(buttonVariants({ size: 'lg' }), ctaBase, 'group')}
              >
                {t('hero.primaryCta')}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  aria-hidden
                />
              </Link>
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  ctaBase,
                )}
              >
                {t('hero.secondaryCta')}
              </Link>
            </>
          )}
        </div>
      </div>

      <a
        href="#what-is-on"
        className="landing-scroll-cue absolute bottom-8 inline-flex flex-col items-center gap-1 text-xs text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        aria-label={t('hero.scrollCue')}
      >
        <span className="hidden sm:inline">{t('hero.scrollCue')}</span>
        <ChevronDown className="h-5 w-5" aria-hidden />
      </a>
    </section>
  );
}
