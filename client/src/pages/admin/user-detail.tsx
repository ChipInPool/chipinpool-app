import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, UserX, UserCheck, Mail, Phone, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface UserDetail {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    location: string;
    bio: string;
    kycStatus: string;
    role: string;
    suspended: boolean;
    suspendedReason: string;
    balance: string;
    poolsCreated: number;
    totalContributed: string;
    createdAt: string;
  };
  pools: any[];
  contributions: any[];
}

async function fetchUserDetail(userId: string): Promise<UserDetail> {
  const response = await fetch(`/api/admin/users/${userId}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch user details");
  return response.json();
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => fetchUserDetail(id!),
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ action }: { action: "suspend" | "unsuspend" }) => {
      const response = await fetch(`/api/admin/users/${id}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin action" }),
      });
      if (!response.ok) throw new Error("Action failed");
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ description: `User ${action === "suspend" ? "suspended" : "unsuspended"} successfully` });
    },
    onError: () => {
      toast({ description: "Action failed", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">User not found or access denied</p>
          <Link href="/admin/users">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { user, pools, contributions } = data;

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
      <div className="mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display font-bold">{user.firstName} {user.lastName}</h1>
                {user.suspended && <Badge variant="destructive">Suspended</Badge>}
                {user.role === "admin" && <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>}
              </div>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          {user.role !== "admin" && (
            user.suspended ? (
              <Button
                variant="outline"
                onClick={() => suspendMutation.mutate({ action: "unsuspend" })}
                disabled={suspendMutation.isPending}
                data-testid="button-unsuspend-user"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Unsuspend User
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => suspendMutation.mutate({ action: "suspend" })}
                disabled={suspendMutation.isPending}
                data-testid="button-suspend-user"
              >
                <UserX className="w-4 h-4 mr-2" />
                Suspend User
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{user.phone}</span>
            </div>
            {user.dateOfBirth && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(user.dateOfBirth), "MMMM d, yyyy")}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{user.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">KYC Status</span>
              {getKycBadge(user.kycStatus)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Joined</span>
              <span>{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-medium">${parseFloat(user.balance).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle>Activity Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pools Created</span>
              <span className="font-medium">{user.poolsCreated}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Contributed</span>
              <span className="font-medium">${parseFloat(user.totalContributed).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contributions Made</span>
              <span className="font-medium">{contributions.length}</span>
            </div>
          </CardContent>
        </Card>

        {user.suspended && user.suspendedReason && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400">Suspension Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{user.suspendedReason}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {pools.length > 0 && (
        <Card className="mt-6 bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle>User's Pools ({pools.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pools.map((pool: any) => (
                <div key={pool.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                  <div>
                    <span className="font-medium">{pool.title}</span>
                    <span className="text-sm text-muted-foreground ml-2">({pool.status})</span>
                  </div>
                  <span>${parseFloat(pool.current).toLocaleString()} / ${parseFloat(pool.target).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
