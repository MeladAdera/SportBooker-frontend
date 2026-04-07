import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { extractTenantSlug } from '@/lib/tenant';

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
 */
export type TenantState = {
  slug: string | null;
  /** Branding info fetched from the backend (optional — may not be loaded yet). */
  tenantInfo: TenantInfo | null;
  isResolved: boolean;
  resolveTenant: () => void;
  setTenantInfo: (info: TenantInfo) => void;
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      slug: null,
      tenantInfo: null,
      isResolved: false,
      resolveTenant: () => {
        if (typeof window === 'undefined') {
          set({ isResolved: true });
          return;
        }
        // Subdomain before VITE_APP_DOMAIN — see extractTenantSlug()
        const slug = extractTenantSlug(window.location.hostname);
        set({ slug, isResolved: true });
      },
      setTenantInfo: (info: TenantInfo) => {
        set({ tenantInfo: info });
      },
    }),
    {
      name: 'sportbooker-tenant',
      partialize: (state) => ({ slug: state.slug }),
    },
  ),
);
