import { Award, Building2, Clock, ListChecks, Wallet, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { useReveal } from '../hooks/useReveal';

type FeatureKey =
  | 'instant'
  | 'waitlist'
  | 'wallet'
  | 'cancelWindow'
  | 'stats'
  | 'club';

const FEATURES: { key: FeatureKey; icon: LucideIcon }[] = [
  { key: 'instant', icon: Zap },
  { key: 'waitlist', icon: ListChecks },
  { key: 'wallet', icon: Wallet },
  { key: 'cancelWindow', icon: Clock },
  { key: 'stats', icon: Award },
  { key: 'club', icon: Building2 },
];

export function FeaturesSection() {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      id="features"
      className="relative py-24 sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t('features.eyebrow')}
          </p>
          <h2
            id="features-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {t('features.heading')}
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
            {t('features.subheading')}
          </p>
        </div>

        <ul
          role="list"
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.key}>
                <article
                  className={cn(
                    'group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-sm',
                    'transition-all duration-300',
                    'hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md',
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground">
                        {t(`features.items.${feature.key}.title`)}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {t(`features.items.${feature.key}.body`)}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
