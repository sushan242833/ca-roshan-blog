import { create } from "zustand";
import {
  apiRequest,
  authenticatedApiRequest,
  authenticatedUploadRequest,
  ApiRequestError,
  type ApiRequestOptions,
} from "@/lib/api";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/constants";
import type { AuthenticatedAdminResponse } from "@/types/admin";

interface LoginResponse {
  accessToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

export type AuthedFetch = <T>(
  path: string,
  options?: ApiRequestOptions,
) => Promise<T>;

export interface AuthStoreState {
  admin: AuthenticatedAdminResponse | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /**
   * Clears the session (best-effort backend logout + local state/cookie).
   * Navigation to /login is intentionally NOT done here — the useAuth() hook
   * wraps this to redirect, keeping the store free of router coupling exactly
   * where the old provider used it.
   */
  logout: () => Promise<void>;
  /**
   * Admin API call that self-heals expired sessions: on a 401 it refreshes
   * the access token (single-flight) and retries the request exactly once.
   */
  authedFetch: AuthedFetch;
  /** Multipart counterpart of authedFetch with the same 401-retry. */
  authedUpload: <T>(path: string, formData: FormData) => Promise<T>;
  /** Current token at call time — for callers like revalidatePublicContent. */
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  /** Mount-time session restore (refresh cookie → access token → profile). */
  restoreSession: () => Promise<void>;
  applyAccessToken: (token: string | null) => void;
  /** Replace the cached admin profile (e.g. after an About-page save). */
  setAdmin: (admin: AuthenticatedAdminResponse) => void;
}

// Refresh this long before the token's exp claim so long editing sessions
// never actually hit a 401 (the retry path remains as the fallback).
export const PROACTIVE_REFRESH_LEEWAY_MS = 60_000;

function setSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${SESSION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
}

// Reads the JWT exp claim (no signature verification — the backend enforces
// validity; this is only for scheduling). Returns epoch milliseconds or null
// for anything that doesn't decode.
export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

// In-flight refresh shared by concurrent 401s (single-flight). Module-scoped
// so it lives outside React state and never triggers a re-render — the direct
// port of the old provider's refreshPromiseRef.
let refreshPromise: Promise<string | null> | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  admin: null,
  accessToken: null,
  isLoading: true,

  // Access token is state now; get().accessToken reads the current value
  // synchronously, replacing the old accessTokenRef mirror.
  applyAccessToken: (token) => set({ accessToken: token }),

  setAdmin: (admin) => set({ admin }),

  getAccessToken: () => get().accessToken,

  // Refreshes the access token via the httpOnly refresh cookie. Concurrent
  // callers await the same request. On failure the whole auth state is
  // cleared (AdminGuard then redirects to /login) and null is returned.
  refreshAccessToken: () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const refreshed = await apiRequest<RefreshResponse>(
          "/v1/auth/refresh",
          { method: "POST" },
        );
        get().applyAccessToken(refreshed.accessToken);
        // Re-establish the presence cookie checked by proxy.ts. Without this,
        // a session restored purely from the refresh cookie (e.g. after the
        // presence cookie expired) leaves /login's redirect to /admin bouncing
        // straight back — an endless spinner on /login.
        setSessionCookie();
        return refreshed.accessToken;
      } catch {
        // The session cookie only marks "was logged in" for proxy.ts's edge
        // check — if the backend refresh actually fails (expired/invalid
        // token), it must be cleared too, or the guard's redirect to /login
        // and the proxy's redirect back to /admin bounce forever.
        get().applyAccessToken(null);
        set({ admin: null });
        clearSessionCookie();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  authedFetch: async <T,>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> => {
    try {
      return await authenticatedApiRequest<T>(
        path,
        get().accessToken,
        options,
      );
    } catch (err) {
      // Only an expired/invalid token is recoverable — and only once.
      if (!(err instanceof ApiRequestError) || err.status !== 401) {
        throw err;
      }
      const newToken = await get().refreshAccessToken();
      if (!newToken) {
        throw err;
      }
      return authenticatedApiRequest<T>(path, newToken, options);
    }
  },

  authedUpload: async <T,>(path: string, formData: FormData): Promise<T> => {
    try {
      return await authenticatedUploadRequest<T>(
        path,
        get().accessToken,
        formData,
      );
    } catch (err) {
      if (!(err instanceof ApiRequestError) || err.status !== 401) {
        throw err;
      }
      const newToken = await get().refreshAccessToken();
      if (!newToken) {
        throw err;
      }
      return authenticatedUploadRequest<T>(path, newToken, formData);
    }
  },

  restoreSession: async () => {
    const token = await get().refreshAccessToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const profile =
        await authenticatedApiRequest<AuthenticatedAdminResponse>(
          "/v1/auth/me",
          token,
        );
      set({ admin: profile });
    } catch {
      get().applyAccessToken(null);
      set({ admin: null });
      clearSessionCookie();
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const result = await apiRequest<LoginResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const profile =
      await authenticatedApiRequest<AuthenticatedAdminResponse>(
        "/v1/auth/me",
        result.accessToken,
      );
    get().applyAccessToken(result.accessToken);
    set({ admin: profile });
    setSessionCookie();
  },

  logout: async () => {
    try {
      await authenticatedApiRequest("/v1/auth/logout", get().accessToken, {
        method: "POST",
      });
    } catch {
      // Best-effort — local state is cleared below regardless.
    } finally {
      get().applyAccessToken(null);
      set({ admin: null });
      clearSessionCookie();
    }
  },
}));
