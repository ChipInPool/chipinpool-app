import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ArchivedPools() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["archivedPools"],
    queryFn: () => fetch("/api/pools/archived", { credentials: "include" }).then(r => r.json()),
    enabled: isAuthenticated,
  });

  const unarchiveMutation = useMutation({
    mutationFn: (poolId: number) =>
      fetch(`/api/pools/${poolId}/unarchive`, {
        method: "POST",
        credentials: "include",
      }).then(r => {
        if (!r.ok) throw new Error("Failed to unarchive pool");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedPools"] });
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      toast({ title: "Pool unarchived", description: "The pool has been restored." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unarchive pool.", variant: "destructive" });
    },
  });

  const pools = data?.pools || [];

  if (authLoading) {
    return (
      <Layout>
        <div className="py-20">
          <Skeleton className="h-[400px] w-full max-w-4xl rounded-3xl" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div data-testid="page-archived-pools">
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-primary text-sm mb-4" asChild>
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Home</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
              <Archive className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Archived Pools</h1>
              <p className="text-sm text-muted-foreground/70">Pools you've archived. Unarchive them to make them active again.</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center">
              <Archive className="w-8 h-8 text-orange-400/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No archived pools</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
              When you archive a pool, it will appear here. You can unarchive pools at any time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool: any) => {
              const targetAmount = parseFloat(pool.targetAmount || '0');
              const currentAmount = parseFloat(pool.currentAmount || '0');
              return (
                <Card key={pool.id} className="border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden" data-testid={`card-archived-pool-${pool.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {pool.emoji && (
                          <span className="text-2xl">{pool.emoji}</span>
                        )}
                        <div>
                          <h3 className="font-display font-semibold text-base leading-tight">{pool.title}</h3>
                          <Badge variant="secondary" className="mt-1 text-[10px]">{pool.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold font-mono">${currentAmount.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/ ${targetAmount.toLocaleString()}</span>
                    </div>
                    {pool.archivedAt && (
                      <p className="text-xs text-muted-foreground/60">
                        Archived {format(new Date(pool.archivedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-white/10 hover:border-primary/40 hover:text-primary"
                      onClick={() => unarchiveMutation.mutate(pool.id)}
                      disabled={unarchiveMutation.isPending}
                      data-testid={`button-unarchive-${pool.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      {unarchiveMutation.isPending ? "Unarchiving..." : "Unarchive"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
