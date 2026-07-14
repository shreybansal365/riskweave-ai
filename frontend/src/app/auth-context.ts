import { createContext } from "react";

import type { AuthenticatedUser } from "../types/api";

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
  expiresAt: number;
}

export interface AuthContextValue {
  session: AuthSession | null;
  login: (email: string, password: string, signal?: AbortSignal) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
