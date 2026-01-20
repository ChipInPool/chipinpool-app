import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Calendar, DollarSign, Pause, Play, Trash2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface RecurringContribution {
  id: string;
  poolId: string;
  userId: string;
  amount: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  status: string;
  nextPaymentDate: string;
  createdAt: string;
  pool?: {
    id: string;
    title: string;
    targetAmount: string;
    currentAmount: string;
  };
}

export default function Recurring() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["userRecurring"],
    queryFn: api.recurring.getUserRecurring,
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.recurring.cancel(id),
    onSuccess: () => {
      toast({ description: "Recurring contribution cancelled" });
      queryClient.invalidateQueries({ queryKey: ["userRecurring"] });
      setCancelDialogOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to cancel", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const contributions: RecurringContribution[] = data?.contributions || [];
  const activeContributions = contributions.filter(c => c.status === 'active');
  const pausedContributions = contributions.filter(c => c.status === 'paused');
  const cancelledContributions = contributions.filter(c => c.status === 'cancelled');

  const totalMonthlyAmount = activeContributions.reduce((sum, c) => {
    const amount = parseFloat(c.amount);
    switch (c.frequency) {
      case 'weekly': return sum + (amount * 4.33);
      case 'monthly': return sum + amount;
      case 'quarterly': return sum + (amount / 3);
      default: return sum;
    }
  }, 0);

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      default: return frequency;
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'monthly': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'quarterly': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-white/5 text-muted-foreground border-white/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/5 text-muted-foreground border-white/10';
    }
  };

  const handleCancelClick = (id: string) => {
    setSelectedId(id);
    setCancelDialogOpen(true);
  };

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/profile">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-display font-bold">Recurring Contributions</h1>
          </div>
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Failed to Load</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {(error as Error)?.message || "Something went wrong. Please try again later."}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/profile">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Recurring Contributions</h1>
              <p className="text-sm text-muted-foreground">Manage your automatic payments</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Play className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="text-3xl font-display font-bold">{activeContributions.length}</div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Monthly Total</span>
            </div>
            <div className="text-3xl font-display font-bold">
              ${totalMonthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/20">
                <RefreshCw className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Total Setups</span>
            </div>
            <div className="text-3xl font-display font-bold">{contributions.length}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold">Your Recurring Payments</h2>
          </div>

          {contributions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Recurring Contributions</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                Set up automatic contributions to pools you care about. Visit any pool to enable recurring payments.
              </p>
              <Button asChild>
                <Link href="/explore">Explore Pools</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="p-4 hover:bg-white/[0.02] transition-colors"
                  data-testid={`recurring-${contribution.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <Link
                          href={`/pool/${contribution.poolId}`}
                          className="font-semibold hover:text-primary transition-colors"
                          data-testid={`link-pool-${contribution.id}`}
                        >
                          {contribution.pool?.title || 'Pool'}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getFrequencyColor(contribution.frequency)}`}>
                            {getFrequencyLabel(contribution.frequency)}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contribution.status)}`}>
                            {contribution.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-display font-bold text-lg">
                          ${parseFloat(contribution.amount).toFixed(2)}
                        </div>
                        {contribution.status === 'active' && contribution.nextPaymentDate && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            Next: {format(new Date(contribution.nextPaymentDate), 'MMM d')}
                          </div>
                        )}
                      </div>
                      {contribution.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleCancelClick(contribution.id)}
                          data-testid={`button-cancel-${contribution.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Recurring Contribution</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this recurring contribution? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Keep Active
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedId && cancelMutation.mutate(selectedId)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Contribution"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
