# Public landing pages per host (future work)

Design note for splitting the root `/` route by host class so tenant subdomains, the apex, and reserved subdomains each get the right public surface. **Not implemented yet** — this is a plan to pick up later.

## Problem

Today `/` is fully gated behind [`ProtectedRoute`](../src/App.tsx) and renders [`RoleBasedRouter`](../src/routes/RoleBasedRouter.tsx). Any unauthenticated visit to _any_ host — apex, `app`, `platform`, or a tenant subdomain like `acfc.sportbooker.net` — is redirected to `/login`.

That means:

- Tenant subdomains have **no public surface** — no tenant branding, no venue/match teasers, no SEO.
- The apex (`sportbooker.net`) has no **product marketing page** for operators to discover the platform.
- `app.sportbooker.net` and `platform.sportbooker.net` silently fall through to the same gate.
- `public/sitemap.xml` is a single static file served identically on every host, which is wrong for a multi-tenant setup.

Tenancy is already resolved by hostname in [`src/lib/tenant.ts`](../src/lib/tenant.ts) → `extractTenantSlug`:

| Host                                     | Slug              |
| ---------------------------------------- | ----------------- |
| `acfc.sportbooker.net`                   | `acfc`            |
| `app.sportbooker.net`                    | `null` (reserved) |
| `platform.sportbooker.net`               | `null` (reserved) |
| `sportbooker.net`, `www.sportbooker.net` | `null` (apex)     |
| `acfc.localhost` (dev)                   | `acfc`            |

Reserved subdomains: `app`, `platform`, `api`, `www`.

## Proposal

Split the root `/` behavior by host class. Three distinct "homes":

### 1. Tenant subdomain → public tenant landing page

URL: `acfc.sportbooker.net/`

- Tenant branding (logo, cover, description, contact, map).
- Public teasers: upcoming public matches, featured venues, sports offered.
- CTAs: **Sign in**, **Create account**, **Browse matches** (`/home` once authed).
- When an authed **player** lands here → redirect to `/home` (keeps current `RoleBasedRouter` feel, avoids double-home).
- Authed **operator/admin** of that tenant → redirect to `/operator/dashboard`.
- **Why:** SEO. Each tenant gets an indexable page at their own subdomain — same pattern Shopify stores, Calendly, Linktree, Linear status pages use. This is the main conversion surface for anonymous visitors who land on a club page from Google or a shared link.

### 2. Apex / `www` → product marketing landing page

URL: `sportbooker.net/`, `www.sportbooker.net/`

- Business-facing: "SportBooker — run bookings for your club."
- Operator signup / pricing / demo / sales.
- No tenant context, no player login prompt front and center.

### 3. `app.sportbooker.net/` → tenant-agnostic surface

Pick one based on product strategy:

- **(a)** Cross-tenant player discovery hub (browse matches across all tenants). Requires cross-tenant match listing API; probably out of scope for now.
- **(b)** "Which club?" chooser + login; routes the user to the right subdomain. Simpler, and fine as a v1.

If cross-tenant discovery isn't in scope, go with (b). Don't over-engineer it.

### 4. `platform.sportbooker.net/`

No change. Platform-admin only, as it is today.

## Routing sketch

Instead of `/` always being protected, branch on the resolved tenant slug:

```tsx
<Route
  path="/"
  element={
    slug === 'platform' ? (
      <PlatformRoot />
    ) : slug ? (
      <TenantLandingPage /> // acfc, fcbar, …
    ) : (
      <MarketingLandingPage />
    ) // apex / www / app
  }
/>
```

