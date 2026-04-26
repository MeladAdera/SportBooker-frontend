import { Activity, Goal, ShieldCheck, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { useReveal } from '../hooks/useReveal';

type SportKey = 'football' | 'padel' | 'cricket' | 'generic';

type Sport = {
  key: SportKey;
  icon: LucideIcon;
  /** Tailwind gradient classes for the icon tile + soft card glow. */
  tint: string;
};

/**
 * The four sport buckets the API supports today (see `MatchBrowseItemDto.sportType`).
 * Icons stay monochrome on the card surface; the tint is reserved for the icon
 * tile + a subtle ring glow on hover.
 */
const SPORTS: Sport[] = [
  {
    key: 'football',
    icon: Goal,
    tint: 'from-primary/20 to-primary/5 text-primary',
  },
  {
    key: 'padel',
    icon: Activity,
    tint: 'from-accent/25 to-accent/5 text-accent',
  },
  {
    key: 'cricket',
    icon: Trophy,
    tint: 'from-chart-4/20 to-chart-4/5 text-chart-4',
  },
  {
    key: 'generic',
    icon: ShieldCheck,
    tint: 'from-chart-3/20 to-chart-3/5 text-chart-3',
  },
];

export function SportsSection() {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      id="what-is-on"
      className="relative py-24 sm:py-28"
      aria-labelledby="sports-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t('sports.eyebrow')}
          </p>
          <h2
            id="sports-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {t('sports.heading')}
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
            {t('sports.subheading')}
          </p>
        </div>

        <ul
          role="list"
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {SPORTS.map((sport) => {
            const Icon = sport.icon;
            return (
              <li key={sport.key}>
                <article
                  className={cn(
                    'group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-6',
                    'shadow-sm transition-all duration-300',
                    'hover:-translate-y-1 hover:border-primary/30 hover:shadow-md',
                  )}
                >
                  <div
                    aria-hidden
                    className={cn(
                      'absolute -inset-x-8 -top-16 h-32 bg-linear-to-b opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100',
                      sport.tint,
                    )}
                  />
                  <div
                    className={cn(
                      'relative flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ring-1 ring-foreground/5',
                      sport.tint,
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="relative mt-5 text-lg font-semibold text-foreground">
                    {t(`sports.items.${sport.key}.title`)}
                  </h3>
                  <p className="relative mt-2 text-sm text-muted-foreground">
                    {t(`sports.items.${sport.key}.tagline`)}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
