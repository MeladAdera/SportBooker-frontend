import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { extractTenantSlug } from '@/lib/tenant';

export type TenantState = {
  slug: string | null;
  isResolved: boolean;
  resolveTenant: () => void;
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      slug: null,
      isResolved: false,
      resolveTenant: () => {
        if (typeof window === 'undefined') {
          set({ isResolved: true });
          return;
        }
        const slug = extractTenantSlug(window.location.hostname);
        set({ slug, isResolved: true });
      },
    }),
    {
      name: 'sportbooker-tenant',
      partialize: (state) => ({ slug: state.slug }),
    },
  ),
);
