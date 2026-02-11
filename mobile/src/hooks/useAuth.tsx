import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, clearSessionCookie } from '@/services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  balance: string;
  kycStatus: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  needs2FA: boolean;
  verify2FA: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingMfaUserId, setPendingMfaUserId] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const userData = await api.auth.me();
      setUser(userData);
      setNeeds2FA(false);
    } catch (error) {
      setUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    if (result.mfaRequired) {
      setNeeds2FA(true);
      setPendingMfaUserId(result.userId);
      return;
    }
    setUser(result);
    setNeeds2FA(false);
  };

  const verify2FA = async (code: string) => {
    const userData = await api.auth.verify2FA(code, pendingMfaUserId || '');
    setUser(userData);
    setNeeds2FA(false);
    setPendingMfaUserId(null);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      await clearSessionCookie();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        needs2FA,
        verify2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
