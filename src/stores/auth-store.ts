/**
 * Minimal auth token store (Orval apiFetch reads tokens here; UI can subscribe later).
 */
export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
};

let state: AuthState = { accessToken: null, refreshToken: null };
const listeners = new Set<() => void>();

export const authStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getState: (): AuthState => state,
  setTokens: (accessToken: string, refreshToken: string) => {
    state = { accessToken, refreshToken };
    listeners.forEach((l) => l());
  },
  clear: () => {
    state = { accessToken: null, refreshToken: null };
    listeners.forEach((l) => l());
  },
};
