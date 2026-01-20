import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { PoolCard } from "@/components/pool-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, TrendingUp, Users, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterMode, setFilterMode] = useState<"all" | "following">("all");
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: poolsData, isLoading: poolsLoading } = useQuery({
    queryKey: queryKeys.pools,
    queryFn: api.pools.list,
    enabled: isAuthenticated,
  });

  const { data: followingData } = useQuery({
    queryKey: queryKeys.following(user?.id || ""),
    queryFn: () => api.users.getFollowing(user?.id || ""),
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const pools = poolsData?.pools || [];
  const following = followingData?.following || [];
  const followingIds = following.map((u: any) => u.id);
  
  const filteredPools = pools.filter((pool: any) => {
    const matchesSearch = pool.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      pool.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || pool.category === selectedCategory;
    const matchesFollowing = filterMode === "all" || followingIds.includes(pool.creatorId);
    return matchesSearch && matchesCategory && matchesFollowing;
  });

  const categories = ['All', 'Trip', 'Gift', 'Purchase', 'Event', 'Recurring', 'Other'];

  return (
    <Layout>
      <div className="mb-12">
        <h1 className="text-4xl font-display font-bold mb-4">Explore Pools</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover public pools, join community causes, or get inspired by what others are chipping in for.
        </p>
      </div>

      {following.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-card border border-white/5" data-testid="your-network-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold">Your Network</h3>
              </div>
              <span className="text-sm text-muted-foreground">
                Following {following.length} {following.length === 1 ? 'person' : 'people'}
              </span>
              <div className="flex -space-x-2 ml-2">
                {following.slice(0, 5).map((followedUser: any) => (
                  <Link key={followedUser.id} href={`/user/${followedUser.id}`} data-testid={`network-avatar-${followedUser.id}`}>
                    <Avatar className="w-8 h-8 border-2 border-background hover:z-10 transition-transform hover:scale-110 cursor-pointer">
                      <AvatarImage src={followedUser.avatar || undefined} />
                      <AvatarFallback className="text-xs">{followedUser.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
                {following.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{following.length - 5}
                  </div>
                )}
              </div>
            </div>
            <Link href="/profile" data-testid="link-view-network">
              <Button variant="ghost" size="sm" className="text-sm gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterMode("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filterMode === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 hover:bg-white/10 border border-white/10"
          }`}
          data-testid="button-filter-all"
        >
          <TrendingUp className="w-4 h-4" />
          All Pools
        </button>
        <button
          onClick={() => setFilterMode("following")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filterMode === "following"
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 hover:bg-white/10 border border-white/10"
          }`}
          data-testid="button-filter-following"
        >
          <Users className="w-4 h-4" />
          From People I Follow
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search pools by name or category..." 
            className="pl-10 h-11 bg-white/5 border-white/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-pools"
          />
        </div>
        <Button variant="outline" className="h-11 border-white/10 bg-white/5">
          <Filter className="w-4 h-4 mr-2" /> Filters
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 mb-2 no-scrollbar">
        {categories.map((cat) => (
          <button 
            key={cat} 
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
            onClick={() => setSelectedCategory(cat)}
            data-testid={`button-category-${cat.toLowerCase()}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-2 mb-6">
            {filterMode === "all" ? (
              <TrendingUp className="w-5 h-5 text-primary" />
            ) : (
              <Users className="w-5 h-5 text-primary" />
            )}
            <h2 className="text-xl font-bold">
              {filterMode === "all" ? "All Pools" : "Pools from People You Follow"}
            </h2>
          </div>
          
          {poolsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-[300px] rounded-xl" />
              ))}
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No pools found. Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPools.map((pool: any) => (
                <PoolCard key={pool.id} pool={pool} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
