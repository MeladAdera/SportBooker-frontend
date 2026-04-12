import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

export type CreateTopupRequest = {
  amount: number;
};

export type CreateTopupResponse = {
  redirectUrl: string;
  paymentIntentId: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export async function createTopup(
  body: CreateTopupRequest,
): Promise<CreateTopupResponse> {
  const res = await apiFetch('/payments/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const o = json as Record<string, unknown> | null;
    const err = o?.error as Record<string, unknown> | undefined;
    const statusCode =
      typeof err?.statusCode === 'number'
        ? err.statusCode
        : typeof o?.statusCode === 'number'
          ? o.statusCode
          : res.status;
    const message =
      typeof err?.message === 'string'
        ? err.message
        : typeof o?.message === 'string'
          ? o.message
          : 'Top-up failed';
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = statusCode;
    throw error;
  }

  const envelope = json as ApiEnvelope<CreateTopupResponse>;
  return envelope.data;
}

type TopupError = Error & { statusCode?: number };

export function useCreateTopup(
  options?: UseMutationOptions<
    CreateTopupResponse,
    TopupError,
    CreateTopupRequest
  >,
) {
  return useMutation<CreateTopupResponse, TopupError, CreateTopupRequest>({
    mutationFn: createTopup,
    ...options,
  });
}
