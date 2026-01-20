import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Activity, DollarSign, Target, Users, MessageCircle, Star, RefreshCw, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  type: 'contribution' | 'pool_created' | 'pool_completed' | 'comment' | 'follow';
  userId: string;
  userName: string;
  userAvatar?: string;
  poolId?: string;
  poolTitle?: string;
  amount?: string;
  text?: string;
  createdAt: string;
}

export default function ActivityFeed() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'contributions' | 'pools'>('all');

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

  const activities: ActivityItem[] = data?.activities || [];

  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'contributions') return a.type === 'contribution';
    if (filter === 'pools') return ['pool_created', 'pool_completed'].includes(a.type);
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contribution': return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'pool_created': return <Target className="w-4 h-4 text-primary" />;
      case 'pool_completed': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'follow': return <Users className="w-4 h-4 text-purple-400" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'contribution':
        return <>contributed <span className="text-green-400 font-semibold">${parseFloat(activity.amount || '0').toFixed(2)}</span> to</>;
      case 'pool_created':
        return <>created a new pool</>;
      case 'pool_completed':
        return <>completed the pool</>;
      case 'comment':
        return <>commented on</>;
      case 'follow':
        return <>started following someone</>;
      default:
        return <>did something</>;
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Activity Feed</h1>
              <p className="text-sm text-muted-foreground">See what people you follow are doing</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'contributions', 'pools'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter !== f ? 'border-white/10' : ''}
              data-testid={`filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        <div className="rounded-2xl bg-card border border-white/5 overflow-hidden">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Activity Yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                {filter === 'all' 
                  ? "Follow people to see their activity here, or explore pools to get started."
                  : "No matching activities found."}
              </p>
              <Button asChild>
                <Link href="/explore">Explore Pools</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-white/[0.02] transition-colors"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="flex items-start gap-4">
                    <Link href={`/user/${activity.userId}`}>
                      <Avatar className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                        <AvatarImage src={activity.userAvatar} />
                        <AvatarFallback>{activity.userName?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/user/${activity.userId}`} className="font-semibold hover:text-primary transition-colors">
                          {activity.userName}
                        </Link>
                        <span className="text-muted-foreground">{getActivityText(activity)}</span>
                        {activity.poolTitle && activity.poolId && (
                          <Link href={`/pool/${activity.poolId}`} className="text-primary hover:underline font-medium truncate">
                            {activity.poolTitle}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {getActivityIcon(activity.type)}
                        <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
