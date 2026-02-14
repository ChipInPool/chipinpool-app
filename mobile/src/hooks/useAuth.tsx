import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, clearSessionCookie } from '@/services/api';
import { registerForPushNotifications } from '@/services/pushNotifications';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  walletBalance?: string;
  balance: string;
  kycStatus: string;
  avatar?: string;
  role?: string;
  notifyPush?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  sendOTP: (identifier: string, method?: 'email' | 'phone') => Promise<{ deliveryMethod: string; maskedTarget: string; message: string }>;
  verifyOTP: (identifier: string, code: string) => Promise<{ mfaRequired?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.auth.me();
        setUser(userData);
        registerForPushNotifications().catch(err => console.log('[Push] Registration failed:', err));
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
    setUser(result);
    registerForPushNotifications().catch(err => console.log('[Push] Registration failed:', err));
  };

  const loginWithUsername = async (username: string, password: string) => {
    const result = await api.auth.loginUsername(username, password);
    setUser(result);
    registerForPushNotifications().catch(err => console.log('[Push] Registration failed:', err));
  };

  const sendOTP = async (identifier: string, method: 'email' | 'phone' = 'email') => {
    const result = await api.auth.sendOTP(identifier, method);
    return result;
  };

  const verifyOTP = async (identifier: string, code: string): Promise<{ mfaRequired?: boolean }> => {
    const result = await api.auth.verifyOTP(identifier, code);
    setUser(result);
    registerForPushNotifications().catch(err => console.log('[Push] Registration failed:', err));
    return {};
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
        loginWithUsername,
        sendOTP,
        verifyOTP,
        logout,
        refreshUser,
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
