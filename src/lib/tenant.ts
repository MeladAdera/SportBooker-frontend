/**
 * Subdomain → tenant slug (e.g. acfc.sportbooker.com → acfc, platform.* → platform).
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
 * Resolves tenant / platform slug from hostname.
 * - Production: label(s) before `VITE_APP_DOMAIN` (e.g. acfc.sportbooker.com → acfc).
 * - `platform.*` is the platform-admin host; still returned as slug `platform`.
 * - Apex (`sportbooker.com`, `www.sportbooker.com`) → null.
 * - localhost / 127.0.0.1 → `VITE_DEV_TENANT_SLUG` or null.
 * - `*.localhost` (e.g. acme.localhost) → first label for local multi-tenant dev.
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
