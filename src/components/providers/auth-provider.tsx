"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  useAuthStore,
  getTokenExpiryMs,
  PROACTIVE_REFRESH_LEEWAY_MS,
  type AuthedFetch,
  type AuthStoreState,
} from "@/store/auth-store";

export type { AuthedFetch };

// Return shape of useAuth — unchanged from the old Context value so every
// existing call site keeps working against the Zustand store underneath.
export interface AuthContextValue {
  admin: AuthStoreState["admin"];
  accessToken: AuthStoreState["accessToken"];
  isLoading: AuthStoreState["isLoading"];
  login: AuthStoreState["login"];
  logout: () => Promise<void>;
  authedFetch: AuthedFetch;
  authedUpload: AuthStoreState["authedUpload"];
  getAccessToken: AuthStoreState["getAccessToken"];
  setAdmin: AuthStoreState["setAdmin"];
}

// State now lives in the Zustand store (src/store/auth-store.ts); this
// component only drives the two side effects that need a React lifecycle:
// the mount-time session restore and the proactive token-refresh timer. It no
// longer provides a Context — hence no <Provider> value — but keeps the same
// name and mount points (admin + login layouts) so nothing else changes.
interface AuthProviderProps {
  children: ReactNode;
  restoreSessionOnMount?: boolean;
}

export default function AuthProvider({
  children,
  restoreSessionOnMount = true,
}: AuthProviderProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);

  useEffect(() => {
    if (restoreSessionOnMount) {
      void restoreSession();
      return;
    }

    useAuthStore.setState({ isLoading: false });
  }, [restoreSession, restoreSessionOnMount]);

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

  return <>{children}</>;
}

// Same return shape as the old Context hook. logout is wrapped here to keep
// the post-logout redirect to /login exactly as before (the store's logout
// deliberately owns no router).
export function useAuth(): AuthContextValue {
  const router = useRouter();
  const admin = useAuthStore((state) => state.admin);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);
  const authedFetch = useAuthStore((state) => state.authedFetch);
  const authedUpload = useAuthStore((state) => state.authedUpload);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);
  const setAdmin = useAuthStore((state) => state.setAdmin);

  const logout = useCallback(async () => {
    await storeLogout();
    router.replace("/login");
  }, [storeLogout, router]);

  return {
    admin,
    accessToken,
    isLoading,
    login,
    logout,
    authedFetch,
    authedUpload,
    getAccessToken,
    setAdmin,
  };
}
