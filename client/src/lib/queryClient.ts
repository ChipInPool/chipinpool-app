import { QueryClient, QueryCache, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Try to parse as JSON to get a cleaner error message
    try {
      const json = JSON.parse(text);
      const errorMessage = json.error || json.message || text;
      throw new Error(errorMessage);
    } catch {
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  // Surface query failures as a toast so a network/server error is distinct from
  // a genuinely empty result (which previously rendered the same empty state).
  queryCache: new QueryCache({
    onError: (error: any) => {
      const message = error?.message || "";
      // 401s are expected (logged-out) and handled by returnNull/redirects.
      if (/^401[:\s]/.test(message) || /unauthorized|not authenticated/i.test(message)) {
        return;
      }
      toast({
        title: "Couldn't load data",
        description: message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
