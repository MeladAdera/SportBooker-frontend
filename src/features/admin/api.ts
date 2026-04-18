import { apiFetch, ApiError, parseApiErrorBody } from '@/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TenantListItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  timezone: string;
  cancelCutoffHours: number;
  createdAt: string;
  updatedAt: string;
};

export type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  timezone?: string;
  logoUrl?: string | null;
  cancelCutoffHours?: number;
  superAdminEmail?: string;
  superAdminName?: string;
};

export type PaginatedTenants = {
  items: TenantListItem[];
  total: number;
  page: number;
  limit: number;
};

export type ListTenantsParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export type CreateTenantDto = {
  name: string;
  slug: string;
  logoUrl?: string;
  timezone?: string;
  cancelCutoffHours?: number;
  superAdmin: {
    name: string;
    email: string;
    password: string;
  };
};

export type UpdateTenantDto = {
  name?: string;
  timezone?: string;
  logoUrl?: string | null;
  cancelCutoffHours?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let envelope = null;
    try {
      envelope = parseApiErrorBody(JSON.parse(text));
    } catch {
      /* noop */
    }
    throw new ApiError(
      envelope ?? {
        statusCode: res.status,
        message: res.statusText || 'Request failed',
      },
    );
  }
  if (!text) return undefined as unknown as T;
  const json = JSON.parse(text) as Record<string, unknown>;
  return (json?.data ?? json) as T;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const adminTenantsKeys = {
  all: ['admin', 'tenants'] as const,
  list: (params: ListTenantsParams) =>
    ['admin', 'tenants', 'list', params] as const,
  detail: (id: string) => ['admin', 'tenants', id] as const,
};

// ── API functions ─────────────────────────────────────────────────────────────

export async function listTenants(
  params: ListTenantsParams = {},
): Promise<PaginatedTenants> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.isActive !== undefined)
    qs.set('isActive', String(params.isActive));

  const res = await apiFetch(`/admin/tenants?${qs.toString()}`);
  return parseResponse<PaginatedTenants>(res);
}

export async function getTenant(id: string): Promise<TenantDetail> {
  const res = await apiFetch(`/admin/tenants/${id}`);
  return parseResponse<TenantDetail>(res);
}

export async function createTenant(
  dto: CreateTenantDto,
): Promise<TenantDetail> {
  const res = await apiFetch('/admin/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseResponse<TenantDetail>(res);
}

export async function updateTenant(
  id: string,
  dto: UpdateTenantDto,
): Promise<TenantDetail> {
  const res = await apiFetch(`/admin/tenants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseResponse<TenantDetail>(res);
}

export async function activateTenant(id: string): Promise<TenantDetail> {
  const res = await apiFetch(`/admin/tenants/${id}/activate`, {
    method: 'POST',
  });
  return parseResponse<TenantDetail>(res);
}

export async function deactivateTenant(id: string): Promise<TenantDetail> {
  const res = await apiFetch(`/admin/tenants/${id}/deactivate`, {
    method: 'POST',
  });
  return parseResponse<TenantDetail>(res);
}
