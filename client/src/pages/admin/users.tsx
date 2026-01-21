import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, UserX, UserCheck, Eye } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  kycStatus: string;
  role: string;
  suspended: boolean;
  poolsCreated: number;
  totalContributed: string;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchUsers(page: number, search: string): Promise<UsersResponse> {
  const params = new URLSearchParams({ page: page.toString(), limit: "20" });
  if (search) params.append("search", search);
  
  const response = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () => fetchUsers(page, search),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "suspend" | "unsuspend" }) => {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin action" }),
      });
      if (!response.ok) throw new Error("Action failed");
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ description: `User ${action === "suspend" ? "suspended" : "unsuspended"} successfully` });
    },
    onError: () => {
      toast({ description: "Action failed", variant: "destructive" });
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const getKycBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      verified: { className: "bg-green-500/10 text-green-500 border-green-500/30", label: "Verified" },
      pending: { className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", label: "Pending" },
      failed: { className: "bg-red-500/10 text-red-500 border-red-500/30", label: "Failed" },
      not_started: { className: "bg-gray-500/10 text-gray-500 border-gray-500/30", label: "Not Started" },
    };
    const variant = variants[status] || variants.not_started;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage all users</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or username..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            data-testid="input-admin-user-search"
          />
        </div>
        <Button onClick={handleSearch} data-testid="button-admin-search">
          Search
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data?.users.map((user) => (
              <Card key={user.id} className="bg-card/50 border-white/10" data-testid={`user-row-${user.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.firstName} {user.lastName}</span>
                          {user.suspended && (
                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                          )}
                          {user.role === "admin" && (
                            <Badge className="bg-purple-500/20 text-purple-400 text-xs">Admin</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username} • {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div>{getKycBadge(user.kycStatus)}</div>
                        <div className="text-muted-foreground mt-1">
                          Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-view-${user.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {user.role !== "admin" && (
                          user.suspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => suspendMutation.mutate({ userId: user.id, action: "unsuspend" })}
                              disabled={suspendMutation.isPending}
                              data-testid={`button-unsuspend-${user.id}`}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-400"
                              onClick={() => suspendMutation.mutate({ userId: user.id, action: "suspend" })}
                              disabled={suspendMutation.isPending}
                              data-testid={`button-suspend-${user.id}`}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}

          {data?.users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
