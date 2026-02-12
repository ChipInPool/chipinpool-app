import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://chipinpool-csekdvghcqepcthm.centralus-01.azurewebsites.net';
console.log('[API] Connecting to:', API_URL);

let sessionCookie: string | null = null;
let cookieLoadPromise: Promise<void> | null = null;

async function loadSessionCookie() {
  try {
    sessionCookie = await SecureStore.getItemAsync('session_cookie');
  } catch (error) {
    console.error('Failed to load session cookie:', error);
  }
}

cookieLoadPromise = loadSessionCookie();

async function ensureCookieLoaded() {
  if (cookieLoadPromise) {
    await cookieLoadPromise;
    cookieLoadPromise = null;
  }
}

export async function saveSessionCookie(cookie: string) {
  try {
    sessionCookie = cookie;
    await SecureStore.setItemAsync('session_cookie', cookie);
  } catch (error) {
    console.error('Failed to save session cookie:', error);
  }
}

export async function clearSessionCookie() {
  try {
    sessionCookie = null;
    await SecureStore.deleteItemAsync('session_cookie');
  } catch (error) {
    console.error('Failed to clear session cookie:', error);
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    await ensureCookieLoaded();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (sessionCookie) {
      (headers as Record<string, string>)['Cookie'] = sessionCookie;
    }

    const url = `${API_URL}${endpoint}`;
    console.log('[API] Request:', options.method || 'GET', endpoint);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (networkError: any) {
      console.error('[API] Network error:', endpoint, networkError?.message);
      throw new Error('Network error. Please check your connection and try again.');
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const sidMatch = setCookie.match(/connect\.sid=([^;]+)/);
      if (sidMatch) {
        await saveSessionCookie(`connect.sid=${sidMatch[1]}`);
      } else {
        await saveSessionCookie(setCookie.split(';')[0]);
      }
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {}
      console.error('[API] Error:', response.status, endpoint, errorText.substring(0, 200));

      if (response.status === 401) {
        sessionCookie = null;
        try { await SecureStore.deleteItemAsync('session_cookie'); } catch {}
        throw new Error('Unauthorized');
      }

      let error: any;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: `Request failed (${response.status})` };
      }
      throw new Error(error.message || error.error || `Request failed (${response.status})`);
    }

    let text = '';
    try {
      text = await response.text();
    } catch {
      console.error('[API] Failed to read response body:', endpoint);
      return {} as T;
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text);
    } catch {
      console.error('[API] Invalid JSON response:', endpoint, text.substring(0, 200));
      return {} as T;
    }
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message?.includes('Network error') || error?.message?.includes('Request failed')) {
      throw error;
    }
    console.error('[API] Unexpected error in fetchApi:', endpoint, error?.message);
    throw new Error(error?.message || 'An unexpected error occurred');
  }
}

