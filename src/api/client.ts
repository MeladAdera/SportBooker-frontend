import { authStore } from '@/stores/authStore';
import { getApiBaseUrl, resolveApiUrl } from '@/lib/api-url';
import { getTenantHostHeaderValue } from '@/lib/tenant-host-header';

/** Re-export for callers that imported from `api/client`. */
export { getApiBaseUrl, resolveApiUrl };

/** Public login route; change if routing uses a different path. */
export const LOGIN_PATH = '/login';

const AUTH_RETRY_HEADER = 'X-Auth-Retry';

/** Backend JSON error envelope (Nest-style). */
export type ApiErrorEnvelope = {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: ApiErrorEnvelope['errors'];

  constructor(envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.name = 'ApiError';
    this.statusCode = envelope.statusCode;
    this.errors = envelope.errors;
  }
}

function normalizeMessage(msg: unknown): string | null {
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg) && msg.every((x) => typeof x === 'string')) {
    return msg.join('. ');
  }
  return null;
}

export function parseApiErrorBody(json: unknown): ApiErrorEnvelope | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.statusCode !== 'number') return null;
  const message = normalizeMessage(o.message);
  if (!message) return null;
  const errors = o.errors;
  return {
    statusCode: o.statusCode,
    message,
    errors: Array.isArray(errors)
      ? (errors as ApiErrorEnvelope['errors'])
      : undefined,
  };
}

function mergeHeaders(
  init: RequestInit | undefined,
  extra: Record<string, string>,
): Headers {
  const h = new Headers(init?.headers);
  for (const [key, value] of Object.entries(extra)) {
    if (value) h.set(key, value);
  }
  return h;
}

function resolveUrl(url: string): string {
  return resolveApiUrl(url);
}

function getPathname(resolvedUrl: string): string {
  try {
    return new URL(resolvedUrl).pathname;
  } catch {
    // relative URL (e.g. /api/auth/login when proxied through Vite)
    return resolvedUrl.split('?')[0] ?? resolvedUrl;
  }
}

function isAuthRefreshPath(pathname: string): boolean {
  return pathname === '/auth/refresh' || pathname.endsWith('/auth/refresh');
}

async function refreshAccessToken(): Promise<boolean> {
  return authStore.getState().refresh();
}

function redirectToLogin(): void {
  authStore.getState().clearLocalSession();
  if (typeof window !== 'undefined') {
    window.location.assign(LOGIN_PATH);
  }
}

/**
 * Drop-in `fetch` for Orval: same `Response` shape, plus base URL, auth + tenant
 * headers, and 401 → refresh → single retry.
 */
export async function apiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const resolved = resolveUrl(url);
  const pathname = getPathname(resolved);

  const headers = mergeHeaders(init, {});
  const tenantHost = getTenantHostHeaderValue();
  // Browsers treat `Host` as a forbidden header; some engines strip it. Prefer
  // subdomain routing via the request URL or a custom header on the backend if needed.
  if (tenantHost) {
    headers.set('Host', tenantHost);
  }

  const { accessToken } = authStore.getState();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const isRetry = headers.get(AUTH_RETRY_HEADER) === '1';
  if (isRetry) {
    headers.delete(AUTH_RETRY_HEADER);
  }

  const nextInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await fetch(resolved, nextInit);

  if (
    response.status === 401 &&
    !isRetry &&
    !isAuthRefreshPath(pathname) &&
    authStore.getState().refreshToken
  ) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      redirectToLogin();
      return response;
    }

    const retryHeaders = mergeHeaders(init, {
      [AUTH_RETRY_HEADER]: '1',
    });
    const tenant = getTenantHostHeaderValue();
    if (tenant) retryHeaders.set('Host', tenant);
    const nextAccess = authStore.getState().accessToken;
    if (nextAccess) {
      retryHeaders.set('Authorization', `Bearer ${nextAccess}`);
    } else {
      retryHeaders.delete('Authorization');
    }

    return apiFetch(url, { ...init, headers: retryHeaders });
  }

  return response;
}
