import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Users, Calendar, DollarSign, Target, Clock, PieChart, BarChart3, Activity, AlertCircle } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { format, formatDistanceToNow, differenceInDays, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

interface Contribution {
  id: string;
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  amount: string;
  createdAt: string;
}

export default function PoolAnalytics() {
  const [, params] = useRoute("/pool/:id/analytics");
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const { data: poolData, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.pool(params?.id || ''),
    queryFn: () => api.pools.get(params?.id || ''),
    enabled: !!params?.id && isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const pool = poolData?.pool;
  // Map contributors from pool data to contributions format
  const contributions: Contribution[] = (pool?.contributors || []).map((c: any) => ({
    id: c.id || crypto.randomUUID(),
    userId: c.user?.id || null,
    userName: c.user?.firstName ? `${c.user.firstName} ${c.user.lastName || ''}`.trim() : c.user?.name || 'Anonymous',
    userAvatar: c.user?.avatarUrl || c.user?.avatar || null,
    amount: c.amount,
    createdAt: c.date || c.createdAt,
  }));

  const progressPercentage = pool ? Math.min(100, (parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100) : 0;
  const daysRemaining = pool?.deadline ? differenceInDays(new Date(pool.deadline), new Date()) : 0;
  const avgContribution = contributions.length > 0 ? contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0) / contributions.length : 0;
  const uniqueContributors = new Set(contributions.map(c => c.userId || c.userName)).size;
  
  const topContributors = [...contributions]
    .reduce((acc, c) => {
      const key = c.userId || c.userName || 'Anonymous';
      if (!acc[key]) {
        acc[key] = { name: c.userName || 'Anonymous', avatar: c.userAvatar, total: 0, count: 0 };
      }
      acc[key].total += parseFloat(c.amount);
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { name: string; avatar: string | null; total: number; count: number }>);
  
  const sortedContributors = Object.entries(topContributors)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  const getWeeklyData = () => {
    if (contributions.length === 0) return [];
    
    const dates = contributions.map(c => new Date(c.createdAt));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date();
    
    const weeks = eachWeekOfInterval({ start: minDate, end: maxDate });
    
    return weeks.slice(-8).map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekContributions = contributions.filter(c => {
        const date = new Date(c.createdAt);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      });
      
      return {
        week: format(weekStart, 'MMM d'),
        amount: weekContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0),
        count: weekContributions.length,
      };
    });
  };

  const weeklyData = getWeeklyData();
  const maxWeeklyAmount = Math.max(...weeklyData.map(w => w.amount), 1);

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl mb-6" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !pool) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-display font-bold">Pool Analytics</h1>
          </div>
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Pool Not Found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {(error as Error)?.message || "The pool you're looking for doesn't exist."}
            </p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-1 sm:px-0">
        <div className="flex items-center justify-between mb-4 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href={`/pool/${pool.id}`}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold">{pool.title}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Pool Analytics & Insights</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-8">
          <div className="p-3 md:p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
              <span className="text-[10px] md:text-xs text-muted-foreground">Progress</span>
            </div>
            <div className="text-lg md:text-2xl font-display font-bold text-green-400">{progressPercentage.toFixed(1)}%</div>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
              <span className="text-[10px] md:text-xs text-muted-foreground">Contributors</span>
            </div>
            <div className="text-lg md:text-2xl font-display font-bold text-blue-400">{uniqueContributors}</div>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              <span className="text-[10px] md:text-xs text-muted-foreground">Avg. Contribution</span>
            </div>
            <div className="text-lg md:text-2xl font-display font-bold text-primary">${avgContribution.toFixed(2)}</div>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
              <span className="text-[10px] md:text-xs text-muted-foreground">Days Left</span>
            </div>
            <div className="text-lg md:text-2xl font-display font-bold text-purple-400">{Math.max(0, daysRemaining)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-8">
          <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" /> Weekly Contributions
            </h3>
            {weeklyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No contribution data yet
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyData.map((week, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-muted-foreground">{week.week}</div>
                    <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                        style={{ width: `${(week.amount / maxWeeklyAmount) * 100}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm font-medium">${week.amount.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-400" /> Top Contributors
            </h3>
            {sortedContributors.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No contributors yet
              </div>
            ) : (
              <div className="space-y-3">
                {sortedContributors.map(([key, data], i) => (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                      {data.avatar ? (
                        <img src={data.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        data.name[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">{data.name}</div>
                      <div className="text-xs text-muted-foreground">{data.count} contributions</div>
                    </div>
                    <div className="font-display font-bold text-primary">${data.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent" /> Pool Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-3 md:p-4 rounded-xl bg-white/5">
              <div className="text-[10px] md:text-xs text-muted-foreground mb-1">Total Raised</div>
              <div className="text-base md:text-xl font-display font-bold">${parseFloat(pool.currentAmount).toLocaleString()}</div>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-white/5">
              <div className="text-[10px] md:text-xs text-muted-foreground mb-1">Goal Amount</div>
              <div className="text-base md:text-xl font-display font-bold">${parseFloat(pool.targetAmount).toLocaleString()}</div>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-white/5">
              <div className="text-[10px] md:text-xs text-muted-foreground mb-1">Total Contributions</div>
              <div className="text-base md:text-xl font-display font-bold">{contributions.length}</div>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-white/5">
              <div className="text-[10px] md:text-xs text-muted-foreground mb-1">Created</div>
              <div className="text-base md:text-xl font-display font-bold">
                {pool.createdAt ? formatDistanceToNow(new Date(pool.createdAt), { addSuffix: true }) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
