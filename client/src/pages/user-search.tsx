import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Users, UserPlus, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserSearch() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results, isLoading } = useQuery({
    queryKey: queryKeys.userSearch(debouncedQuery),
    queryFn: () => api.users.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const users = (results as any)?.users || results || [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-1 sm:px-0">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-display font-bold">Find People</h1>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl"
            data-testid="input-search-users"
          />
        </div>

        {debouncedQuery.length < 2 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Search for users by name or username</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Enter at least 2 characters to search</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 2 && (
          <div className="space-y-2">
            {users.length > 0 ? (
              users.map((user: any) => (
                <Link key={user.id} href={`/profile/${user.username}`}>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-white/5 hover:bg-white/5 transition-colors cursor-pointer" data-testid={`card-user-${user.id}`}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-muted-foreground">@{user.username}</div>
                      {user.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>}
                    </div>
                    {!user.isPublic && (
                      <span className="text-xs text-muted-foreground">Private</span>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found for "{debouncedQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
