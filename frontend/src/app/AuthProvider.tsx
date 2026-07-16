import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi } from "../api/riskweave";
import { configureUnauthorizedHandler } from "../lib/api-client";
import { AuthContext, type AuthSession } from "./auth-context";

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode;
  initialSession?: AuthSession | null;
}) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const endSession = useCallback(
    (notice: string | null) => {
      setSession(null);
      setSessionNotice(notice);
      queryClient.clear();
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    endSession(null);
  }, [endSession]);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  useEffect(() => {
    configureUnauthorizedHandler(() => {
      endSession("Your session expired. Sign in again to return to your work.");
    });
    return () => {
      configureUnauthorizedHandler(undefined);
    };
  }, [endSession]);

  useEffect(() => {
    if (session === null) return undefined;
    const remaining = session.expiresAt - Date.now();
    const timer = window.setTimeout(
      () => {
        endSession("Your session expired. Sign in again to return to your work.");
      },
      Math.max(0, remaining),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [endSession, session]);

  const login = useCallback(
    async (email: string, password: string, signal?: AbortSignal) => {
      const result = await authApi.login(email, password, signal);
      const user = await authApi.me(result.access_token, signal);
      setSession({
        token: result.access_token,
        user,
        expiresAt: Date.now() + result.expires_in * 1000,
      });
      setSessionNotice(null);
      queryClient.clear();
    },
    [queryClient],
  );

  const demoLogin = useCallback(
    async (signal?: AbortSignal) => {
      const result = await authApi.demoAccess(signal);
      const user = await authApi.me(result.access_token, signal);
      setSession({
        token: result.access_token,
        user,
        expiresAt: Date.now() + result.expires_in * 1000,
      });
      setSessionNotice(null);
      queryClient.clear();
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ session, sessionNotice, login, demoLogin, logout, clearSessionNotice }),
    [session, sessionNotice, login, demoLogin, logout, clearSessionNotice],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
