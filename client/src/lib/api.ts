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
    register: (name: string, email: string, password: string) =>
      fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
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
  },
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
    getTransactions: (cardId: string) =>
      fetchApi(`/api/virtual-cards/${cardId}/transactions`),
  },
  users: {
    getPools: (userId: string) => fetchApi(`/api/users/${userId}/pools`),
    follow: (userId: string) =>
      fetchApi(`/api/users/${userId}/follow`, { method: "POST" }),
    unfollow: (userId: string) =>
      fetchApi(`/api/users/${userId}/unfollow`, { method: "POST" }),
  },
};

export const queryKeys = {
  user: ["user"] as const,
  pools: ["pools"] as const,
  pool: (id: string) => ["pool", id] as const,
  notifications: ["notifications"] as const,
  virtualCard: (poolId: string) => ["virtualCard", poolId] as const,
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
