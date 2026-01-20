import { Layout } from "@/components/layout";
import { PoolCard } from "@/components/pool-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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

  const pools = poolsData?.pools || [];
  
  const filteredPools = pools.filter((pool: any) => {
    const matchesSearch = pool.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      pool.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || pool.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">All Pools</h2>
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
