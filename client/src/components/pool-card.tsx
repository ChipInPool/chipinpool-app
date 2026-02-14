import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, CheckCircle2, Plane, Gift, ShoppingBag, CalendarDays, MoreHorizontal, Repeat } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth-context";

interface PoolCardProps {
  pool: any;
}

const categoryConfig: Record<string, { icon: React.ElementType; gradient: string }> = {
  Trip: { icon: Plane, gradient: "from-blue-500/30 via-cyan-500/20 to-sky-600/30" },
  Gift: { icon: Gift, gradient: "from-pink-500/30 via-rose-400/20 to-fuchsia-500/30" },
  Purchase: { icon: ShoppingBag, gradient: "from-amber-500/30 via-orange-400/20 to-yellow-500/30" },
  Event: { icon: CalendarDays, gradient: "from-violet-500/30 via-purple-400/20 to-indigo-500/30" },
  Other: { icon: MoreHorizontal, gradient: "from-slate-500/30 via-gray-400/20 to-zinc-500/30" },
  Recurring: { icon: Repeat, gradient: "from-emerald-500/30 via-teal-400/20 to-green-500/30" },
};

export function PoolCard({ pool }: PoolCardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const currentAmount = parseFloat(pool.currentAmount || '0');
  const targetAmount = parseFloat(pool.targetAmount || '1');
  const percentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const isCompleted = pool.status === 'completed';
  const contributors = pool.contributors || [];
  const creator = pool.creator || { name: 'Unknown', avatar: null };
  const config = categoryConfig[pool.category] || categoryConfig.Other;
  const CategoryIcon = config.icon;

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(pool.creatorId === user?.id ? '/profile' : `/user/${pool.creatorId}`);
  };

  return (
    <Link href={`/pool/${pool.id}`}>
      <div className="group cursor-pointer h-full" data-testid={`card-pool-${pool.id}`}>
        <div className="h-full rounded-xl p-[1px] bg-white/5 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary/40 group-hover:via-primary/10 group-hover:to-accent/40 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-primary/10">
          <Card className="h-full rounded-[11px] border-0 bg-card/60 backdrop-blur-sm transition-all duration-300 group-hover:bg-card/90 overflow-hidden flex flex-col">
            {pool.image ? (
              <div className="h-36 w-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-70 z-10" />
                <img src={pool.image} alt={pool.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                <div className="absolute top-3 right-3 z-20">
                  <Badge variant="secondary" className="bg-background/70 backdrop-blur-md text-foreground border-white/10 text-[10px] font-medium">
                    {isCompleted ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" />{pool.category}</span>
                    ) : (
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{pool.category}</span>
                    )}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className={`h-36 w-full overflow-hidden relative bg-gradient-to-br ${config.gradient}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    {pool.emoji ? (
                      <span className="text-3xl" data-testid={`emoji-pool-${pool.id}`}>{pool.emoji}</span>
                    ) : (
                      <CategoryIcon className="w-8 h-8 text-foreground/50" />
                    )}
                  </div>
                </div>
                <div className="absolute top-3 right-3 z-20">
                  <Badge variant="secondary" className="bg-background/70 backdrop-blur-md text-foreground border-white/10 text-[10px] font-medium">
                    {isCompleted ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" />{pool.category}</span>
                    ) : (
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{pool.category}</span>
                    )}
                  </Badge>
                </div>
              </div>
            )}
            
            <CardHeader className="pt-3 md:pt-4 pb-2 px-3 md:px-5">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-display font-semibold text-base md:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{pool.title}</h3>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm line-clamp-2 min-h-[2rem] md:min-h-[2.5rem]">{pool.description}</p>
            </CardHeader>
            
            <CardContent className="px-3 md:px-5 pb-3 md:pb-4 flex-1">
              <div className="space-y-2 md:space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground text-xs">Collected</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-base md:text-lg font-bold ${isCompleted ? "text-primary" : "text-emerald-400"}`}>
                      ${currentAmount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-xs">/ ${targetAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={percentage} 
                    className="h-2.5 bg-white/5 flex-1" 
                    indicatorClassName="bg-gradient-to-r from-primary via-primary to-accent"
                  />
                  <span className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                    {percentage}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Complete' : `Ends ${formatDistanceToNow(new Date(pool.deadline), { addSuffix: true })}`}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex -space-x-1.5">
                      {contributors.slice(0, 3).map((c: any, i: number) => (
                        <Avatar key={i} className="w-5 h-5 border-[1.5px] border-card ring-1 ring-white/10">
                          <AvatarImage src={c.user?.avatar} />
                          <AvatarFallback className="text-[8px] bg-muted">{c.user?.firstName?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {contributors.length > 0 && (
                      <span className="ml-1.5 text-[10px] font-medium text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full">
                        {contributors.length} {contributors.length === 1 ? 'person' : 'people'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="px-3 md:px-5 py-2 md:py-3 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
              <span 
                onClick={handleCreatorClick}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatorClick(e as any)}
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                data-testid={`link-creator-${pool.creatorId}`}
              >
                <Avatar className="w-5 h-5 ring-1 ring-white/10">
                  <AvatarImage src={creator.avatar} />
                  <AvatarFallback className="text-[8px]">{creator.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">by {pool.creatorId === user?.id ? 'You' : creator.name}</span>
              </span>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </Link>
  );
}