Keep `RoleBasedRouter` behind `<ProtectedRoute>` but mount it at an explicit path like `/go` (or let the landing page's "Go to app" button trigger the redirect via `useAuthStore`). Authed users hitting `/` on a tenant can still be bounced to their role home via a small `useEffect` inside `TenantLandingPage` — the important thing is that the URL itself stays public and crawlable for anonymous visitors.

## New files to add

- `src/features/marketing/pages/MarketingLandingPage.tsx` — apex/product page.
- `src/features/tenant-public/pages/TenantLandingPage.tsx` — per-tenant public page.
- `src/features/tenant-public/pages/TenantNotFoundPage.tsx` — invalid/unknown subdomain.
- `src/features/tenant-public/api/` — public tenant-info + public matches/venues hooks.
- i18n: `marketing.json` (en/ar), `tenant-public.json` (en/ar).

## Backend dependencies

The landing page needs **public** endpoints that don't require auth but are still tenant-scoped via `X-Tenant-Slug`. Today all calls go through the authed mutator in [`src/api/mutator.ts`](../src/api/mutator.ts). The header plumbing is fine — confirm with backend that these specific endpoints are public:

- `GET /public/tenant` → `{ slug, name, logoUrl, coverUrl, description, contact, sports[] }`
- `GET /public/venues` → list for map/featured section
- `GET /public/matches?status=open&limit=N` → upcoming public matches for teasers
- `GET /public/tenant/exists` (or make `/public/tenant` return 404) for the unknown-subdomain case

## Edge cases to handle explicitly

- **Unknown tenant subdomain** (e.g. `typo.sportbooker.net`): `extractTenantSlug` returns a slug whether or not the tenant exists — only the server knows. On 404 from `/public/tenant`, render `TenantNotFoundPage` with a link back to apex. Do **not** silently fall through to the marketing page or login.
- **Authed user lands on public page**: don't force-redirect; show a subtle "Go to app" button. Only auto-redirect on `/` itself to preserve current UX.
- **Tenant scope mismatch**: user logged into `acfc` visits `fcbar.sportbooker.net/` — show tenant landing anonymously, and if they try to sign in, the existing auth flow should handle the mismatch (re-verify behaviour after this change).

## SEO + meta (the annoying part)

- **`public/robots.txt`** is static and served on every host. Either:
  - Switch to per-host robots via a serverless function / rewrite in `vercel.json`, or
  - Accept a single permissive robots and rely on per-host sitemaps.
- **`public/sitemap.xml`** must be per-host. Today it's a single static file — that's wrong. Options:
  - Serve via a dynamic route (`/sitemap.xml`) that reads the `Host` header and emits tenant-specific URLs. Needs server-side execution.
  - Generate at build time per tenant — doesn't scale once tenants are dynamic.
- **OG tags / `index.html`**: currently static. Tenant landing pages need per-tenant `<title>`, `<meta description>`, `og:image` (tenant logo/cover). As a Vite SPA the HTML is shared across all hosts — link previews (WhatsApp, Slack, Twitter) will show the **generic** SportBooker OG image for every tenant. Fix options, in order of increasing effort:
  1. Inject meta tags client-side on mount (works for browsers, **not** for social crawlers — they don't execute JS).
  2. Add a lightweight edge function / middleware that rewrites `<title>` and `<meta>` based on the `Host` header before serving `index.html`.
  3. Move to a framework with per-host rendering (see below).

## The "should we move off a Vite SPA?" question

Tenant landing pages are the canonical use case where SSR/SSG starts paying for itself:

- Fast first paint on cold visits (important for anonymous traffic from search/shares).
- Correct OG tags per tenant without hacks.
- Proper SEO per tenant.
- Per-host sitemaps and robots come for free.

Not something to action today, but **flag it as a follow-up**: if tenant landing pages end up driving growth, the Vite SPA will become the bottleneck and Next.js on Vercel with per-host rendering is the obvious next step.

## Rollout plan (when you pick this up)

1. Backend: confirm/add public endpoints above.
2. Frontend:
   1. Add `MarketingLandingPage` (apex) behind a feature flag — ship it when ready, keep current `/login` redirect until then.
   2. Add `TenantLandingPage` + `TenantNotFoundPage`.
   3. Change `/` routing in [`src/App.tsx`](../src/App.tsx) to branch on `useTenantStore().slug`.
   4. Move authed `RoleBasedRouter` to `/go` (or similar) and wire "Go to app" buttons.
3. SEO:
   1. Replace static `public/sitemap.xml` with a per-host dynamic route.
   2. Per-host robots if needed.
   3. Decide on OG tag strategy (edge middleware vs. SSR migration).
4. Update [`docs/role-based-layouts.md`](./role-based-layouts.md) to reflect the new public surface.

## Out of scope for this doc

- Actual visual design of the tenant landing page (hero, sections, typography).
- Content strategy for the apex marketing page.
- Cross-tenant discovery product decisions for `app.sportbooker.net`.
