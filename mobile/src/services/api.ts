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

async function clearSessionCookie() {
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

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    await saveSessionCookie(setCookie);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    me: () => fetchApi<any>('/api/auth/me'),
    login: (email: string, password: string) =>
      fetchApi<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
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
    verify2FA: (code: string) =>
      fetchApi<any>('/api/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
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
    list: () => fetchApi<any>('/api/pools'),
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
    getTransactions: () => fetchApi<any>('/api/wallet/transactions'),
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
    list: () => fetchApi<any>('/api/notifications'),
    markAllRead: () =>
      fetchApi<any>('/api/notifications/mark-all-read', { method: 'POST' }),
  },
  activity: {
    feed: () => fetchApi<any>('/api/activity-feed'),
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

export { clearSessionCookie, API_URL };
