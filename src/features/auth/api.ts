import { apiFetch, ApiError, parseApiErrorBody } from '@/api/client';
import type { AuthUser } from '@/stores/authStore';

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type PreferredPosition =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward';
export type DominantFoot = 'left' | 'right' | 'both';

export type RegisterRequestBody = {
  name: string;
  email: string;
  password: string;
  phone: string;
  // Optional player profile fields
  dateOfBirth?: string;
  nationality?: string;
  preferredLanguage?: string;
  skillLevel?: SkillLevel;
  preferredPosition?: PreferredPosition;
  dominantFoot?: DominantFoot;
  photoUrl?: string;
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
  // Backend `LoginDto` expects `identifier` + `password`.
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: body.identifier.trim(),
      password: body.password,
    }),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = parseApiErrorBody(json);
    if (envelope) throw new ApiError(envelope);
    throw new ApiError({ statusCode: res.status, message: 'Login failed' });
  }

  return unwrapData<LoginResponse>(json);
}

export type RegisterResponse = {
  message: string;
  emailVerificationRequired: boolean;
};

export async function registerRequest(
  body: RegisterRequestBody,
): Promise<RegisterResponse> {
  const payload: Record<string, string | undefined> = {
    name: body.name.trim(),
    email: body.email.trim(),
    password: body.password,
    phone: body.phone.trim(),
    dateOfBirth: body.dateOfBirth,
    nationality: body.nationality,
    preferredLanguage: body.preferredLanguage,
    skillLevel: body.skillLevel,
    preferredPosition: body.preferredPosition,
    dominantFoot: body.dominantFoot,
    photoUrl: body.photoUrl,
  };

  // Strip undefined so the backend doesn't receive null-ish keys for omitted fields
  Object.keys(payload).forEach(
    (k) => payload[k] === undefined && delete payload[k],
  );

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

  return unwrapData<RegisterResponse>(json);
}

export type VerifyEmailRequestBody = {
  token: string;
};

export async function verifyEmailRequest(token: string): Promise<void> {
  const res = await apiFetch('/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token } satisfies VerifyEmailRequestBody),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = parseApiErrorBody(json);
    if (envelope) throw new ApiError(envelope);
    throw new ApiError({
      statusCode: res.status,
      message: 'Verification failed',
    });
  }
}

export type ResendVerificationRequestBody = {
  email: string;
};

/**
 * POST /auth/resend-verification-email — anti-enumeration: always returns
 * a generic success message whether the account exists or not. Never throws
 * on HTTP errors so the UI always shows the same neutral copy.
 * Only rejects on network / fetch failure.
 */
export async function resendVerificationRequest(email: string): Promise<void> {
  const res = await apiFetch('/auth/resend-verification-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
    } satisfies ResendVerificationRequestBody),
  });
  await res.text().catch(() => '');
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
