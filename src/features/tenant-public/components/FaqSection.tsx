import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useReveal } from '../hooks/useReveal';

const ITEMS = ['1', '2', '3', '4', '5'] as const;

/**
 * Native `<details>`/`<summary>` accordion. No JS state — the browser handles
 * open/closed for free, screen readers announce the disclosure correctly, and
 * keyboard nav (Enter/Space to toggle) just works. The chevron rotates via
 * CSS sibling selectors on `[open]`.
 */
export function FaqSection() {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      id="faq"
      className="relative py-24 sm:py-28"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="landing-reveal text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t('faq.eyebrow')}
          </p>
          <h2
            id="faq-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {t('faq.heading')}
          </h2>
        </div>

        <div className="mt-12 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {ITEMS.map((id) => (
            <details
              key={id}
              className="group/faq px-5 py-4 marker:hidden open:bg-secondary/30 sm:px-6"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                <span className="text-start text-base font-semibold text-foreground">
                  {t(`faq.items.${id}.q`)}
                </span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open/faq:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t(`faq.items.${id}.a`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
