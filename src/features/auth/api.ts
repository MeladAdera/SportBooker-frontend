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

export type RegisterRequestBody = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

/** Backend wraps all responses in { data, statusCode }. */
type ApiEnvelope<T> = {
  data: T;
  statusCode: number;
};

function unwrapData<T extends Record<string, unknown>>(json: unknown): T {
  if (
    json &&
    typeof json === 'object' &&
    'data' in (json as object) &&
    typeof (json as ApiEnvelope<T>).data === 'object'
  ) {
    return (json as ApiEnvelope<T>).data as T;
  }
  return json as T;
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

  return unwrapData<LoginResponse>(json);
}

export async function registerRequest(
  body: RegisterRequestBody,
): Promise<LoginResponse> {
  const payload: Record<string, string> = {
    name: body.name.trim(),
    email: body.email.trim(),
    password: body.password,
  };
  if (body.phone?.trim()) {
    payload.phone = body.phone.trim();
  }

  const res = await apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = parseApiErrorBody(json);
    if (envelope) throw new ApiError(envelope);
    throw new ApiError({
      statusCode: res.status,
      message: 'Registration failed',
    });
  }

  return unwrapData<LoginResponse>(json);
}

export type ForgotPasswordRequestBody = {
  email: string;
};

/**
 * POST /auth/forgot-password — backend always returns 200 for anti-enumeration.
 * Does not throw on non-OK HTTP status so the UI can always show the same success copy.
 * Only rejects on network/fetch failure.
 */
export async function forgotPasswordRequest(
  body: ForgotPasswordRequestBody,
): Promise<void> {
  const res = await apiFetch('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email.trim() }),
  });
  await res.text().catch(() => '');
}

export type ResetPasswordRequestBody = {
  token: string;
  newPassword: string;
};

export async function resetPasswordRequest(
  body: ResetPasswordRequestBody,
): Promise<void> {
  const res = await apiFetch('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: body.token,
      newPassword: body.newPassword,
    }),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = parseApiErrorBody(json);
    if (envelope) throw new ApiError(envelope);
    throw new ApiError({
      statusCode: res.status,
      message: 'Password reset failed',
    });
  }
}
