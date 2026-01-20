import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { PoolCard } from "@/components/pool-card";
import { ArrowRight, Plus, Wallet, TrendingUp, Users, CreditCard, Bell, Clock, DollarSign, Activity, Expand } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: poolsData, isLoading: poolsLoading } = useQuery({
    queryKey: queryKeys.pools,
    queryFn: api.pools.list,
    enabled: isAuthenticated,
  });

  const { data: notificationsData } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications.list,
    enabled: isAuthenticated,
  });

  const { data: activityData } = useQuery({
    queryKey: ["activityFeed"],
    queryFn: () => fetch("/api/activity-feed", { credentials: "include" }).then(r => r.json()),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const pools = poolsData?.pools || [];
  const notifications = notificationsData?.notifications || [];
  const activities = activityData?.activities || [];

  const myPools = pools.filter((p: any) => p.creatorId === user?.id);
  const contributedPools = pools.filter((p: any) => p.creatorId !== user?.id);
  const activePools = myPools.filter((p: any) => p.status === 'active');
  const recentNotifications = notifications.slice(0, 5);

  const totalContributed = user?.totalContributed ? parseFloat(user.totalContributed) : 0;
  const poolsCreatedCount = user?.poolsCreated || 0;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/welcome");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <Skeleton className="h-[400px] w-full max-w-4xl rounded-3xl" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">Here's what's happening with your pools and wallet.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">${parseFloat(user?.balance || '0').toLocaleString()}</div>
            <Link href="/profile?action=deposit">
              <p className="text-xs text-primary hover:underline cursor-pointer mt-1">+ Add funds</p>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Pools</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePools.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{myPools.length} total created</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contributed</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">${totalContributed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {contributedPools.length} pools</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pools Created</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poolsCreatedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{activePools.length} currently active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link href="/create">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer text-center" data-testid="quick-action-create-pool">
                <Plus className="w-6 h-6 mx-auto mb-2 text-primary" />
                <span className="text-sm font-medium">New Pool</span>
              </div>
            </Link>
            <Link href="/profile?action=deposit">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer text-center" data-testid="quick-action-deposit">
                <Wallet className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <span className="text-sm font-medium">Deposit</span>
              </div>
            </Link>
            <Link href="/explore">
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer text-center" data-testid="quick-action-explore">
                <Users className="w-6 h-6 mx-auto mb-2 text-accent" />
                <span className="text-sm font-medium">Explore</span>
              </div>
            </Link>
            <Link href="/profile">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer text-center" data-testid="quick-action-profile">
                <CreditCard className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <span className="text-sm font-medium">My Cards</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold">Your Pools</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" asChild>
              <Link href="/explore">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {poolsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[200px] rounded-xl" />
              ))}
            </div>
          ) : myPools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-muted-foreground mb-4">You haven't created any pools yet</p>
              <Button asChild>
                <Link href="/create"><Plus className="w-4 h-4 mr-2" /> Create Your First Pool</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPools.slice(0, 4).map((pool: any) => (
                <PoolCard key={pool.id} pool={pool} />
              ))}
            </div>
          )}

          {contributedPools.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-xl font-display font-bold">Pools You've Joined</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contributedPools.slice(0, 4).map((pool: any) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Friend Activity
              </h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" asChild>
                <Link href="/activity"><Expand className="w-4 h-4 mr-1" /> Expand</Link>
              </Button>
            </div>
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No activity from friends yet</p>
                    <p className="text-xs mt-1">Follow people to see their contributions here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {activities.slice(0, 4).map((activity: any) => (
                      <Link key={activity.id} href={`/pool/${activity.poolId}`}>
                        <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={activity.userAvatar} />
                              <AvatarFallback>{activity.userName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-medium">{activity.userName}</span>
                                <span className="text-muted-foreground"> chipped in </span>
                                <span className="text-green-400 font-semibold">${parseFloat(activity.amount).toFixed(2)}</span>
                              </p>
                              <p className="text-xs text-muted-foreground truncate">to {activity.poolTitle}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Bell className="w-5 h-5" /> Notifications
              </h2>
            </div>
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-0">
                {recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No recent notifications
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {recentNotifications.map((notification: any) => (
                      <Link key={notification.id} href={notification.link || '#'}>
                        <div className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-white/5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{notification.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Contributors</h3>
            <div className="flex -space-x-2">
              {pools.slice(0, 5).flatMap((p: any) => p.contributors || []).slice(0, 8).map((contributor: any, i: number) => (
                <Link key={`${contributor.id}-${i}`} href={`/user/${contributor.id}`}>
                  <Avatar className="w-8 h-8 border-2 border-background hover:z-10 hover:scale-110 transition-transform cursor-pointer">
                    <AvatarImage src={contributor.avatar || undefined} />
                    <AvatarFallback className="text-xs">{contributor.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
