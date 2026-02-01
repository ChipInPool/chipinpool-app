import { queryOptions } from "@tanstack/react-query";

async function fetchApi(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi("/api/auth/login", {
        method: "POST",
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
      fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sendPhoneCode: (phone: string) =>
      fetchApi("/api/auth/send-phone-code", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
    verifyPhoneCode: (phone: string, code: string) =>
      fetchApi("/api/auth/verify-phone-code", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      }),
    logout: () => fetchApi("/api/auth/logout", { method: "POST" }),
    me: () => fetchApi("/api/auth/me"),
  },
  pools: {
    list: () => fetchApi("/api/pools"),
    get: (id: string) => fetchApi(`/api/pools/${id}`),
    create: (data: any) =>
      fetchApi("/api/pools", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { title?: string; description?: string; targetAmount?: string; deadline?: string }) =>
      fetchApi(`/api/pools/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    contribute: (id: string, amount: string) =>
      fetchApi(`/api/pools/${id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    checkout: (id: string, amount: string) =>
      fetchApi(`/api/pools/${id}/checkout`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    invite: (id: string, method: 'email' | 'sms' | 'push', recipients: string[]) =>
      fetchApi(`/api/pools/${id}/invite`, {
        method: "POST",
        body: JSON.stringify({ method, recipients }),
      }),
  },
  myFollowers: () => fetchApi("/api/my-followers"),
  stripe: {
    getConfig: () => fetchApi("/api/stripe/config"),
  },
  comments: {
    create: (poolId: string, text: string) =>
      fetchApi(`/api/pools/${poolId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    like: (id: string) =>
      fetchApi(`/api/comments/${id}/like`, { method: "POST" }),
  },
  notifications: {
    list: () => fetchApi("/api/notifications"),
    markAllRead: () =>
      fetchApi("/api/notifications/mark-all-read", { method: "POST" }),
  },
  virtualCards: {
    get: (poolId: string) => fetchApi(`/api/pools/${poolId}/virtual-card`),
    getEphemeralKey: (poolId: string, nonce: string) => 
      fetchApi(`/api/pools/${poolId}/virtual-card/ephemeral-key`, {
        method: "POST",
        body: JSON.stringify({ nonce }),
      }),
    getTransactions: (cardId: string) =>
      fetchApi(`/api/virtual-cards/${cardId}/transactions`),
    createTransaction: (cardId: string, merchant: string, amount: string) =>
      fetchApi(`/api/virtual-cards/${cardId}/transactions`, {
        method: "POST",
        body: JSON.stringify({ merchant, amount }),
      }),
  },
  users: {
    getProfile: (userId: string) => fetchApi(`/api/users/${userId}/profile`),
    getPools: (userId: string) => fetchApi(`/api/users/${userId}/pools`),
    follow: (userId: string) =>
      fetchApi(`/api/users/${userId}/follow`, { method: "POST" }),
    unfollow: (userId: string) =>
      fetchApi(`/api/users/${userId}/follow`, { method: "DELETE" }),
    getFollowing: (userId: string) => fetchApi(`/api/users/${userId}/following`),
    getFollowers: (userId: string) => fetchApi(`/api/users/${userId}/followers`),
    deposit: (amount: string) =>
      fetchApi("/api/user/deposit", { method: "POST", body: JSON.stringify({ amount }) }),
    depositCheckout: (amount: string) =>
      fetchApi("/api/user/deposit/checkout", { method: "POST", body: JSON.stringify({ amount }) }),
    withdraw: (amount: string) =>
      fetchApi("/api/user/withdraw", { method: "POST", body: JSON.stringify({ amount }) }),
    getTransactionHistory: () => fetchApi("/api/user/transactions"),
    getWalletHistory: () => fetchApi("/api/user/wallet-history"),
  },
  recurring: {
    create: (poolId: string, amount: string, frequency: 'weekly' | 'monthly' | 'quarterly', startImmediately: boolean = true) =>
      fetchApi(`/api/pools/${poolId}/recurring`, { method: "POST", body: JSON.stringify({ amount, frequency, startImmediately }) }),
    getByPool: (poolId: string) => fetchApi(`/api/pools/${poolId}/recurring`),
    getUserRecurring: () => fetchApi("/api/user/recurring-contributions"),
    update: (id: string, data: { amount?: string; frequency?: 'weekly' | 'monthly' | 'quarterly'; status?: 'active' | 'paused' }) =>
      fetchApi(`/api/recurring/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    cancel: (id: string) => fetchApi(`/api/recurring/${id}`, { method: "DELETE" }),
  },
  plaid: {
    getLinkToken: () => fetchApi("/api/plaid/link-token", { method: "POST" }),
    exchangeToken: (publicToken: string, accountId: string) =>
      fetchApi("/api/plaid/exchange-token", { method: "POST", body: JSON.stringify({ publicToken, accountId }) }),
    getStatus: () => fetchApi("/api/plaid/status"),
    withdraw: (amount: string) =>
      fetchApi("/api/plaid/withdraw", { method: "POST", body: JSON.stringify({ amount }) }),
  },
  security: {
    getStatus: () => fetchApi("/api/security/status"),
    sendEmailVerification: () => 
      fetchApi("/api/security/email/send", { method: "POST" }),
    verifyEmail: (code: string) =>
      fetchApi("/api/security/email/verify", { method: "POST", body: JSON.stringify({ code }) }),
    sendPhoneVerification: (phone: string) =>
      fetchApi("/api/security/phone/send", { method: "POST", body: JSON.stringify({ phone }) }),
    verifyPhone: (code: string) =>
      fetchApi("/api/security/phone/verify", { method: "POST", body: JSON.stringify({ code }) }),
    setPin: (pin: string) =>
      fetchApi("/api/security/pin/set", { method: "POST", body: JSON.stringify({ pin }) }),
    verifyPin: (pin: string) =>
      fetchApi("/api/security/pin/verify", { method: "POST", body: JSON.stringify({ pin }) }),
    setup2FA: () =>
      fetchApi("/api/security/2fa/setup", { method: "POST" }),
    enable2FA: (code: string) =>
      fetchApi("/api/security/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }),
    disable2FA: (code: string) =>
      fetchApi("/api/security/2fa/disable", { method: "POST", body: JSON.stringify({ code }) }),
    startKYC: () =>
      fetchApi("/api/security/kyc/start", { method: "POST" }),
  },
};

export const queryKeys = {
  user: ["user"] as const,
  userProfile: (userId: string) => ["userProfile", userId] as const,
  pools: ["pools"] as const,
  pool: (id: string) => ["pool", id] as const,
  notifications: ["notifications"] as const,
  virtualCard: (poolId: string) => ["virtualCard", poolId] as const,
  cardTransactions: (cardId: string) => ["cardTransactions", cardId] as const,
  following: (userId: string) => ["following", userId] as const,
  followers: (userId: string) => ["followers", userId] as const,
  myFollowers: ["myFollowers"] as const,
  transactionHistory: ["transactionHistory"] as const,
  walletHistory: ["walletHistory"] as const,
};

export const userQueryOptions = queryOptions({
  queryKey: queryKeys.user,
  queryFn: api.auth.me,
  retry: false,
  staleTime: 5 * 60 * 1000,
});

export const poolsQueryOptions = queryOptions({
  queryKey: queryKeys.pools,
  queryFn: api.pools.list,
  staleTime: 30 * 1000,
});

export const notificationsQueryOptions = queryOptions({
  queryKey: queryKeys.notifications,
  queryFn: api.notifications.list,
  staleTime: 30 * 1000,
});
