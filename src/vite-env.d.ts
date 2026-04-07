/// <reference types="vite/client" />

/**
 * Vite env (must be prefixed with VITE_ to be exposed to the client).
 * @see .env.example
 */
interface ImportMetaEnv {
  /** Backend API base URL (no trailing slash), e.g. http://localhost:3000 */
  readonly VITE_API_URL?: string;
  /** @deprecated Prefer VITE_API_URL */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Public apex domain for subdomain parsing (no scheme), e.g. sportbooker.com.
   * Used by extractTenantSlug() — label before this domain is the tenant slug.
   */
  readonly VITE_APP_DOMAIN?: string;
  /**
   * When hostname is localhost / 127.0.0.1 (no subdomain), optional default slug for dev.
   */
  readonly VITE_DEV_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
