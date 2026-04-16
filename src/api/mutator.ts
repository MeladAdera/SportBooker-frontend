import { apiFetch, ApiError, parseApiErrorBody } from './client';

/**
 * Custom Orval mutator — drop-in for the generated `fetch` calls.
 * Adds auth / tenant headers via `apiFetch`, parses JSON,
 * and **throws `ApiError` on non-2xx** so TanStack Query's
 * `onError` / `isError` work correctly.
 *
 * Returns `{ data, status, headers }` to match the generated
 * discriminated-union response types Orval emits.
 */
export const customFetch = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> => {
  const res = await apiFetch(input.toString(), init);

  const body = [204, 205, 304].includes(res.status) ? null : await res.text();

  const parsed: unknown = body ? JSON.parse(body) : {};

  if (!res.ok) {
    const envelope = parseApiErrorBody(parsed);
    if (envelope) throw new ApiError(envelope);

    const fallbackMsg =
      typeof (parsed as Record<string, unknown>)?.message === 'string'
        ? ((parsed as Record<string, unknown>).message as string)
        : res.statusText || 'Request failed';

    throw new ApiError({ statusCode: res.status, message: fallbackMsg });
  }

  return { data: parsed, status: res.status, headers: res.headers } as T;
};

export default customFetch;

/**
 * Extracts the inner DTO type from an Orval discriminated-union response.
 *
 * Orval generates responses like:
 *   `{ data: { data: T; statusCode: number }; status: 200 } | { data: void; status: 4xx }`
 *
 * This distributes over the union and pulls `T` from the success variant.
 */
type ExtractData<R> = R extends { data: { data: infer T } } ? T : never;

/**
 * Unwraps an Orval response returned by the custom mutator.
 *
 * Generated responses have shape `{ data: { data: T, statusCode }, status, headers }`.
 * Since the mutator throws on non-2xx, the value is always the success variant.
 * This helper extracts the inner DTO (`T`) from the two `data` layers.
 */
export function unwrap<R extends { data: unknown }>(
  response: R | undefined,
): ExtractData<R> | undefined {
  const inner = response?.data;
  if (inner && typeof inner === 'object' && 'data' in inner) {
    return (inner as { data: ExtractData<R> }).data;
  }
  return undefined;
}
