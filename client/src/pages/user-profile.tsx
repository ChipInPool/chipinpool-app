import { useState } from "react";
import { Layout } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoolCard } from "@/components/pool-card";
import { Star, MapPin, Calendar, Link as LinkIcon, Trophy, Users, UserPlus, UserMinus, Lock, TrendingUp, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useLocation, useRoute, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserProfile() {
  const { toast } = useToast();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, paramsById] = useRoute("/user/:id");
  const [, paramsByUsername] = useRoute("/profile/:username");
  const identifier = paramsById?.id || paramsByUsername?.username || '';
  const isUsernameRoute = !!paramsByUsername?.username;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pools' | 'activity'>('pools');

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: isUsernameRoute ? queryKeys.userProfileByUsername(identifier) : queryKeys.userProfile(identifier),
    queryFn: () => isUsernameRoute ? api.users.getProfileByUsername(identifier) : api.users.getProfile(identifier),
    enabled: !!identifier,
  });

  const profileUserId = profileData?.user?.id || identifier;

  const followMutation = useMutation({
    mutationFn: () => api.users.follow(profileUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isUsernameRoute ? queryKeys.userProfileByUsername(identifier) : queryKeys.userProfile(identifier) });
      toast({ description: "Following user" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to follow user", variant: "destructive" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.users.unfollow(profileUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isUsernameRoute ? queryKeys.userProfileByUsername(identifier) : queryKeys.userProfile(identifier) });
      toast({ description: "Unfollowed user" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to unfollow user", variant: "destructive" });
    },
  });

  if (authLoading || profileLoading || !profileData) {
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

  const isPrivateProfile = profileData?.isPrivate === true;
  const profileUser = profileData.user;
  const pools = profileData.pools || [];
  const isFollowing = profileData.isFollowing;

  const badges = profileUser.badges || [];
  const poolsCreated = parseInt(String(profileUser.poolsCreated)) || 0;
  const poolsJoined = profileData.poolsJoined || 0;
  const rating = parseFloat(profileUser.rating || '5.0') || 5.0;
  const followerCount = profileUser.followerCount || 0;
  const followingCount = profileUser.followingCount || 0;
  const totalRaised = profileData.totalRaised || '0.00';
  const recentActivity = profileData.recentActivity || [];

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-1 sm:px-0">
        {isPrivateProfile ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2" data-testid="text-private-name">{profileData.firstName} {profileData.lastName}</h2>
            <p className="text-muted-foreground mb-4" data-testid="text-private-username">@{profileData.username}</p>
            <p className="text-sm text-muted-foreground">This profile is private</p>
            {isAuthenticated && currentUser?.id !== profileData.id && (
              <Button className="mt-4" onClick={() => followMutation.mutate()} data-testid="button-follow-private">
                <UserPlus className="w-4 h-4 mr-2" /> Follow to see their profile
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="relative mb-12 md:mb-20">
              <div className="h-36 md:h-64 rounded-2xl md:rounded-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-accent/20 to-purple-500/20 mix-blend-overlay" />
                <img 
                  src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80" 
                  alt="Cover" 
                  className="w-full h-full object-cover opacity-60" 
                />
              </div>

              <div className="absolute -bottom-16 left-3 right-3 md:left-8 md:right-8 flex flex-col md:flex-row md:items-end md:justify-between">
                <div className="flex items-end gap-3 md:gap-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-background shadow-xl">
                      <AvatarImage src={profileUser.avatar || undefined} />
                      <AvatarFallback>{profileUser.firstName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="pb-2 mb-2">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h1 className="text-xl md:text-3xl font-display font-bold" data-testid="text-username">{profileUser.firstName} {profileUser.lastName}</h1>
                      {badges.length > 0 && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
                          {badges[0]?.name || 'Member'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profileUser.location || 'Location not set'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Member since {new Date(profileUser.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex gap-3 mb-4">
                  {isAuthenticated && currentUser?.id !== profileUser.id && (
                    <Button 
                      variant={isFollowing ? "outline" : "default"}
                      className={isFollowing ? "border-white/10" : ""}
                      onClick={handleFollowToggle}
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                      data-testid="button-follow"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" /> Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" /> Follow
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" className="border-white/10" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ description: "Profile link copied to clipboard" }); }} data-testid="button-share">
                    <LinkIcon className="w-4 h-4 mr-2" /> Share
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 mt-20 md:mt-24">
              <div className="lg:col-span-4 space-y-4 md:space-y-6">
                <div className="grid grid-cols-4 gap-2 p-3 md:p-4 rounded-2xl bg-card border border-white/5 text-center">
                  <div>
                    <div className="text-xl md:text-2xl font-bold font-display">{poolsCreated}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Created</div>
                  </div>
                  <div className="border-x border-white/5">
                    <div className="text-xl md:text-2xl font-bold font-display">{poolsJoined}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Joined</div>
                  </div>
                  <div className="border-r border-white/5">
                    <div className="text-xl md:text-2xl font-bold font-display flex items-center justify-center gap-1">
                      {rating.toFixed(1)} <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Rating</div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold font-display">{followerCount}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Followers</div>
                  </div>
                </div>

                <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Network
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="text-xl font-bold font-display">{followerCount}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="text-xl font-bold font-display">{followingCount}</div>
                      <div className="text-xs text-muted-foreground">Following</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
                  <h3 className="font-bold flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-accent" /> Impact
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="text-xl font-bold font-display text-accent">${parseFloat(totalRaised).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-muted-foreground">Total Raised</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="text-xl font-bold font-display">${parseFloat(String(profileUser.totalContributed || '0')).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-muted-foreground">Total Contributed</div>
                    </div>
                  </div>
                </div>

                {profileUser.bio && (
                  <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
                    <h3 className="font-bold mb-3">About</h3>
                    <p className="text-sm text-muted-foreground">{profileUser.bio}</p>
                  </div>
                )}

                <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" /> Achievements
                    </h3>
                    <span className="text-xs text-muted-foreground">{badges.length} earned</span>
                  </div>
                  <div className="space-y-4">
                    {badges.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No badges yet.</p>
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
                  </div>
                </div>

                {isAuthenticated && currentUser?.id !== profileUser.id && (
                  <div className="md:hidden">
                    <Button 
                      variant={isFollowing ? "outline" : "default"}
                      className={`w-full ${isFollowing ? "border-white/10" : ""}`}
                      onClick={handleFollowToggle}
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                      data-testid="button-follow-mobile"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" /> Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" /> Follow
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-8 space-y-4 md:space-y-8">
                <div className="flex items-center gap-6 border-b border-white/10 pb-4">
                  <button 
                    className={`text-base md:text-lg font-bold pb-4 -mb-4.5 px-2 ${activeTab === 'pools' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('pools')}
                    data-testid="tab-pools"
                  >
                    Pools
                  </button>
                  <button 
                    className={`text-base md:text-lg font-bold pb-4 -mb-4.5 px-2 ${activeTab === 'activity' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('activity')}
                    data-testid="tab-activity"
                  >
                    Activity
                  </button>
                </div>

                {activeTab === 'pools' ? (
                  <>
                    {pools.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pools.map((pool: any) => (
                          <PoolCard key={pool.id} pool={pool} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>{profileUser.firstName} {profileUser.lastName} hasn't created any pools yet.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity: any) => (
                        <div key={activity.id} className="p-4 rounded-xl bg-card border border-white/5 flex items-center gap-3" data-testid={`activity-item-${activity.id}`}>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
