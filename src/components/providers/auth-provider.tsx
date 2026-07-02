"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiRequest, authenticatedApiRequest } from "@/lib/api";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from "@/lib/constants";
import type { AuthenticatedAdminResponse } from "@/types/admin";

interface LoginResponse {
  accessToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

interface AuthContextValue {
  admin: AuthenticatedAdminResponse | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${SESSION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AuthenticatedAdminResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const refreshed = await apiRequest<RefreshResponse>("/v1/auth/refresh", {
          method: "POST",
        });
        const profile = await authenticatedApiRequest<AuthenticatedAdminResponse>(
          "/v1/auth/me",
          refreshed.accessToken,
        );
        if (cancelled) return;
        setAccessToken(refreshed.accessToken);
        setAdmin(profile);
      } catch {
        if (cancelled) return;
        // The session cookie only marks "was logged in" for proxy.ts's edge
        // check — if the backend refresh actually fails (expired/invalid
        // token), it must be cleared too, or the guard's redirect to /login
        // and the proxy's redirect back to /admin bounce forever.
        setAccessToken(null);
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
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const profile = await authenticatedApiRequest<AuthenticatedAdminResponse>(
      "/v1/auth/me",
      result.accessToken,
    );
    setAccessToken(result.accessToken);
    setAdmin(profile);
    setSessionCookie();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authenticatedApiRequest("/v1/auth/logout", accessToken, {
        method: "POST",
      });
    } catch {
      // Best-effort — local state is cleared below regardless.
    } finally {
      setAccessToken(null);
      setAdmin(null);
      clearSessionCookie();
      router.replace("/login");
    }
  }, [accessToken, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ admin, accessToken, isLoading, login, logout }),
    [admin, accessToken, isLoading, login, logout],
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
