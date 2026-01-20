import { Layout } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CURRENT_USER, MOCK_POOLS, BADGES } from "@/lib/mock-data";
import { PoolCard } from "@/components/pool-card";
import { Star, MapPin, Calendar, Link as LinkIcon, Edit2, UserPlus, Trophy, Award, Target } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);

  const userPools = MOCK_POOLS.filter(p => p.creator.id === CURRENT_USER.id);
  const joinedPools = MOCK_POOLS.filter(p => p.contributors.some(c => c.user.id === CURRENT_USER.id && p.creator.id !== CURRENT_USER.id));

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast({
      description: isFollowing ? "Unfollowed user" : "You are now following Alex Rivera",
    });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-20">
           {/* Cover Image */}
           <div className="h-64 rounded-3xl overflow-hidden relative">
              <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-accent/20 to-purple-500/20 mix-blend-overlay" />
              <img 
                src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80" 
                alt="Cover" 
                className="w-full h-full object-cover opacity-60" 
              />
           </div>

           {/* User Info Card */}
           <div className="absolute -bottom-16 left-8 right-8 flex items-end justify-between">
              <div className="flex items-end gap-6">
                 <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                       <AvatarImage src={CURRENT_USER.avatar} />
                       <AvatarFallback>{CURRENT_USER.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-background rounded-full" title="Online" />
                 </div>
                 <div className="pb-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                       <h1 className="text-3xl font-display font-bold">{CURRENT_USER.name}</h1>
                       <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Pro Member</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                       <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> San Francisco, CA</span>
                       <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined March 2024</span>
                    </div>
                 </div>
              </div>

              <div className="hidden md:flex gap-3 mb-4">
                 <Button variant="outline" className="border-white/10" onClick={() => toast({ description: "Profile copied to clipboard" })}>
                    <LinkIcon className="w-4 h-4 mr-2" /> Share
                 </Button>
                 <Button onClick={handleFollow} variant={isFollowing ? "secondary" : "default"}>
                    {isFollowing ? "Following" : <><UserPlus className="w-4 h-4 mr-2" /> Follow</>}
                 </Button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-24">
           {/* Left Sidebar: Stats & Badges */}
           <div className="lg:col-span-4 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-card border border-white/5 text-center">
                 <div>
                    <div className="text-2xl font-bold font-display">{CURRENT_USER.stats?.poolsCreated}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Created</div>
                 </div>
                 <div className="border-x border-white/5">
                    <div className="text-2xl font-bold font-display">{userPools.length + joinedPools.length}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Joined</div>
                 </div>
                 <div>
                    <div className="text-2xl font-bold font-display flex items-center justify-center gap-1">
                       {CURRENT_USER.stats?.rating} <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Rating</div>
                 </div>
              </div>

              {/* Achievements / Badges */}
              <div className="p-6 rounded-2xl bg-card border border-white/5">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                       <Trophy className="w-4 h-4 text-yellow-500" /> Achievements
                    </h3>
                    <span className="text-xs text-muted-foreground">See All</span>
                 </div>
                 <div className="space-y-4">
                    {CURRENT_USER.badges?.map(badge => (
                       <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${badge.color}`}>
                             {badge.icon}
                          </div>
                          <div className="flex-1">
                             <div className="font-medium text-sm">{badge.name}</div>
                             <div className="text-xs text-muted-foreground">Earned 2024</div>
                          </div>
                       </div>
                    ))}
                    {/* Locked Badge Example */}
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

              {/* Impact */}
              <div className="p-6 rounded-2xl bg-linear-to-br from-primary/10 to-accent/10 border border-primary/10">
                 <h3 className="font-bold mb-2 flex items-center gap-2 text-primary">
                    <Target className="w-4 h-4" /> Impact
                 </h3>
                 <p className="text-sm text-muted-foreground mb-4">
                    You've helped friends achieve <span className="text-foreground font-bold">${CURRENT_USER.stats?.totalContributed}</span> in goals!
                 </p>
                 <div className="h-2 rounded-full bg-background/50 overflow-hidden">
                    <div className="h-full w-[70%] bg-linear-to-r from-primary to-accent" />
                 </div>
                 <div className="mt-2 text-xs text-right text-muted-foreground">Top 5% of contributors</div>
              </div>
           </div>

           {/* Main Content: Pools */}
           <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center gap-6 border-b border-white/10 pb-4">
                 <button className="text-lg font-bold border-b-2 border-primary pb-4 -mb-4.5 px-2">My Pools</button>
                 <button className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors px-2">Activity</button>
                 <button className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors px-2">Friends</button>
              </div>

              <div className="space-y-6">
                 {userPools.length > 0 && (
                    <section>
                       <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Created by Alex</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userPools.map(pool => (
                             <PoolCard key={pool.id} pool={pool} />
                          ))}
                       </div>
                    </section>
                 )}

                 {joinedPools.length > 0 && (
                    <section>
                       <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Chipped In</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {joinedPools.map(pool => (
                             <PoolCard key={pool.id} pool={pool} />
                          ))}
                       </div>
                    </section>
                 )}
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
}