export const api = {
  auth: {
    me: async () => {
      const result = await fetchApi<any>('/api/auth/me');
      return result.user;
    },
    login: async (email: string, password: string) => {
      const result = await fetchApi<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.sessionToken) {
        await saveSessionCookie(result.sessionToken);
      }
      if (result.mfaRequired) {
        return result;
      }
      return result.user;
    },
    loginUsername: async (username: string, password: string) => {
      const result = await fetchApi<any>('/api/auth/login-username', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (result.sessionToken) {
        await saveSessionCookie(result.sessionToken);
      }
      if (result.mfaRequired) {
        return result;
      }
      return result.user;
    },
    register: (data: {
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      password: string;
      phone: string;
      dateOfBirth: string;
      phoneVerificationCode: string;
      acceptTerms: boolean;
    }) =>
      fetchApi<any>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendPhoneCode: (phone: string) =>
      fetchApi<any>('/api/auth/send-phone-code', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyPhoneCode: (phone: string, code: string) =>
      fetchApi<any>('/api/auth/verify-phone-code', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),
    sendOTP: (identifier: string, method: 'email' | 'phone' = 'email') =>
      fetchApi<any>('/api/auth/otp-login/send', {
        method: 'POST',
        body: JSON.stringify({ identifier, method }),
      }),
    verifyOTP: async (identifier: string, code: string) => {
      const result = await fetchApi<any>('/api/auth/otp-login/verify', {
        method: 'POST',
        body: JSON.stringify({ identifier, code }),
      });
      if (result.sessionToken) {
        await saveSessionCookie(result.sessionToken);
      }
      if (result.mfaRequired) {
        return result;
      }
      return result.user;
    },
    logout: async () => {
      const result = await fetchApi<any>('/api/auth/logout', { method: 'POST' });
      await clearSessionCookie();
      return result;
    },
    verify2FA: async (code: string, userId: string) => {
      const result = await fetchApi<any>('/api/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({ code, userId }),
      });
      if (result.sessionToken) {
        await saveSessionCookie(result.sessionToken);
      }
      return result.user;
    },
  },
  user: {
    getProfile: () => fetchApi<any>('/api/auth/me').then((r: any) => r.user || r),
    updateProfile: (data: any) =>
      fetchApi<any>('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getNotificationPreferences: () => fetchApi<any>('/api/user/notification-preferences'),
    updateNotificationPreferences: (data: any) =>
      fetchApi<any>('/api/user/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    registerPushToken: (token: string) =>
      fetchApi<any>('/api/user/push-token', { method: 'POST', body: JSON.stringify({ token, platform: Platform.OS }) }),
  },
  pools: {
    list: async () => {
      const result = await fetchApi<any>('/api/pools');
      return result.pools || [];
    },
    get: async (id: string) => {
      const result = await fetchApi<any>(`/api/pools/${id}`);
      return result.pool || result;
    },
    create: (data: any) =>
      fetchApi<any>('/api/pools', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    contribute: (poolId: string, amount: string) =>
      fetchApi<any>(`/api/pools/${poolId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    getContributions: async (poolId: string) => {
      const result = await fetchApi<any>(`/api/pools/${poolId}/contributors`);
      return result.contributors || result || [];
    },
    checkout: (poolId: string, amount: string) =>
      fetchApi<{ url: string }>(`/api/pools/${poolId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    refundAll: (poolId: string, closePool?: boolean) =>
      fetchApi<any>(`/api/pools/${poolId}/refund-all`, {
        method: 'POST',
        body: JSON.stringify({ closePool }),
      }),
    distribute: (poolId: string, distributions: {userId: string, amount: string}[], closePool?: boolean) =>
      fetchApi<any>(`/api/pools/${poolId}/distribute`, {
        method: 'POST',
        body: JSON.stringify({ distributions, closePool }),
      }),
    contributeBank: (poolId: string, amount: string, bankAccountId: string) =>
      fetchApi<any>(`/api/pools/${poolId}/contribute-bank`, {
        method: 'POST',
        body: JSON.stringify({ amount, bankAccountId }),
      }),
    transfer: (poolId: string, data: { toUserId: string; amount: string; bankAccountId?: string; payoutSpeed?: string; notes?: string }) =>
      fetchApi<any>(`/api/pools/${poolId}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getActivity: async (poolId: string) => {
      const result = await fetchApi<any>(`/api/pools/${poolId}/activity`);
      return result;
    },
    update: (poolId: string, data: { title?: string; description?: string; targetAmount?: string; deadline?: string; status?: string }) =>
      fetchApi(`/api/pools/${poolId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  wallet: {
    getBalance: () => fetchApi<any>('/api/auth/me').then((r: any) => {
      const user = r.user || r;
      return { balance: user.walletBalance || '0.00' };
    }),
    deposit: (amount: string) =>
      fetchApi<any>('/api/user/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    withdraw: (amount: string, savedMethodId: string) =>
      fetchApi<any>('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, savedMethodId }),
      }),
    depositCheckout: (amount: string) =>
      fetchApi<any>('/api/user/deposit/checkout', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    getTransactions: async () => {
      const result = await fetchApi<any>('/api/user/wallet-history');
      return result.transactions || result.history || [];
    },
  },
  bankAccounts: {
    list: () => fetchApi<any>('/api/bank-accounts'),
    createLinkSession: () =>
      fetchApi<{ clientSecret: string; setupIntentId: string }>('/api/stripe/financial-connections/create-session', { method: 'POST' }),
    completeLink: (accountId: string, setupIntentId: string) =>
      fetchApi<any>('/api/stripe/financial-connections/complete', {
        method: 'POST',
        body: JSON.stringify({ accountId, setupIntentId }),
      }),
    delete: (id: string) =>
      fetchApi<any>(`/api/bank-accounts/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) =>
      fetchApi<any>(`/api/bank-accounts/${id}/default`, { method: 'PUT' }),
  },
  stripe: {
    getConfig: () => fetchApi<{ publishableKey: string }>('/api/stripe/config'),
    getConnectStatus: () => fetchApi<any>('/api/stripe/connect/status'),
    createOnboardingLink: () =>
      fetchApi<{ url: string }>('/api/stripe/connect/onboarding-link', { method: 'POST' }),
    createFinancialConnectionsSession: () =>
      fetchApi<{ clientSecret: string; setupIntentId: string }>('/api/stripe/financial-connections/create-session', { method: 'POST' }),
    completeFinancialConnections: (accountId: string, setupIntentId: string) =>
      fetchApi<any>('/api/stripe/financial-connections/complete', {
        method: 'POST',
        body: JSON.stringify({ accountId, setupIntentId }),
      }),
  },
  payoutMethods: {
    list: () => fetchApi<any>('/api/payout-methods'),
    delete: (id: string) => fetchApi<any>(`/api/payout-methods/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) => fetchApi<any>(`/api/payout-methods/${id}/set-default`, { method: 'POST' }),
  },
  security: {
    getStatus: () => fetchApi<any>('/api/security/status'),
    startKYC: () =>
      fetchApi<any>('/api/security/kyc/start', { method: 'POST' }),
  },
  virtualCards: {
    get: (poolId: string) => fetchApi<any>(`/api/pools/${poolId}/virtual-card`),
    getDetails: (cardId: string, nonce: string) =>
      fetchApi<any>(`/api/virtual-cards/${cardId}/details`, {
        method: 'POST',
        body: JSON.stringify({ nonce }),
      }),
  },
  partners: {
    list: (category?: string, search?: string) => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      const query = params.toString();
      return fetchApi<any>(`/api/partners${query ? `?${query}` : ''}`);
    },
    categories: () => fetchApi<any>('/api/partners/categories'),
    get: (id: string) => fetchApi<any>(`/api/partners/${id}`),
  },
  notifications: {
    list: async () => {
      const result = await fetchApi<any>('/api/notifications');
      return result.notifications || [];
    },
    markAllRead: () =>
      fetchApi<any>('/api/notifications/mark-all-read', { method: 'POST' }),
  },
  activity: {
    feed: async () => {
      const result = await fetchApi<any>('/api/activity-feed');
      return result.activities || [];
    },
  },
  rewards: {
    badges: () => fetchApi<any>('/api/rewards/badges'),
    myBadges: () => fetchApi<any>('/api/rewards/my-badges'),
    points: () => fetchApi<any>('/api/rewards/points'),
    history: () => fetchApi<any>('/api/rewards/history'),
    leaderboard: () => fetchApi<any>('/api/rewards/leaderboard'),
    initBadges: () =>
      fetchApi<any>('/api/rewards/init-badges', { method: 'POST' }),
  },
  recurring: {
    list: () => fetchApi<any>('/api/user/recurring-contributions'),
    create: (poolId: string, amount: string, frequency: string, startImmediately: boolean = true, paymentMethod: 'wallet' | 'bank' = 'wallet', bankAccountId?: string) =>
      fetchApi<any>(`/api/pools/${poolId}/recurring`, {
        method: 'POST',
        body: JSON.stringify({ amount, frequency, startImmediately, paymentMethod, bankAccountId }),
      }),
    update: (id: string, data: any) =>
      fetchApi<any>(`/api/recurring/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<any>(`/api/recurring/${id}`, { method: 'DELETE' }),
  },
};

export default api;
