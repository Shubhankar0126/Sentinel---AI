"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { authService } from "@/services/auth-service";
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens
} from "@/store/auth-storage";
import type { LoginRequest, RegisterRequest } from "@/types/auth";
import type { UserRead, UserRole } from "@/types/domain";

interface AuthContextValue {
  user: UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<UserRead>;
  register: (payload: RegisterRequest) => Promise<UserRead>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }

    const tokens = await authService.refresh(refreshToken);
    storeTokens(tokens);
    const nextUser = await authService.me();
    setUser(nextUser);
  }, []);

  const bootstrap = useCallback(async () => {
    if (!getStoredAccessToken() && !getStoredRefreshToken()) {
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await authService.me();
      setUser(currentUser);
    } catch {
      try {
        await refreshSession();
      } catch {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, refreshSession]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener("sentinel:auth-expired", handleExpired as EventListener);
    return () => window.removeEventListener("sentinel:auth-expired", handleExpired as EventListener);
  }, [logout]);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await authService.login(payload);
    storeTokens(response.tokens);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    const response = await authService.register(payload);
    storeTokens(response.tokens);
    setUser(response.user);
    return response.user;
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) {
        return false;
      }
      return roles.length === 0 || roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      hasRole
    }),
    [hasRole, isLoading, login, logout, refreshSession, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider.");
  }
  return context;
}

