/**
 * Shared API base URL resolution (used by apiFetch and authStore to avoid circular imports).
 */
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

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
