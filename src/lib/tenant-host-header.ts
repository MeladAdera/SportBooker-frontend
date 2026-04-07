import { useTenantStore } from '@/stores/tenantStore';

/**
 * Value for tenant routing (subdomain). Browsers may ignore `Host` on fetch; backend may use
 * `X-Forwarded-Host` or URL-based tenant resolution instead.
 */
export function getTenantHostHeaderValue(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = useTenantStore.getState().slug;
  if (!slug) return null;
  return window.location.hostname;
}
