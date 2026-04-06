/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL (no trailing slash). Preferred. */
  readonly VITE_API_URL?: string;
  /** @deprecated use VITE_API_URL */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
