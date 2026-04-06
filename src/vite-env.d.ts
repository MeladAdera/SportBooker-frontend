/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL (no trailing slash). Preferred. */
  readonly VITE_API_URL?: string;
  /** @deprecated use VITE_API_URL */
  readonly VITE_API_BASE_URL?: string;
  /** Public app apex domain for subdomain parsing (no scheme), e.g. sportbooker.com */
  readonly VITE_APP_DOMAIN?: string;
  /** Optional tenant slug when host is localhost / 127.0.0.1 (no subdomain). */
  readonly VITE_DEV_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
