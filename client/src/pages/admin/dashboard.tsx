import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Layers, DollarSign, Clock, AlertTriangle, UserPlus } from "lucide-react";
import { Loader2 } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activePools: number;
  completedPools: number;
  totalContributions: number;
  pendingKyc: number;
  suspendedUsers: number;
  recentSignups: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const response = await fetch("/api/admin/stats", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to fetch admin stats");
  }
  return response.json();
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
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

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500" },
    { label: "Active Pools", value: stats?.activePools || 0, icon: Layers, color: "text-green-500" },
    { label: "Completed Pools", value: stats?.completedPools || 0, icon: Layers, color: "text-purple-500" },
    { label: "Total Contributions", value: `$${(stats?.totalContributions || 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Pending KYC", value: stats?.pendingKyc || 0, icon: Clock, color: "text-yellow-500" },
    { label: "Recent Signups (30d)", value: stats?.recentSignups || 0, icon: UserPlus, color: "text-cyan-500" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of ChipIn platform metrics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-card/50 border-white/10" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.suspendedUsers ? (
        <Card className="mt-6 bg-red-500/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium">Suspended Accounts</p>
                <p className="text-sm text-muted-foreground">
                  {stats.suspendedUsers} user(s) currently suspended
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </AdminLayout>
  );
}
