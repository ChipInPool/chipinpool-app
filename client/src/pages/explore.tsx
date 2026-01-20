import { Layout } from "@/components/layout";
import { MOCK_POOLS } from "@/lib/mock-data";
import { PoolCard } from "@/components/pool-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Compass, TrendingUp, Clock } from "lucide-react";
import { useState } from "react";

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredPools = MOCK_POOLS.filter(pool => 
    pool.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    pool.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            />
         </div>
         <Button variant="outline" className="h-11 border-white/10 bg-white/5">
            <Filter className="w-4 h-4 mr-2" /> Filters
         </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-4 overflow-x-auto pb-6 mb-2 no-scrollbar">
         {['All', 'Trips', 'Gifts', 'Charity', 'Events', 'Purchases'].map((cat, i) => (
            <button 
               key={cat} 
               className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
            >
               {cat}
            </button>
         ))}
      </div>

      <div className="space-y-12">
         <section>
            <div className="flex items-center gap-2 mb-6">
               <TrendingUp className="w-5 h-5 text-primary" />
               <h2 className="text-xl font-bold">Trending Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPools.map(pool => (
                  <PoolCard key={pool.id} pool={pool} />
               ))}
               {/* Duplicate mock data to fill grid */}
               {filteredPools.map(pool => (
                  <PoolCard key={`${pool.id}-dup`} pool={{...pool, id: `${pool.id}-dup`, title: `[Featured] ${pool.title}`}} />
               ))}
            </div>
         </section>
      </div>
    </Layout>
  );
}
