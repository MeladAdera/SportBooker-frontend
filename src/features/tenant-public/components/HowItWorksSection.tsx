import { CalendarCheck, Compass, Flag, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useReveal } from '../hooks/useReveal';

type StepKey = 'browse' | 'book' | 'play' | 'compete';

const STEPS: { key: StepKey; icon: LucideIcon }[] = [
  { key: 'browse', icon: Compass },
  { key: 'book', icon: CalendarCheck },
  { key: 'play', icon: Flag },
  { key: 'compete', icon: Trophy },
];

export function HowItWorksSection() {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      id="how-it-works"
      className="relative bg-secondary/30 py-24 sm:py-28"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t('howItWorks.eyebrow')}
          </p>
          <h2
            id="how-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {t('howItWorks.heading')}
          </h2>
        </div>

        <ol
          role="list"
          className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-6"
        >
          {/* Connecting line — desktop only */}
          <span
            aria-hidden
            className="absolute inset-x-8 top-7 hidden h-px bg-linear-to-r from-transparent via-primary/40 to-transparent md:block"
          />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                className="relative flex flex-row items-start gap-4 md:flex-col md:items-center md:gap-5 md:text-center"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border shadow-sm">
                  <Icon className="h-6 w-6 text-primary" aria-hidden />
                  <span
                    aria-hidden
                    className="absolute -inset-e-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-2 ring-secondary/30"
                  >
                    {idx + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {t(`howItWorks.steps.${step.key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground md:text-pretty">
                    {t(`howItWorks.steps.${step.key}.body`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
