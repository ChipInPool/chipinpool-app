import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { PoolCard } from "@/components/pool-card";
import { ArrowRight, Sparkles, Zap, ShieldCheck, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import heroImage from "@assets/generated_images/futuristic_fintech_3d_visualization_of_digital_currency_pooling.png";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: poolsData, isLoading: poolsLoading } = useQuery({
    queryKey: queryKeys.pools,
    queryFn: api.pools.list,
    enabled: isAuthenticated,
  });

  const pools = poolsData?.pools || [];

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/30 mb-12">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Futuristic Pooling" 
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/90 to-transparent" />
        </div>
        
        <div className="relative z-10 px-8 py-16 md:py-24 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3 h-3" />
            <span>Welcome back, {user?.name?.split(' ')[0]}!</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Pool funds.<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Split costs.</span><br />
            Shop together.
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Create a pool for anything—group trips, gifts, or shared expenses. 
            Invite friends, track contributions, and pay instantly.
          </p>
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Link href="/create">
              <Button size="lg" className="font-semibold text-base px-8 h-12 shadow-lg shadow-primary/20 hover:scale-105 transition-transform" data-testid="button-hero-start-pool">
                Start a Pool
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="outline" size="lg" className="h-12 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-foreground">
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-1">Instant Pooling</h3>
            <p className="text-sm text-muted-foreground">Funds are available immediately once the goal is reached.</p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-1">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">Bank-level encryption for every transaction.</p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg mb-1">Social Splitting</h3>
            <p className="text-sm text-muted-foreground">Invite friends via link or QR code instantly.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold">Your Pools</h2>
          <Link href="/explore">
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {poolsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[300px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool: any) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
            
            <Link href="/create">
              <div className="h-full min-h-[300px] rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer group" data-testid="card-create-pool">
                <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <span className="text-3xl font-light text-muted-foreground group-hover:text-primary">+</span>
                </div>
                <p className="font-medium text-muted-foreground group-hover:text-foreground">Create New Pool</p>
              </div>
            </Link>
          </div>
        )}
      </section>
    </Layout>
  );
}
