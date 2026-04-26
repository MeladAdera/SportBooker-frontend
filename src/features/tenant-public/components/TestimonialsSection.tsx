import { Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useReveal } from '../hooks/useReveal';

const ITEMS = ['1', '2', '3'] as const;

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  );
}

export function TestimonialsSection() {
  const { t } = useTranslation('tenant-public');
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      id="testimonials"
      className="relative bg-secondary/30 py-24 sm:py-28"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t('testimonials.eyebrow')}
          </p>
          <h2
            id="testimonials-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {t('testimonials.heading')}
          </h2>
        </div>

        <ul role="list" className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ITEMS.map((id) => {
            const author = t(`testimonials.items.${id}.author`);
            const sport = t(`testimonials.items.${id}.sport`);
            const quote = t(`testimonials.items.${id}.quote`);
            return (
              <li key={id}>
                <figure className="relative flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                  <Quote
                    className="absolute inset-e-5 top-5 h-8 w-8 text-primary/15"
                    aria-hidden
                  />
                  <blockquote className="relative text-base leading-relaxed text-foreground">
                    <p className="text-pretty">&ldquo;{quote}&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
                    <div
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent text-sm font-bold text-primary-foreground ring-1 ring-foreground/10"
                    >
                      {getInitials(author)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {author}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sport}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
