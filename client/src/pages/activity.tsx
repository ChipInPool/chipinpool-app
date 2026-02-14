import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, PlusCircle, ShoppingBag, ArrowRightLeft, Activity, RefreshCw, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'contribution', label: 'Contributions' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'spend', label: 'Spending' },
  { key: 'transfer', label: 'Transfers' },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'contribution':
      return { icon: ArrowUpCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    case 'withdrawal':
      return { icon: ArrowDownCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    case 'deposit':
      return { icon: PlusCircle, color: 'text-teal-400', bg: 'bg-teal-400/10' };
    case 'spend':
      return { icon: ShoppingBag, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    case 'pool_transfer':
    case 'pool_withdrawal':
      return { icon: ArrowRightLeft, color: 'text-amber-400', bg: 'bg-amber-400/10' };
    default:
      return { icon: Activity, color: 'text-muted-foreground', bg: 'bg-white/5' };
  }
}

export default function ActivityFeed() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activityFeed"],
    queryFn: async () => {
      const res = await fetch("/api/activity-feed", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load activity");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const items: any[] = data?.activities || (Array.isArray(data) ? data : []);

  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    items.forEach((item: any) => {
      const amt = parseFloat(item.amount || '0');
      if (item.direction === 'in') {
        totalIn += amt;
      } else {
        totalOut += amt;
      }
    });
    return { totalIn, totalOut };
  }, [items]);

  const filteredActivities = useMemo(() => {
    if (activeFilter === 'all') return items;
    if (activeFilter === 'transfer') {
      return items.filter((item: any) => item.type === 'pool_transfer' || item.type === 'pool_withdrawal');
    }
    return items.filter((item: any) => item.type === activeFilter);
  }, [items, activeFilter]);

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-display font-bold">Activity Feed</h1>
          </div>
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Failed to Load</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {(error as Error)?.message || "Something went wrong."}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">Activity Feed</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Your transaction history</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-card border border-white/5">
            <p className="text-xs text-muted-foreground mb-1">Money In</p>
            <p className="text-xl font-bold text-emerald-400" data-testid="text-total-in">+${summary.totalIn.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-white/5">
            <p className="text-xs text-muted-foreground mb-1">Money Out</p>
            <p className="text-xl font-bold text-red-400" data-testid="text-total-out">-${summary.totalOut.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              data-testid={`button-filter-${f.key}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                activeFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-card border border-white/5 overflow-hidden">
          {filteredActivities.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2" data-testid="text-empty-title">No Activity Yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                {activeFilter === 'all'
                  ? "Start by creating a pool or depositing to your wallet."
                  : "No matching activities found."}
              </p>
              <Button asChild>
                <Link href="/explore">Explore Pools</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredActivities.map((item: any, index: number) => {
                const { icon: Icon, color, bg } = getActivityIcon(item?.type ?? '');
                const amt = parseFloat(item?.amount || '0');
                const isIn = item?.direction === 'in';
                const amountText = isIn ? `+$${Math.abs(amt).toFixed(2)}` : `-$${Math.abs(amt).toFixed(2)}`;
                const amountColor = isIn ? 'text-emerald-400' : 'text-red-400';

                return (
                  <div
                    key={item.id || index}
                    className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors"
                    data-testid={`card-activity-${item.id || index}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-description-${item.id || index}`}>
                          {item?.description || item?.type || 'Activity'}
                        </p>
                        {item?.poolTitle && (
                          <p className="text-xs text-primary truncate" data-testid={`text-pool-${item.id || index}`}>
                            {item.poolTitle}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(item?.createdAt || new Date().toISOString())}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${amountColor} shrink-0`} data-testid={`text-amount-${item.id || index}`}>
                        {amountText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
