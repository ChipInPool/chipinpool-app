import { Pool } from "@/lib/mock-data";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface PoolCardProps {
  pool: Pool;
}

export function PoolCard({ pool }: PoolCardProps) {
  const percentage = Math.min(100, Math.round((pool.currentAmount / pool.targetAmount) * 100));
  const isCompleted = pool.status === 'completed';

  return (
    <Link href={`/pool/${pool.id}`}>
      <div className="group cursor-pointer h-full">
        <Card className="h-full border-white/5 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 overflow-hidden flex flex-col">
          {pool.image && (
            <div className="h-32 w-full overflow-hidden relative">
               <div className="absolute inset-0 bg-linear-to-t from-background to-transparent opacity-60 z-10" />
               <img src={pool.image} alt={pool.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
               <div className="absolute top-3 right-3 z-20">
                 <Badge variant={isCompleted ? "secondary" : "default"} className={`${isCompleted ? "bg-primary/20 text-primary border-primary/20" : "bg-background/80 backdrop-blur-md text-foreground border-white/10"}`}>
                    {pool.category}
                 </Badge>
               </div>
            </div>
          )}
          
          <CardHeader className={`${pool.image ? 'pt-4' : 'pt-6'} pb-2 px-5`}>
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-display font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{pool.title}</h3>
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">{pool.description}</p>
          </CardHeader>
          
          <CardContent className="px-5 pb-4 flex-1">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Collected</span>
                <span>
                  <span className={isCompleted ? "text-primary" : "text-foreground"}>${pool.currentAmount}</span> 
                  <span className="text-muted-foreground"> / ${pool.targetAmount}</span>
                </span>
              </div>
              <Progress value={percentage} className="h-2 bg-white/5" indicatorClassName={isCompleted ? "bg-primary" : "bg-primary"} />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                 <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Completed' : `Ends ${formatDistanceToNow(new Date(pool.deadline), { addSuffix: true })}`}</span>
                 </div>
                 <div className="flex items-center -space-x-2">
                    {pool.contributors.slice(0, 3).map((c, i) => (
                      <Avatar key={i} className="w-6 h-6 border-2 border-card">
                        <AvatarImage src={c.user.avatar} />
                        <AvatarFallback>{c.user.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    {pool.contributors.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-card font-medium">
                        +{pool.contributors.length - 3}
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="px-5 py-3 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Avatar className="w-5 h-5">
                  <AvatarImage src={pool.creator.avatar} />
                  <AvatarFallback>{pool.creator.name[0]}</AvatarFallback>
               </Avatar>
               <span className="text-xs text-muted-foreground">by {pool.creator.id === 'u1' ? 'You' : pool.creator.name}</span>
            </div>
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            )}
          </CardFooter>
        </Card>
      </div>
    </Link>
  );
}
