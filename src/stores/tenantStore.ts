import { create } from 'zustand';

import { extractTenantSlug } from '@/lib/tenant';
import { resolveApiUrl } from '@/lib/api-url';

export type TenantInfo = {
  slug: string;
  name: string;
  logoUrl: string | null;
};

/**
 * Tenant context: slug from hostname (`VITE_APP_DOMAIN` + extractTenantSlug).
 *
 * - `slug` — tenant label (e.g. acfc, platform) or null for apex / no match
 * - `isResolved` — true after `resolveTenant()` has run
 * - `resolveTenant()` — reads `window.location.hostname` and sets `slug`
 * - `loadTenantInfo()` — calls `GET /tenant/info` (public) and populates `tenantInfo`
 */
export type TenantState = {
  slug: string | null;
  /** Branding info fetched from the backend (optional — may not be loaded yet). */
  tenantInfo: TenantInfo | null;
  isResolved: boolean;
  resolveTenant: () => void;
  setTenantInfo: (info: TenantInfo) => void;
  /** Fetches `GET /tenant/info` and stores the result. No-ops on platform/null slug. */
  loadTenantInfo: () => Promise<void>;
};

export const useTenantStore = create<TenantState>()((set, get) => ({
  slug: null,
  tenantInfo: null,
  isResolved: false,
  resolveTenant: () => {
    if (typeof window === 'undefined') {
      set({ isResolved: true });
      return;
    }
    const slug = extractTenantSlug(window.location.hostname);
    set({ slug, isResolved: true });
  },
  setTenantInfo: (info: TenantInfo) => {
    set({ tenantInfo: info });
  },
  loadTenantInfo: async () => {
    const { slug } = get();
    // Public endpoint — only meaningful for real tenant subdomains
    if (!slug || slug === 'platform') return;
    try {
      const res = await fetch(resolveApiUrl('/tenant/info'), {
        headers: { 'X-Tenant-Slug': slug },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: TenantInfo };
      const info = json?.data;
      if (info?.name !== undefined) {
        set({ tenantInfo: info });
      }
    } catch {
      // Network errors are silently ignored — branding falls back to slug initials
    }
  },
}));
