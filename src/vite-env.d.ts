/// <reference types="vite/client" />

/**
 * Vite env (must be prefixed with VITE_ to be exposed to the client).
 * @see .env.example
 */
interface ImportMetaEnv {
  /** Backend API base URL (no trailing slash), e.g. https://api.sportbooker.net */
  readonly VITE_API_URL?: string;
  /** Backend API base URL — preferred name per backend integration guide. */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Public apex domain for subdomain parsing (no scheme), e.g. sportbooker.net.
   * Used by extractTenantSlug() — label before this domain is the tenant slug.
   * Reserved subdomains (app, platform, api) are excluded.
   */
  readonly VITE_APP_DOMAIN?: string;
  /**
   * When hostname is localhost / 127.0.0.1 (no subdomain), optional default slug for dev.
   */
  readonly VITE_DEV_TENANT_SLUG?: string;
  /** Tenant slug used on hosts outside VITE_APP_DOMAIN (e.g. a *.vercel.app demo). */
  readonly VITE_DEFAULT_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
