import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { PoolCard } from "@/components/pool-card";
import { ArrowRight, Plus, Wallet, TrendingUp, Users, CreditCard, Bell, Clock, DollarSign, Activity, Expand, Compass, Sparkles, Archive } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { GuidedTour } from "@/components/guided-tour";
import { FeatureTooltip } from "@/components/feature-tooltip";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showTour, setShowTour] = useState(false);

  const greeting = useMemo(() => getTimeGreeting(), []);

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

  const { data: discoverData, isLoading: discoverLoading } = useQuery({
    queryKey: queryKeys.discoverPools,
    queryFn: api.pools.discover,
    enabled: isAuthenticated,
  });

  const { data: activityData } = useQuery({
    queryKey: ["activityFeed"],
    queryFn: () => fetch("/api/activity-feed", { credentials: "include" }).then(r => r.json()),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const pools = (poolsData?.pools || []).filter((p: any) => p.status !== 'archived');
  const notifications = notificationsData?.notifications || [];
  const activities = activityData?.activities || [];
  const discoverPools = discoverData?.pools || [];

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

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const tourCompleted = localStorage.getItem("chipin_tour_completed");
      if (!tourCompleted) {
        const timer = setTimeout(() => setShowTour(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [authLoading, isAuthenticated]);

  const handleTourClose = () => {
    setShowTour(false);
    localStorage.setItem("chipin_tour_completed", "true");
  };

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
      <div className="mb-6 md:mb-10">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight">
            {greeting}, {user?.firstName} 👋
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <p className="text-sm md:text-base text-muted-foreground/80">Here's what's happening with your pools and wallet.</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground/60 hover:text-primary flex items-center gap-1.5 text-xs"
            onClick={() => setShowTour(true)}
            data-testid="button-take-tour"
          >
            <Compass className="w-3.5 h-3.5" /> Take a Tour
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8 md:mb-10">
        <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/[0.12] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <FeatureTooltip id="stat-wallet" title="Wallet Balance" description="Your ChipIn wallet holds your funds. Deposit money via Stripe to start contributing to pools.">
              <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Wallet Balance</CardTitle>
            </FeatureTooltip>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 md:p-6 md:pt-1">
            <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight">${parseFloat(user?.balance || '0').toLocaleString()}</div>
            <Link href="/profile?action=deposit">
              <p className="text-xs text-primary/80 hover:text-primary hover:underline cursor-pointer mt-2 font-medium">+ Add funds</p>
            </Link>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/[0.12] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <FeatureTooltip id="stat-active-pools" title="Active Pools" description="Pools you've created that are currently accepting contributions.">
              <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Active Pools</CardTitle>
            </FeatureTooltip>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-400/20 to-green-400/5">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 md:p-6 md:pt-1">
            <div className="text-2xl md:text-3xl font-bold tracking-tight">{activePools.length}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground/60 mt-2">{myPools.length} total created</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/[0.12] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <FeatureTooltip id="stat-total-contributed" title="Total Contributed" description="The total amount you've contributed across all pools you've joined.">
              <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Total Contributed</CardTitle>
            </FeatureTooltip>
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 md:p-6 md:pt-1">
            <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight">${totalContributed.toLocaleString()}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground/60 mt-2">Across {contributedPools.length} pools</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/[0.12] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <FeatureTooltip id="stat-pools-created" title="Pools Created" description="The number of pools you've started. Create pools for trips, gifts, events, and more.">
              <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Pools Created</CardTitle>
            </FeatureTooltip>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-400/20 to-purple-400/5">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 md:p-6 md:pt-1">
            <div className="text-2xl md:text-3xl font-bold tracking-tight">{poolsCreatedCount}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground/60 mt-2">{activePools.length} currently active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h2 className="text-lg md:text-xl font-display font-bold tracking-tight">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
            <Link href="/create">
              <div className="group relative p-5 md:p-6 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 hover:border-primary/40 hover:from-primary/25 hover:to-primary/10 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer text-center hover:-translate-y-0.5" data-testid="quick-action-create-pool">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <span className="text-xs md:text-sm font-semibold">New Pool</span>
              </div>
            </Link>
            <Link href="/profile?action=deposit">
              <div className="group relative p-5 md:p-6 rounded-2xl bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/20 hover:border-green-500/40 hover:from-green-500/25 hover:to-green-500/10 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 cursor-pointer text-center hover:-translate-y-0.5" data-testid="quick-action-deposit">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-400/30 to-green-400/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <span className="text-xs md:text-sm font-semibold">Deposit</span>
              </div>
            </Link>
            <Link href="/explore">
              <div className="group relative p-5 md:p-6 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 hover:border-accent/40 hover:from-accent/25 hover:to-accent/10 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 cursor-pointer text-center hover:-translate-y-0.5" data-testid="quick-action-explore">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                </div>
                <span className="text-xs md:text-sm font-semibold">Explore</span>
              </div>
            </Link>
            <Link href="/profile">
              <div className="group relative p-5 md:p-6 rounded-2xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 hover:from-purple-500/25 hover:to-purple-500/10 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 cursor-pointer text-center hover:-translate-y-0.5" data-testid="quick-action-profile">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-400/30 to-purple-400/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
                <span className="text-xs md:text-sm font-semibold">My Cards</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-display font-bold tracking-tight">Your Pools</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-primary text-xs" asChild data-testid="link-archived-pools">
                <Link href="/archived"><Archive className="w-3.5 h-3.5 mr-1" /> Archived</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-primary text-xs" asChild>
                <Link href="/explore">View All <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
            </div>
          </div>

          {poolsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[200px] rounded-xl" />
              ))}
            </div>
          ) : myPools.length === 0 ? (
            <div className="relative rounded-2xl border border-dashed border-white/[0.1] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 md:p-12 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary/60" />
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-2">Start your first pool!</h3>
                <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm mx-auto">
                  Create a pool to collect funds for trips, gifts, events, or anything you want to chip in for together.
                </p>
                <Button size="lg" className="shadow-lg shadow-primary/20" asChild>
                  <Link href="/create"><Plus className="w-4 h-4 mr-2" /> Create Your First Pool</Link>
                </Button>
              </div>
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
              <div className="flex items-center justify-between mb-4 mt-8 md:mt-10">
                <h2 className="text-lg md:text-xl font-display font-bold tracking-tight">Pools You've Joined</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contributedPools.slice(0, 4).map((pool: any) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 md:mt-10" data-testid="section-discover-pools">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                <h2 className="text-lg md:text-xl font-display font-bold tracking-tight">Join a Pool</h2>
              </div>
              {discoverPools.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-primary text-xs" asChild>
                  <Link href="/explore" data-testid="link-view-all-discover">View All <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                </Button>
              )}
            </div>
            {discoverLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-[200px] rounded-xl" />
                ))}
              </div>
            ) : discoverPools.length === 0 ? (
              <div className="relative rounded-2xl border border-dashed border-white/[0.1] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 md:p-12 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Compass className="w-8 h-8 text-primary/60" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold mb-2">No pools to join yet</h3>
                  <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto" data-testid="text-discover-empty">
                    No pools to join yet. Follow people to discover their pools!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {discoverPools.slice(0, 4).map((pool: any) => {
                  const currentAmt = parseFloat(pool.currentAmount || '0');
                  const targetAmt = parseFloat(pool.targetAmount || '1');
                  const pct = Math.min(100, Math.round((currentAmt / targetAmt) * 100));

                  return (
                    <Link key={pool.id} href={`/pool/${pool.id}`}>
                      <Card
                        className="group cursor-pointer border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/[0.15] hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                        data-testid={`discover-pool-${pool.id}`}
                      >
                        <CardHeader className="pb-2 p-4 md:p-5 md:pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {pool.emoji && (
                                <span className="text-xl flex-shrink-0">{pool.emoji}</span>
                              )}
                              <h3 className="font-display font-semibold text-sm md:text-base leading-tight group-hover:text-primary transition-colors truncate">
                                {pool.title}
                              </h3>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] flex-shrink-0 ${
                                pool.source === 'invited'
                                  ? 'bg-accent/15 text-accent border-accent/20'
                                  : 'bg-primary/15 text-primary border-primary/20'
                              }`}
                              data-testid={`badge-source-${pool.id}`}
                            >
                              {pool.source === 'invited' ? 'Invited' : `From @${pool.creatorUsername}`}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 md:px-5 pb-3 md:pb-4">
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-baseline">
                              <span className="text-muted-foreground text-xs">Collected</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm md:text-base font-bold text-emerald-400">
                                  ${currentAmt.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground text-xs">/ ${targetAmt.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={pct}
                                className="h-2 bg-white/5 flex-1"
                                indicatorClassName="bg-gradient-to-r from-primary via-primary to-accent"
                              />
                              <span className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                                {pct}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 ring-1 ring-white/10">
                                  <AvatarImage src={pool.creatorAvatar} />
                                  <AvatarFallback className="text-[8px]">{pool.creatorName?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground" data-testid={`text-creator-${pool.id}`}>
                                  {pool.creatorName}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full" data-testid={`text-contributors-${pool.id}`}>
                                <Users className="w-3 h-3 inline mr-0.5" />
                                {pool.contributorCount || 0} {(pool.contributorCount || 0) === 1 ? 'contributor' : 'contributors'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base md:text-lg font-display font-bold flex items-center gap-2 tracking-tight">
                <Activity className="w-4 h-4 text-primary" /> Friend Activity
              </h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-primary text-xs h-8 px-2" asChild>
                <Link href="/activity"><Expand className="w-3.5 h-3.5 mr-1" /> Expand</Link>
              </Button>
            </div>
            <Card className="border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden">
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/80">No activity yet</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Follow people to see their contributions</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {activities.slice(0, 4).map((activity: any) => (
                      <Link key={activity.id} href={`/pool/${activity.poolId}`}>
                        <div className="p-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8 ring-1 ring-white/10">
                              <AvatarImage src={activity.userAvatar} />
                              <AvatarFallback className="text-[10px]">{activity.userName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] leading-snug">
                                <span className="font-semibold">{activity.userName}</span>
                                <span className="text-muted-foreground/70"> chipped in </span>
                                <span className="text-green-400 font-bold">${parseFloat(activity.amount).toFixed(2)}</span>
                              </p>
                              <p className="text-xs text-muted-foreground/60 truncate mt-0.5">to {activity.poolTitle}</p>
                              <p className="text-[10px] text-muted-foreground/40 mt-1">
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base md:text-lg font-display font-bold flex items-center gap-2 tracking-tight">
                <Bell className="w-4 h-4" /> Notifications
              </h2>
            </div>
            <Card className="border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden">
              <CardContent className="p-0">
                {recentNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center">
                      <Bell className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/80">All caught up!</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">No recent notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {recentNotifications.map((notification: any) => {
                      const inner = (
                        <div className={`p-3.5 hover:bg-white/[0.04] transition-colors ${notification.link ? 'cursor-pointer' : ''} ${!notification.read ? 'bg-primary/[0.06] border-l-2 border-l-primary' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${!notification.read ? 'bg-primary/10' : 'bg-white/[0.05]'}`}>
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold leading-snug truncate">{notification.title}</p>
                              <p className="text-xs text-muted-foreground/60 line-clamp-2 mt-0.5 leading-relaxed">{notification.message}</p>
                              <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                                {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                      // Only wrap in a link when the notification actually points somewhere;
                      // a dead "#" link scrolled to top and did nothing.
                      return notification.link
                        ? <Link key={notification.id} href={notification.link}>{inner}</Link>
                        : <div key={notification.id}>{inner}</div>;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground/60 mb-3 uppercase tracking-wider">Recent Contributors</h3>
            <div className="flex -space-x-2">
              {pools.slice(0, 5).flatMap((p: any) => p.contributors || []).slice(0, 8).map((contributor: any, i: number) => (
                <Link key={`${contributor.id}-${i}`} href={`/user/${contributor.id}`}>
                  <Avatar className="w-9 h-9 border-2 border-background hover:z-10 hover:scale-110 transition-transform duration-200 cursor-pointer ring-1 ring-white/10">
                    <AvatarImage src={contributor.avatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-white/10 to-white/5">{contributor.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GuidedTour isOpen={showTour} onClose={handleTourClose} />
    </Layout>
  );
}
