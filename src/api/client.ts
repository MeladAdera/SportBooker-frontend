import { authStore } from '@/stores/auth-store';

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

export function parseApiErrorBody(json: unknown): ApiErrorEnvelope | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.statusCode !== 'number' || typeof o.message !== 'string') {
    return null;
  }
  const errors = o.errors;
  return {
    statusCode: o.statusCode,
    message: o.message,
    errors: Array.isArray(errors)
      ? (errors as ApiErrorEnvelope['errors'])
      : undefined,
  };
}

export function getApiBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '';
  if (!raw) {
    throw new Error(
      'Missing VITE_API_URL (or VITE_API_BASE_URL) — set it in .env',
    );
  }
  return raw.replace(/\/$/, '');
}

/**
 * First subdomain label when present (e.g. acme.localhost → acme).
 * Plain `localhost` / single-label hosts → no tenant slug.
 */
export function getTenantSlugFromHostname(hostname: string): string | null {
  const host = hostname.split(':')[0]?.toLowerCase() ?? '';
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 1) return null;
  if (parts[0] === 'www' && parts.length > 2) return parts[1] ?? null;
  return parts[0] ?? null;
}

function getTenantHostHeaderValue(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = getTenantSlugFromHostname(window.location.hostname);
  if (!slug) return null;
  return window.location.hostname;
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
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getApiBaseUrl();
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function getPathname(resolvedUrl: string): string {
  return new URL(resolvedUrl).pathname;
}

function isAuthRefreshPath(pathname: string): boolean {
  return pathname === '/auth/refresh' || pathname.endsWith('/auth/refresh');
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { refreshToken } = authStore.getState();
      if (!refreshToken) return false;

      const url = resolveUrl('/auth/refresh');
      const headers = new Headers({
        'Content-Type': 'application/json',
      });
      const tenantHost = getTenantHostHeaderValue();
      if (tenantHost) {
        headers.set('Host', tenantHost);
      }

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ refreshToken }),
        });
        const text = [204, 205, 304].includes(res.status)
          ? ''
          : await res.text();
        if (!res.ok) return false;
        const data = text
          ? (JSON.parse(text) as {
              accessToken: string;
              refreshToken: string;
            })
          : null;
        if (
          !data ||
          typeof data.accessToken !== 'string' ||
          typeof data.refreshToken !== 'string'
        ) {
          return false;
        }
        authStore.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  authStore.clear();
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
