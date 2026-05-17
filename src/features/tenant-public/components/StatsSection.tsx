import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

import { useReveal } from '../hooks/useReveal';

const SYRIAN_CITIES = [
  'Damascus',
  'Aleppo',
  'Homs',
  'Hama',
  'Lattakia',
  'Tartus',
];

export function StatsSection() {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="landing-reveal">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12">
            <div className="flex flex-col items-center">
              <div className="mb-3 text-4xl font-bold text-primary sm:text-5xl">
                6+
              </div>
              <p className="text-center text-sm font-medium text-muted-foreground sm:text-base">
                {t('hero.stats.cities')}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-3 text-4xl font-bold text-accent sm:text-5xl">
                100+
              </div>
              <p className="text-center text-sm font-medium text-muted-foreground sm:text-base">
                {t('hero.stats.venues')}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-3 text-4xl font-bold text-chart-2 sm:text-5xl">
                5
              </div>
              <p className="text-center text-sm font-medium text-muted-foreground sm:text-base">
                {t('hero.stats.sports')}
              </p>
            </div>
          </div>

          {/* Syrian Cities Showcase */}
          <div className="mt-14 border-t-2 border-t-red-600/20 pt-12">
            <div className="mb-8 text-center">
              <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                {t('stats.eyebrow')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('stats.subheading')}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {SYRIAN_CITIES.map((city) => (
                <div
                  key={city}
                  className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:border-red-500/30 hover:shadow-md hover:shadow-red-500/10"
                >
                  <MapPin
                    className="mr-1.5 inline h-3.5 w-3.5 text-red-600"
                    aria-hidden
                  />
                  {city}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
