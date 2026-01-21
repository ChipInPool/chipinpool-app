import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Layers, DollarSign, Clock, AlertTriangle, UserPlus, CreditCard, CheckCircle } from "lucide-react";
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

interface StripeData {
  payments: Array<{
    id: string;
    amount: number;
    type: string;
    userId: string | null;
    poolId: string | null;
    customerEmail: string | null;
    created: string;
  }>;
  identity: Array<{
    id: string;
    status: string;
    userId: string | null;
    created: string;
  }>;
  balance: {
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
  };
  summary: {
    totalPayments: number;
    totalAmount: number;
    walletDeposits: number;
    poolContributions: number;
    verifiedKyc: number;
    pendingKyc: number;
  };
  synced: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const response = await fetch("/api/admin/stats", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to fetch admin stats");
  }
  return response.json();
}

async function fetchStripeData(): Promise<StripeData> {
  const response = await fetch("/api/admin/stripe/all?days=7", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to fetch Stripe data");
  }
  return response.json();
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  const { data: stripeData, isLoading: stripeLoading } = useQuery({
    queryKey: ["admin", "stripe", "all"],
    queryFn: fetchStripeData,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (statsError) {
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

      {/* Real-time Stripe Data */}
      <div className="mt-8">
        <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Live Stripe Data (Last 7 Days)
          {stripeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        </h2>
        
        {stripeData && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stripe Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  ${stripeData.balance.available.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +${stripeData.balance.pending.reduce((sum, b) => sum + b.amount, 0).toFixed(2)} pending
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stripeData.summary.totalPayments}</div>
                <p className="text-xs text-muted-foreground">
                  ${stripeData.summary.totalAmount.toFixed(2)} total
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stripeData.summary.walletDeposits}</div>
                <p className="text-xs text-muted-foreground">
                  {stripeData.summary.poolContributions} pool contributions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  KYC Verified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stripeData.summary.verifiedKyc}</div>
                <p className="text-xs text-muted-foreground">
                  {stripeData.summary.pendingKyc} pending
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Payments Table */}
        {stripeData && stripeData.payments.length > 0 && (
          <Card className="mt-6 bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Amount</th>
                      <th className="text-left py-2 px-2">Customer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripeData.payments.slice(0, 10).map((payment) => (
                      <tr key={payment.id} className="border-b border-white/5">
                        <td className="py-2 px-2 text-muted-foreground">
                          {new Date(payment.created).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.type === 'wallet_deposit' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {payment.type === 'wallet_deposit' ? 'Wallet' : 'Pool'}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium">${payment.amount.toFixed(2)}</td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {payment.customerEmail || payment.userId || 'Guest'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
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
