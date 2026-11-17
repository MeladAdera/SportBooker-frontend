/**
 * Tenant slug from the browser hostname using `VITE_APP_DOMAIN` as the public apex.
 *
 * Examples (with `VITE_APP_DOMAIN=sportbooker.net`):
 * - `acfc.sportbooker.net` → `acfc`
 * - `app.sportbooker.net` → `null` (not a tenant)
 * - `platform.sportbooker.net` → `null` (platform admin, not tenant-scoped)
 * - `sportbooker.net`, `www.sportbooker.net` → `null`
 *
 * Localhost:
 * - `localhost` / `127.0.0.1` → `VITE_DEV_TENANT_SLUG` if set, else `null`
 * - `acfc.localhost` → `acfc` (local multi-tenant dev)
 *
 * Other hosts (not under `VITE_APP_DOMAIN`, e.g. `my-demo.vercel.app`)
 * → `VITE_DEFAULT_TENANT_SLUG` if set, else `null`.
 */

const RESERVED_SUBDOMAINS = new Set(['app', 'platform', 'api', 'www']);

/** Normalized app apex domain from env (no scheme, no path, lowercase). */
export function getAppDomain(): string {
  const raw = import.meta.env.VITE_APP_DOMAIN?.trim() ?? '';
  if (!raw) return '';
  try {
    const host = raw
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      ?.split(':')[0]
      ?.toLowerCase();
    return host?.replace(/^www\./, '') ?? '';
  } catch {
    return '';
  }
}

/**
 * Resolves tenant slug from a hostname (typically `window.location.hostname`).
 *
 * Returns `null` for reserved subdomains (`app`, `platform`, `api`) and bare/apex domain.
 * Only returns a slug for actual tenant subdomains (e.g. `acfc`).
 */
export function extractTenantSlug(hostname: string): string | null {
  const host = hostname.split(':')[0]?.toLowerCase() ?? '';
  if (!host) return null;

  if (host === 'localhost' || host === '127.0.0.1') {
    const dev = import.meta.env.VITE_DEV_TENANT_SLUG?.trim();
    return dev || null;
  }

  if (host.endsWith('.localhost')) {
    const label = host.slice(0, -'.localhost'.length);
    if (!label || RESERVED_SUBDOMAINS.has(label)) return null;
    return label;
  }

  const appDomain = getAppDomain();
  // Hosts outside the app domain (e.g. a `*.vercel.app` demo deployment) can't
  // carry a tenant subdomain, so fall back to an optional fixed tenant.
  const fallback = import.meta.env.VITE_DEFAULT_TENANT_SLUG?.trim() || null;
  if (!appDomain) return fallback;

  if (host === appDomain || host === `www.${appDomain}`) {
    return null;
  }

  const suffix = `.${appDomain}`;
  if (!host.endsWith(suffix)) return fallback;

  const label = host.slice(0, -suffix.length);
  if (!label || label.endsWith('.') || RESERVED_SUBDOMAINS.has(label)) {
    return null;
  }

  return label;
}
