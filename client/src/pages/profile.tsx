import { Layout } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoolCard } from "@/components/pool-card";
import { Star, MapPin, Calendar, Link as LinkIcon, Trophy, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: poolsData, isLoading: poolsLoading } = useQuery({
    queryKey: queryKeys.pools,
    queryFn: api.pools.list,
    enabled: isAuthenticated,
  });

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-64 rounded-3xl mb-20" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-24">
            <div className="lg:col-span-4">
              <Skeleton className="h-96 rounded-2xl" />
            </div>
            <div className="lg:col-span-8">
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const pools = poolsData?.pools || [];
  const userPools = pools.filter((p: any) => p.creatorId === user.id);
  const joinedPools = pools.filter((p: any) => 
    p.creatorId !== user.id && 
    p.contributors?.some((c: any) => c.user?.id === user.id)
  );

  const badges = user.badges || [];
  const poolsCreated = parseInt(String(user.poolsCreated)) || 0;
  const totalContributed = parseFloat(user.totalContributed) || 0;
  const rating = parseFloat(user.rating || '5.0') || 5.0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="relative mb-20">
          <div className="h-64 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-accent/20 to-purple-500/20 mix-blend-overlay" />
            <img 
              src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80" 
              alt="Cover" 
              className="w-full h-full object-cover opacity-60" 
            />
          </div>

          <div className="absolute -bottom-16 left-8 right-8 flex items-end justify-between">
            <div className="flex items-end gap-6">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-background rounded-full" title="Online" />
              </div>
              <div className="pb-2 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-display font-bold">{user.name}</h1>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Pro Member</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {user.location || 'Location not set'}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex gap-3 mb-4">
              <Button variant="outline" className="border-white/10" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ description: "Profile link copied to clipboard" }); }}>
                <LinkIcon className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-24">
          <div className="lg:col-span-4 space-y-6">
            <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-card border border-white/5 text-center">
              <div>
                <div className="text-2xl font-bold font-display">{poolsCreated}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Created</div>
              </div>
              <div className="border-x border-white/5">
                <div className="text-2xl font-bold font-display">{userPools.length + joinedPools.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Joined</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display flex items-center justify-center gap-1">
                  {rating.toFixed(1)} <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Rating</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" /> Achievements
                </h3>
                <span className="text-xs text-muted-foreground">{badges.length} earned</span>
              </div>
              <div className="space-y-4">
                {badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No badges yet. Start contributing to earn achievements!</p>
                ) : (
                  badges.map((badge: any) => (
                    <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${badge.color}`}>
                        {badge.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{badge.name}</div>
                        <div className="text-xs text-muted-foreground">{badge.description || 'Earned 2024'}</div>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex items-center gap-3 p-2 rounded-lg opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                    🎯
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Goal Getter</div>
                    <div className="text-xs text-muted-foreground">Complete 10 pools</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-linear-to-br from-primary/10 to-accent/10 border border-primary/10">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-primary">
                <Target className="w-4 h-4" /> Impact
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                You've helped friends achieve <span className="text-foreground font-bold">${totalContributed.toLocaleString()}</span> in goals!
              </p>
              <div className="h-2 rounded-full bg-background/50 overflow-hidden">
                <div className="h-full bg-linear-to-r from-primary to-accent" style={{ width: `${Math.min(100, (totalContributed / 5000) * 100)}%` }} />
              </div>
              <div className="mt-2 text-xs text-right text-muted-foreground">
                {totalContributed >= 1000 ? 'Top 5% of contributors' : 'Keep contributing!'}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-6 border-b border-white/10 pb-4">
              <button className="text-lg font-bold border-b-2 border-primary pb-4 -mb-4.5 px-2">My Pools</button>
              <button className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors px-2">Activity</button>
            </div>

            {poolsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-[300px] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {userPools.length > 0 && (
                  <section>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Created by You</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userPools.map((pool: any) => (
                        <PoolCard key={pool.id} pool={pool} />
                      ))}
                    </div>
                  </section>
                )}

                {joinedPools.length > 0 && (
                  <section>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Chipped In</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {joinedPools.map((pool: any) => (
                        <PoolCard key={pool.id} pool={pool} />
                      ))}
                    </div>
                  </section>
                )}

                {userPools.length === 0 && joinedPools.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No pools yet. Create your first pool to get started!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
