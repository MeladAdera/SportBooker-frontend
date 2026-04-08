import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { resolveApiUrl } from '@/lib/api-url';
import { getTenantHostHeaderValue } from '@/lib/tenant-host-header';

const AUTH_STORAGE_KEY = 'sportbooker-auth';

/** Seconds before access token expiry — used to schedule refresh. */
const REFRESH_LEAD_SECONDS = 60;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
  phone?: string | null;
  photoUrl?: string | null;
  /** Wallet credit balance in the tenant's currency. Populated after wallet API loads. */
  walletBalance?: number | null;
};

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  expiresIn: number | null;
  /** False until persist hydrate + restoreSession finished — use for route guards. */
  isSessionReady: boolean;
};

type AuthActions = {
  login: (
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    user: AuthUser,
  ) => void;
  logout: () => Promise<void>;
  /** Clear tokens locally without calling the API (e.g. invalid session redirect). */
  clearLocalSession: () => void;
  /** POST /auth/refresh — rotates tokens; single-flight when called concurrently. */
  refresh: () => Promise<boolean>;
  setUser: (user: AuthUser | null) => void;
  /** After persist rehydration: restore access token if refresh token exists. */
  restoreSession: () => Promise<void>;
};

type AuthStore = AuthState & AuthActions;

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function clearScheduledRefresh(): void {
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

function scheduleAutoRefresh(expiresInSeconds: number | null): void {
  clearScheduledRefresh();
  if (expiresInSeconds == null || expiresInSeconds <= 0) return;
  const delayMs = Math.max(0, (expiresInSeconds - REFRESH_LEAD_SECONDS) * 1000);
  refreshTimerId = setTimeout(() => {
    void useAuthStore.getState().refresh();
  }, delayMs);
}

function buildAuthHeaders(accessToken?: string | null): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const tenantHost = getTenantHostHeaderValue();
  if (tenantHost) {
    headers.set('Host', tenantHost);
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user?: AuthUser;
};

function parseRefreshBody(text: string): RefreshResponse | null {
  if (!text) return null;
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    // Unwrap { data: {...}, statusCode } envelope if present
    const data =
      json.data && typeof json.data === 'object'
        ? (json.data as Record<string, unknown>)
        : json;
    const accessToken = data.accessToken;
    const refreshToken = data.refreshToken;
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      return null;
    }
    const expiresIn =
      typeof data.expiresIn === 'number' ? data.expiresIn : undefined;
    const user = data.user as AuthUser | undefined;
    return { accessToken, refreshToken, expiresIn, user };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      const clearSession = (): void => {
        clearScheduledRefresh();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          expiresIn: null,
        });
      };

      return {
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        expiresIn: null,
        isSessionReady: false,

        login: (accessToken, refreshToken, expiresIn, user) => {
          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
            expiresIn,
          });
          scheduleAutoRefresh(expiresIn);
        },

        setUser: (user) => {
          set({ user });
        },

        clearLocalSession: () => {
          clearSession();
        },

        logout: async () => {
          clearScheduledRefresh();
          const accessToken = get().accessToken;
          try {
            if (accessToken) {
              await fetch(resolveApiUrl('/auth/logout'), {
                method: 'POST',
                headers: buildAuthHeaders(accessToken),
              });
            }
          } catch {
            // still clear local session
          } finally {
            clearSession();
          }
        },

        refresh: async () => {
          if (refreshInFlight) return refreshInFlight;

          const refreshToken = get().refreshToken;
          if (!refreshToken) return false;

          refreshInFlight = (async (): Promise<boolean> => {
            try {
              const headers = buildAuthHeaders();
              const res = await fetch(resolveApiUrl('/auth/refresh'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ refreshToken }),
              });

              const text = [204, 205, 304].includes(res.status)
                ? ''
                : await res.text();

              if (res.status === 401) {
                clearSession();
                return false;
              }

              if (!res.ok) {
                return false;
              }

              const data = text ? parseRefreshBody(text) : null;
              if (!data) {
                return false;
              }

              const nextExpiresIn = data.expiresIn ?? null;
              set((s) => ({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresIn: nextExpiresIn,
                isAuthenticated: true,
                user: data.user ?? s.user,
              }));
              scheduleAutoRefresh(nextExpiresIn);
              return true;
            } catch {
              return false;
            } finally {
              refreshInFlight = null;
            }
          })();

          return refreshInFlight;
        },

        restoreSession: async () => {
          const { refreshToken } = get();
          if (!refreshToken) return;
          const ok = await get().refresh();
          if (!ok) {
            clearSession();
          }
        },
      };
    },
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);

/** Alias for imperative access (e.g. apiFetch) — same as `useAuthStore`. */
export const authStore = useAuthStore;
