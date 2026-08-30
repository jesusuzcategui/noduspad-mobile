import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deleteAccount, loadAccount, saveAccount, type Account } from './accountStorage';
import { generateSalt, hashPasswordWithSalt, verifyCredentials } from './authService';

type AuthContextValue = {
  hasAccount: boolean | null;
  isAuthenticated: boolean;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  resetAccount: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAccount().then(loaded => {
      if (cancelled) return;
      setAccount(loaded);
      setHasAccount(loaded !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password) {
      return false;
    }
    try {
      const salt = generateSalt();
      const newAccount: Account = {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        passwordHash: hashPasswordWithSalt(password, salt),
        salt,
      };
      const saved = await saveAccount(newAccount);
      if (!saved) {
        return false;
      }
      setAccount(newAccount);
      setHasAccount(true);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.warn('Account: failed to register', error);
      return false;
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      if (!account) {
        return false;
      }
      const ok = verifyCredentials(email, password, account);
      if (ok) {
        setIsAuthenticated(true);
      }
      return ok;
    },
    [account],
  );

  const logout = useCallback(() => setIsAuthenticated(false), []);

  const resetAccount = useCallback(async () => {
    const deleted = await deleteAccount();
    if (!deleted) {
      return false;
    }
    setAccount(null);
    setHasAccount(false);
    setIsAuthenticated(false);
    return true;
  }, []);

  const value = useMemo(
    () => ({ hasAccount, isAuthenticated, register, login, logout, resetAccount }),
    [hasAccount, isAuthenticated, register, login, logout, resetAccount],
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
