import { apiFetch, ApiError, parseApiErrorBody } from '@/api/client';
import type { AuthUser } from '@/stores/authStore';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

/** Backend wraps all responses in { data, statusCode }. */
type ApiEnvelope<T> = {
  data: T;
  statusCode: number;
};

type RawLoginData = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/** JWT payload fields we care about (no signature verification — server already validated). */
type JwtPayload = {
  sub: string;
  role: string;
  tenantId?: string;
  email?: string;
  name?: string;
};

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    // atob needs padding
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export async function loginRequest(body: LoginRequest): Promise<LoginResponse> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = parseApiErrorBody(json);
    if (envelope) throw new ApiError(envelope);
    throw new ApiError({ statusCode: res.status, message: 'Login failed' });
  }

  // Unwrap { data: {...}, statusCode } envelope
  const raw =
    json && typeof json === 'object' && 'data' in (json as object)
      ? (json as ApiEnvelope<RawLoginData>).data
      : (json as RawLoginData);

  const payload = parseJwtPayload(raw.accessToken);

  const user: AuthUser = {
    id: payload?.sub ?? '',
    email: payload?.email ?? body.email,
    name: payload?.name ?? '',
    role: payload?.role ?? '',
    tenantId: payload?.tenantId,
  };

  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    expiresIn: raw.expiresIn,
    user,
  };
}
