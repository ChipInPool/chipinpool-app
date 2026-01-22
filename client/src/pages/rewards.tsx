import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Star, Flame, Medal, Crown, Users, Target, Zap, Gift } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: string;
  criteria: string;
  threshold: number | null;
  pointsAwarded: number;
  rarity: string;
  earned: boolean;
  earnedAt: string | null;
}

interface PointsData {
  userId: string;
  points: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  lastActivityDate: string | null;
  pointsToNextLevel: number;
  progressToNextLevel: number;
}

interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface LeaderboardEntry {
  userId: string;
  points: number;
  lifetimePoints: number;
  level: number;
  currentStreak: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar: string | null;
  } | null;
}

const rarityColors: Record<string, string> = {
  common: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600",
  uncommon: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700",
  rare: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700",
  epic: "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700",
  legendary: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600",
};

const rarityLabels: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const categoryIcons: Record<string, any> = {
  contribution: Gift,
  pool: Target,
  social: Users,
  streak: Flame,
  milestone: Trophy,
  special: Star,
};

function BadgeCard({ badge }: { badge: Badge }) {
  const Icon = categoryIcons[badge.category] || Medal;
  
  return (
    <div
      data-testid={`badge-card-${badge.id}`}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all",
        badge.earned 
          ? rarityColors[badge.rarity] 
          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 opacity-60 grayscale",
        badge.earned && "hover:scale-105"
      )}
    >
      {badge.earned && (
        <div className="absolute -top-2 -right-2">
          <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            Earned
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: badge.earned ? badge.color + "20" : undefined }}
        >
          {badge.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{badge.name}</h3>
          <span className={cn(
            "text-xs font-medium",
            badge.rarity === "legendary" && "text-amber-600 dark:text-amber-400",
            badge.rarity === "epic" && "text-purple-600 dark:text-purple-400",
            badge.rarity === "rare" && "text-blue-600 dark:text-blue-400",
            badge.rarity === "uncommon" && "text-emerald-600 dark:text-emerald-400",
            badge.rarity === "common" && "text-zinc-600 dark:text-zinc-400"
          )}>
            {rarityLabels[badge.rarity]}
          </span>
        </div>
      </div>
      
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
        {badge.description}
      </p>
      
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Star className="w-3 h-3" />
          +{badge.pointsAwarded} pts
        </span>
        {badge.earnedAt && (
          <span className="text-zinc-500">
            {new Date(badge.earnedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function PointsCard({ points }: { points: PointsData }) {
  return (
    <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-amber-100 text-sm mb-1">Your Level</p>
            <div className="flex items-center gap-2">
              <Crown className="w-8 h-8" />
              <span className="text-4xl font-bold">{points.level}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-amber-100 text-sm mb-1">Total Points</p>
            <p className="text-3xl font-bold">{points.lifetimePoints.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress to Level {points.level + 1}</span>
            <span>{points.progressToNextLevel}%</span>
          </div>
          <Progress value={points.progressToNextLevel} className="h-3 bg-amber-700/50" />
          <p className="text-xs text-amber-200 mt-1">
            {points.pointsToNextLevel - points.lifetimePoints} points needed
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-amber-400/30">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-red-300" />
              <span className="text-xl font-bold">{points.currentStreak}</span>
            </div>
            <p className="text-xs text-amber-200">Day Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-xl font-bold">{points.longestStreak}</span>
            </div>
            <p className="text-xs text-amber-200">Best Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-white" />
              <span className="text-xl font-bold">{points.points}</span>
            </div>
            <p className="text-xs text-amber-200">Available</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardCard({ leaderboard, userRank }: { leaderboard: LeaderboardEntry[], userRank: number | null }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-amber-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.userId}
            data-testid={`leaderboard-entry-${entry.userId}`}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              index === 0 && "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
              index === 1 && "bg-zinc-100 dark:bg-zinc-800/50",
              index === 2 && "bg-orange-50 dark:bg-orange-950/30",
              index > 2 && "bg-zinc-50 dark:bg-zinc-900/50"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
              index === 0 && "bg-amber-500 text-white",
              index === 1 && "bg-zinc-400 text-white",
              index === 2 && "bg-orange-400 text-white",
              index > 2 && "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            )}>
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {entry.user?.firstName} {entry.user?.lastName}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                @{entry.user?.username}
              </p>
            </div>
            
            <div className="text-right">
              <p className="font-bold text-sm">{entry.lifetimePoints.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">Level {entry.level}</p>
            </div>
          </div>
        ))}
        
        {userRank && userRank > 10 && (
          <div className="pt-3 border-t">
            <p className="text-center text-sm text-zinc-500">
              You are ranked <span className="font-bold text-zinc-700 dark:text-zinc-300">#{userRank}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Rewards() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const { data: badges, isLoading: badgesLoading } = useQuery<Badge[]>({
    queryKey: ["/api/rewards/badges"],
    queryFn: () => fetchApi<Badge[]>("/api/rewards/badges"),
    enabled: isAuthenticated,
  });
  
  const { data: points, isLoading: pointsLoading } = useQuery<PointsData>({
    queryKey: ["/api/rewards/points"],
    queryFn: () => fetchApi<PointsData>("/api/rewards/points"),
    enabled: isAuthenticated,
  });
  
  const { data: history, isLoading: historyLoading } = useQuery<PointTransaction[]>({
    queryKey: ["/api/rewards/history"],
    queryFn: () => fetchApi<PointTransaction[]>("/api/rewards/history"),
    enabled: isAuthenticated,
  });
  
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<{ leaderboard: LeaderboardEntry[], userRank: number | null }>({
    queryKey: ["/api/rewards/leaderboard"],
    queryFn: () => fetchApi<{ leaderboard: LeaderboardEntry[], userRank: number | null }>("/api/rewards/leaderboard"),
    enabled: isAuthenticated,
  });
  
  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }
  
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }
  
  const categories = ["all", "contribution", "pool", "social", "streak", "milestone", "special"];
  const filteredBadges = badges?.filter(b => 
    selectedCategory === "all" || b.category === selectedCategory
  ) || [];
  
  const earnedBadges = badges?.filter(b => b.earned) || [];
  
  return (
    <Layout>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" data-testid="back-button">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Rewards & Achievements</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Earn points and unlock badges
                </p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {pointsLoading ? (
            <Skeleton className="h-48 rounded-xl mb-6" />
          ) : points ? (
            <div className="mb-6">
              <PointsCard points={points} />
            </div>
          ) : null}
          
          <Tabs defaultValue="badges" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="badges" data-testid="tab-badges">
                <Medal className="w-4 h-4 mr-2" />
                Badges
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <Star className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="badges" className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="whitespace-nowrap"
                    data-testid={`category-filter-${cat}`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <p className="text-zinc-500">
                  {earnedBadges.length} of {badges?.length || 0} badges earned
                </p>
                <Progress 
                  value={badges?.length ? (earnedBadges.length / badges.length) * 100 : 0} 
                  className="w-24 h-2"
                />
              </div>
              
              {badgesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-xl" />
                  ))}
                </div>
              ) : filteredBadges.length === 0 ? (
                <Card className="p-8 text-center">
                  <Medal className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500">No badges in this category yet</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredBadges
                    .sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0))
                    .map(badge => (
                      <BadgeCard key={badge.id} badge={badge} />
                    ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history">
              {historyLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : !history || history.length === 0 ? (
                <Card className="p-8 text-center">
                  <Star className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500">No point history yet</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Start contributing to pools to earn points!
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {history.map(tx => (
                    <Card key={tx.id} className="p-4" data-testid={`history-item-${tx.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            tx.points > 0 
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" 
                              : "bg-red-100 dark:bg-red-900/30 text-red-600"
                          )}>
                            {tx.points > 0 ? <Star className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.reason}</p>
                            <p className="text-xs text-zinc-500">
                              {new Date(tx.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "font-bold",
                          tx.points > 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {tx.points > 0 ? "+" : ""}{tx.points}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="leaderboard">
              {leaderboardLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : !leaderboardData || leaderboardData.leaderboard.length === 0 ? (
                <Card className="p-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500">Leaderboard is empty</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Be the first to earn points!
                  </p>
                </Card>
              ) : (
                <LeaderboardCard 
                  leaderboard={leaderboardData.leaderboard} 
                  userRank={leaderboardData.userRank} 
                />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </Layout>
  );
}
