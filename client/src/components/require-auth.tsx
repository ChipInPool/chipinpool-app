import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading)
    return (
      <div
        role="status"
        className="min-h-screen bg-background text-foreground flex items-center justify-center"
      >
        Loading your account…
      </div>
    );
  if (!isAuthenticated) return <Redirect to="/login?redirect=security" />;
  return <>{children}</>;
}
