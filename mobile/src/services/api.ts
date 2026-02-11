import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://chipinpool-csekdvghcqepcthm.centralus-01.azurewebsites.net';
console.log('[API] Connecting to:', API_URL);

let sessionCookie: string | null = null;

async function loadSessionCookie() {
  try {
    sessionCookie = await SecureStore.getItemAsync('session_cookie');
  } catch (error) {
    console.error('Failed to load session cookie:', error);
  }
}

async function saveSessionCookie(cookie: string) {
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

loadSessionCookie();

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (sessionCookie) {
    (headers as Record<string, string>)['Cookie'] = sessionCookie;
  }

  const url = `${API_URL}${endpoint}`;
  console.log('[API] Request:', options.method || 'GET', endpoint);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

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
    const errorText = await response.text();
    console.error('[API] Error:', response.status, endpoint, errorText.substring(0, 200));
    let error: any;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: `Request failed (${response.status})` };
    }
    throw new Error(error.message || error.error || `Request failed (${response.status})`);
  }

  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text);
  } catch {
    console.error('[API] Invalid JSON response:', endpoint, text.substring(0, 200));
    return {} as T;
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
      return result.user;
    },
  },
  user: {
    getProfile: () => fetchApi<any>('/api/users/me'),
    updateProfile: (data: any) =>
      fetchApi<any>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  pools: {
    list: async () => {
      const result = await fetchApi<any>('/api/pools');
      return result.pools || [];
    },
    get: (id: string) => fetchApi<any>(`/api/pools/${id}`),
    create: (data: any) =>
      fetchApi<any>('/api/pools', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    contribute: (poolId: string, amount: number) =>
      fetchApi<any>(`/api/pools/${poolId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    getContributions: (poolId: string) => 
      fetchApi<any>(`/api/pools/${poolId}/contributions`),
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
  },
  wallet: {
    getBalance: () => fetchApi<any>('/api/wallet/balance'),
    deposit: (amount: number) =>
      fetchApi<any>('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    getTransactions: async () => {
      const result = await fetchApi<any>('/api/wallet/transactions');
      return result.transactions || [];
    },
  },
  bankAccounts: {
    list: () => fetchApi<any>('/api/bank-accounts'),
    link: () =>
      fetchApi<any>('/api/bank-accounts/link', { method: 'POST' }),
    completeLink: (accountId: string) =>
      fetchApi<any>('/api/bank-accounts/complete-link', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
      }),
    delete: (id: string) =>
      fetchApi<any>(`/api/bank-accounts/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) =>
      fetchApi<any>(`/api/bank-accounts/${id}/set-default`, { method: 'POST' }),
  },
  stripe: {
    getConfig: () => fetchApi<{ publishableKey: string }>('/api/stripe/config'),
    getConnectStatus: () => fetchApi<any>('/api/stripe/connect/status'),
    createOnboardingLink: () =>
      fetchApi<{ url: string }>('/api/stripe/connect/onboard', { method: 'POST' }),
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
