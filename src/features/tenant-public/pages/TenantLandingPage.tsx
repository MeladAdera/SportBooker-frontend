import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getRoleHomePath } from '@/features/auth/utils';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';

import { CtaBanner } from '../components/CtaBanner';
import { FaqSection } from '../components/FaqSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { HeroSection } from '../components/HeroSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { LandingFooter } from '../components/LandingFooter';
import { LandingHeader } from '../components/LandingHeader';
import { SportsSection } from '../components/SportsSection';
import { StatsSection } from '../components/StatsSection';
import { TestimonialsSection } from '../components/TestimonialsSection';

/**
 * Public per-tenant landing page rendered at `/` on tenant subdomains.
 *
 * Composition order is intentional — it follows the visitor's journey:
 *   1. Hero          → "what is this place"
 *   2. Stats & Cities → "we're active across Syria"
 *   3. Sports        → "what's offered"
 *   4. How it works  → "what's the workflow"
 *   5. Features      → "why it's worth signing up"
 *   6. Testimonials  → social proof
 *   7. FAQ           → addresses last-mile friction
 *   8. CTA banner    → final ask
 *   9. Footer        → legal + powered-by
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  ⚙️  Extension points (not wired yet — backend support pending)
 * ──────────────────────────────────────────────────────────────────────────
 * Once the API exposes `GET /public/matches` and `GET /public/venues`, drop a
 * new component (e.g. `UpcomingMatchesSection`) above `<HowItWorksSection />`.
 * The store/data hook should be opt-in: render the section only when there's
 * at least one match, so missing data never breaks the page.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  🔎  SEO note (client-side only for now)
 * ──────────────────────────────────────────────────────────────────────────
 * `document.title` and `<meta name="description">` are updated dynamically.
 * This is fine for browsers and for crawlers that execute JS (Googlebot does),
 * but Open Graph / Twitter card tags need the markup at HTML parse time —
 * crawlers like Slack, WhatsApp, LinkedIn don't run JS. Per-tenant OG tags
 * therefore need a tiny edge middleware (Vercel Edge Config / Cloudflare
 * Worker) that injects `<meta property="og:title">` etc. based on the host
 * before HTML is shipped, OR an SSR migration. Tracked as a follow-up.
 */
export function TenantLandingPage() {
  const { t } = useTranslation('tenant-public');
  const tenantInfo = useTenantStore((s) => s.tenantInfo);
  const slug = useTenantStore((s) => s.slug);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role ?? '');

  const displayName = useMemo(() => {
    if (tenantInfo?.name) return tenantInfo.name;
    if (slug && slug !== 'platform') return slug.toUpperCase();
    return 'SportBooker';
  }, [tenantInfo, slug]);

  const logoUrl = tenantInfo?.logoUrl ?? null;

  // Authed visitors who manually land here get an "Open app" affordance
  // instead of dual sign-in/register CTAs. RootRouter normally redirects
  // them, but a stale tab or hard-refresh can land them here.
  const appHomePath = isAuthenticated && role ? getRoleHomePath(role) : null;

  // Dynamic page meta — see file header for the OG / SSR follow-up note.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = t('meta.titleSuffix', { name: displayName });

    const description = t('meta.description', { name: displayName });
    let metaTag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = metaTag?.getAttribute('content') ?? null;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'description';
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      if (metaTag && previousDescription !== null) {
        metaTag.setAttribute('content', previousDescription);
      }
    };
  }, [displayName, t]);

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:inset-s-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        {t('header.skipToContent')}
      </a>

      <LandingHeader
        displayName={displayName}
        logoUrl={logoUrl}
        appHomePath={appHomePath}
      />

      <main id="main">
        <HeroSection
          displayName={displayName}
          logoUrl={logoUrl}
          appHomePath={appHomePath}
        />

        <StatsSection />

        <SportsSection />

        <HowItWorksSection />

        <FeaturesSection />

        <TestimonialsSection />

        <FaqSection />

        <CtaBanner displayName={displayName} appHomePath={appHomePath} />
      </main>

      <LandingFooter
        displayName={displayName}
        logoUrl={logoUrl}
        appHomePath={appHomePath}
      />
    </div>
  );
}
