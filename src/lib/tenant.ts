/**
 * Tenant slug from the browser hostname using `VITE_APP_DOMAIN` as the public apex.
 *
 * Contract (product / manager spec):
 * - Read `window.location.hostname` in the app (e.g. via `resolveTenant()`), pass it here.
 * - Extract the subdomain **before** `VITE_APP_DOMAIN` (single label before the apex).
 *
 * Examples (with `VITE_APP_DOMAIN=sportbooker.com`):
 * - `acfc.sportbooker.com` → `acfc`
 * - `platform.sportbooker.com` → `platform`
 * - `sportbooker.com`, `www.sportbooker.com` → `null` (marketing / no tenant host)
 *
 * Localhost:
 * - `localhost` / `127.0.0.1` → no subdomain; use `VITE_DEV_TENANT_SLUG` if set, else `null`
 * - `acfc.localhost` → `acfc` (local multi-tenant dev)
 */

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
 * Production-style hosts: must end with `.{VITE_APP_DOMAIN}`; returns the left label
 * (e.g. `acfc` from `acfc.sportbooker.com`). `platform.sportbooker.com` → `platform`.
 */
export function extractTenantSlug(hostname: string): string | null {
  const host = hostname.split(':')[0]?.toLowerCase() ?? '';
  if (!host) return null;

  if (host === 'localhost' || host === '127.0.0.1') {
    const dev = import.meta.env.VITE_DEV_TENANT_SLUG?.trim();
    return dev || null;
  }

  if (host.endsWith('.localhost')) {
    const rest = host.slice(0, -'.localhost'.length);
    const first = rest.split('.').filter(Boolean)[0];
    return first ?? null;
  }

  const appDomain = getAppDomain();
  if (!appDomain) return null;

  if (host === appDomain || host === `www.${appDomain}`) {
    return null;
  }

  const suffix = `.${appDomain}`;
  if (!host.endsWith(suffix)) {
    return null;
  }

  let rest = host.slice(0, -suffix.length);
  if (!rest || rest.endsWith('.')) return null;

  rest = rest.replace(/^www\./, '');
  if (!rest || rest === 'www') return null;

  return rest;
}
