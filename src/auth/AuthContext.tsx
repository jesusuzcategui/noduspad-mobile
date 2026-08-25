import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AUTH_EMAIL, AUTH_PASSWORD_HASH } from '../config/authConfig';
import { verifyCredentials } from './authService';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((email: string, password: string) => {
    const ok = verifyCredentials(email, password, { AUTH_EMAIL, AUTH_PASSWORD_HASH });
    if (ok) {
      setIsAuthenticated(true);
    }
    return ok;
  }, []);

  const logout = useCallback(() => setIsAuthenticated(false), []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
