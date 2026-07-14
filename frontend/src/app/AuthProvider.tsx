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
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    configureUnauthorizedHandler(logout);
    return () => {
      configureUnauthorizedHandler(undefined);
    };
  }, [logout]);

  useEffect(() => {
    if (session === null) return undefined;
    const remaining = session.expiresAt - Date.now();
    const timer = window.setTimeout(logout, Math.max(0, remaining));
    return () => {
      window.clearTimeout(timer);
    };
  }, [logout, session]);

  const login = useCallback(
    async (email: string, password: string, signal?: AbortSignal) => {
      const result = await authApi.login(email, password, signal);
      const user = await authApi.me(result.access_token, signal);
      setSession({
        token: result.access_token,
        user,
        expiresAt: Date.now() + result.expires_in * 1000,
      });
      queryClient.clear();
    },
    [queryClient],
  );

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
