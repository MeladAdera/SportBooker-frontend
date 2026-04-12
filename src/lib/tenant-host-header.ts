import { useTenantStore } from '@/stores/tenantStore';

/**
 * Returns the tenant slug for the `X-Tenant-Slug` request header.
 * Returns `null` when not in a tenant context (platform admin, app, etc.).
 */
export function getTenantSlugHeader(): string | null {
  const slug = useTenantStore.getState().slug;
  return slug || null;
}

/** @deprecated Use `getTenantSlugHeader` — kept for downstream grep-ability. */
export const getTenantHostHeaderValue = getTenantSlugHeader;
