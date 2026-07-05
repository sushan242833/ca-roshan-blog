"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  authenticatedApiRequest,
  authenticatedUploadRequest,
  ApiRequestError,
  type ApiRequestOptions,
} from "@/lib/api";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from "@/lib/constants";
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

interface AuthContextValue {
  admin: AuthenticatedAdminResponse | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Admin API call that self-heals expired sessions: on a 401 it refreshes
   * the access token (single-flight) and retries the request exactly once.
   * Admin code uses this instead of passing raw tokens around.
   */
  authedFetch: AuthedFetch;
  /** Multipart counterpart of authedFetch with the same 401-retry. */
  authedUpload: <T>(path: string, formData: FormData) => Promise<T>;
  /**
   * Current token at call time (fresher than the `accessToken` render value
   * inside an event handler that just triggered a refresh) — for callers
   * like revalidatePublicContent that need the raw token.
   */
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Refresh this long before the token's exp claim so long editing sessions
// never actually hit a 401 (the retry path remains as the fallback).
const PROACTIVE_REFRESH_LEEWAY_MS = 60_000;

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
function getTokenExpiryMs(token: string): number | null {
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

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AuthenticatedAdminResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref mirror of accessToken so authedFetch and the refresh logic always
  // see the current token instead of a stale render closure.
  const accessTokenRef = useRef<string | null>(null);
  // In-flight refresh, shared by concurrent 401s (single-flight).
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applyAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
    setAccessToken(token);
  }, []);

  // Refreshes the access token via the httpOnly refresh cookie. Concurrent
  // callers await the same request. On failure the whole auth state is
  // cleared (AdminGuard then redirects to /login) and null is returned.
  const refreshAccessToken = useCallback((): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const refreshed = await apiRequest<RefreshResponse>(
          "/v1/auth/refresh",
          { method: "POST" },
        );
        applyAccessToken(refreshed.accessToken);
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
        applyAccessToken(null);
        setAdmin(null);
        clearSessionCookie();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [applyAccessToken]);

  const authedFetch = useCallback<AuthedFetch>(
    async <T,>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
      try {
        return await authenticatedApiRequest<T>(
          path,
          accessTokenRef.current,
          options,
        );
      } catch (err) {
        // Only an expired/invalid token is recoverable — and only once.
        if (!(err instanceof ApiRequestError) || err.status !== 401) {
          throw err;
        }
        const newToken = await refreshAccessToken();
        if (!newToken) {
          throw err;
        }
        return authenticatedApiRequest<T>(path, newToken, options);
      }
    },
    [refreshAccessToken],
  );

  const authedUpload = useCallback(
    async <T,>(path: string, formData: FormData): Promise<T> => {
      try {
        return await authenticatedUploadRequest<T>(
          path,
          accessTokenRef.current,
          formData,
        );
      } catch (err) {
        if (!(err instanceof ApiRequestError) || err.status !== 401) {
          throw err;
        }
        const newToken = await refreshAccessToken();
        if (!newToken) {
          throw err;
        }
        return authenticatedUploadRequest<T>(path, newToken, formData);
      }
    },
    [refreshAccessToken],
  );

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authenticatedApiRequest<AuthenticatedAdminResponse>(
          "/v1/auth/me",
          token,
        );
        if (cancelled) return;
        setAdmin(profile);
      } catch {
        if (cancelled) return;
        applyAccessToken(null);
        setAdmin(null);
        clearSessionCookie();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [refreshAccessToken, applyAccessToken]);

  // Proactive renewal: refresh shortly before the exp claim so the 401-retry
  // path is the fallback, not the norm. Rescheduled automatically because a
  // successful refresh changes accessToken; if the tab slept through the
  // timer, authedFetch's retry still covers it.
  useEffect(() => {
    if (!accessToken) return;
    const expiryMs = getTokenExpiryMs(accessToken);
    if (expiryMs === null) return;

    const delay = Math.max(
      expiryMs - Date.now() - PROACTIVE_REFRESH_LEEWAY_MS,
      5_000,
    );
    const timer = setTimeout(() => {
      void refreshAccessToken();
    }, delay);
    return () => clearTimeout(timer);
  }, [accessToken, refreshAccessToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiRequest<LoginResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const profile = await authenticatedApiRequest<AuthenticatedAdminResponse>(
        "/v1/auth/me",
        result.accessToken,
      );
      applyAccessToken(result.accessToken);
      setAdmin(profile);
      setSessionCookie();
    },
    [applyAccessToken],
  );

  const logout = useCallback(async () => {
    try {
      await authenticatedApiRequest("/v1/auth/logout", accessTokenRef.current, {
        method: "POST",
      });
    } catch {
      // Best-effort — local state is cleared below regardless.
    } finally {
      applyAccessToken(null);
      setAdmin(null);
      clearSessionCookie();
      router.replace("/login");
    }
  }, [applyAccessToken, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      accessToken,
      isLoading,
      login,
      logout,
      authedFetch,
      authedUpload,
      getAccessToken,
    }),
    [
      admin,
      accessToken,
      isLoading,
      login,
      logout,
      authedFetch,
      authedUpload,
      getAccessToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
