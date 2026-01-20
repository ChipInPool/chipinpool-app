import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Share2, Copy, Wallet, Loader2 } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { CommentsSection } from "@/components/comments-section";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Confetti from "react-dom-confetti";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function PoolDetails() {
  const [, params] = useRoute("/pool/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [chipInAmount, setChipInAmount] = useState("");
  const [isChippingIn, setIsChippingIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'amount' | 'method'>('amount');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: poolData, isLoading: poolLoading } = useQuery({
    queryKey: queryKeys.pool(params?.id || ''),
    queryFn: () => api.pools.get(params?.id || ''),
    enabled: !!params?.id && isAuthenticated,
  });

  const contributeMutation = useMutation({
    mutationFn: (amount: string) => api.pools.contribute(params?.id || '', amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(params?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      setShowConfetti(true);
      toast({
        title: "Contribution Successful!",
        description: `You chipped in $${chipInAmount}.`,
      });
      setTimeout(() => setShowConfetti(false), 2000);
      setDialogOpen(false);
      setChipInAmount("");
      setPaymentStep('amount');
    },
    onError: (error: any) => {
      toast({
        title: "Contribution Failed",
        description: error.message || "Could not process contribution",
        variant: "destructive",
      });
    },
  });

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (poolLoading || authLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video rounded-3xl" />
            </div>
            <div>
              <Skeleton className="h-96 rounded-3xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const pool = poolData?.pool;
  if (!pool) return <Layout><div className="text-center py-20">Pool not found</div></Layout>;

  const currentAmount = parseFloat(pool.currentAmount || '0');
  const targetAmount = parseFloat(pool.targetAmount || '1');
  const percentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const contributors = pool.contributors || [];
  const comments = pool.comments || [];
  const creator = pool.creator || { name: 'Unknown', avatar: null };

  const handleChipIn = () => {
    setIsChippingIn(true);
    contributeMutation.mutate(chipInAmount);
    setIsChippingIn(false);
  };

  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 70,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ description: "Link copied to clipboard!" });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </a>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-3xl overflow-hidden aspect-video border border-white/5 bg-card/50">
              {pool.image && (
                <>
                  <img src={pool.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 via-transparent to-transparent" />
                </>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    {pool.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium bg-black/40 px-2 py-1 rounded-full backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5" />
                    {pool.status === 'active' ? `Ends ${formatDistanceToNow(new Date(pool.deadline), { addSuffix: true })}` : 'Completed'}
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2">{pool.title}</h1>
                <div className="flex items-center gap-3 text-white/80">
                  <Avatar className="w-6 h-6 border border-white/20">
                    <AvatarImage src={creator.avatar} />
                    <AvatarFallback>{creator.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Created by <span className="font-semibold text-white">{creator.name}</span></span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-white/5">
              <h3 className="font-display font-bold text-xl mb-4">About this Pool</h3>
              <p className="text-muted-foreground leading-relaxed">
                {pool.description || "No description provided."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-white/5">
              <h3 className="font-display font-bold text-xl mb-6">Contributors ({contributors.length})</h3>
              <div className="space-y-4">
                {contributors.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No contributions yet. Be the first!</p>
                ) : (
                  contributors.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={c.user?.avatar} />
                          <AvatarFallback>{c.user?.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-1">
                            {c.user?.name || 'Anonymous'}
                            {c.user?.badges?.map((b: any) => <span key={b.id} className="text-xs" title={b.name}>{b.icon}</span>)}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="font-mono font-medium text-green-400">+${parseFloat(c.amount).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <CommentsSection comments={comments} poolId={pool.id} />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-3xl bg-card border border-white/10 shadow-2xl shadow-black/50">
              <div className="flex flex-col items-center mb-8 relative">
                <div className="w-48 h-48">
                  <CircularProgressbarWithChildren 
                    value={percentage} 
                    styles={buildStyles({
                      pathColor: percentage >= 100 ? '#78ff44' : 'hsl(var(--primary))',
                      trailColor: 'rgba(255,255,255,0.05)',
                      pathTransitionDuration: 1.5
                    })}
                  >
                    <div className="text-center flex flex-col items-center">
                      <span className="text-4xl font-display font-bold text-white tracking-tighter">${currentAmount.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-1">of ${targetAmount.toLocaleString()}</span>
                    </div>
                  </CircularProgressbarWithChildren>
                </div>
                <div className="absolute top-0 right-0 left-0 flex justify-center pointer-events-none">
                  <Confetti active={showConfetti} config={confettiConfig} />
                </div>
              </div>

              <div className="space-y-4">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25" data-testid="button-chip-in">
                      <Wallet className="w-5 h-5 mr-2" /> Chip In Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-card border-white/10">
                    <DialogHeader>
                      <DialogTitle>Chip in to {pool.title}</DialogTitle>
                    </DialogHeader>
                    
                    {paymentStep === 'amount' ? (
                      <div className="grid gap-6 py-4 animate-in fade-in slide-in-from-left-4">
                        <div className="grid grid-cols-4 gap-4">
                          {[25, 50, 100].map((amt) => (
                            <Button 
                              key={amt} 
                              variant="outline" 
                              className="border-white/10 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                              onClick={() => setChipInAmount(amt.toString())}
                              data-testid={`button-amount-${amt}`}
                            >
                              ${amt}
                            </Button>
                          ))}
                          <Button variant="outline" className="border-white/10" onClick={() => setChipInAmount("")}>Custom</Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-right">Amount ($)</Label>
                          <Input
                            id="amount"
                            value={chipInAmount}
                            onChange={(e) => setChipInAmount(e.target.value)}
                            placeholder="0.00"
                            className="text-2xl h-14 bg-white/5 border-white/10 text-center font-bold"
                            data-testid="input-chip-amount"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 animate-in fade-in slide-in-from-right-4">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Payment Method</span>
                          <span className="font-bold text-lg">${chipInAmount}</span>
                        </div>
                        <PaymentMethodSelector onMethodChange={() => {}} />
                      </div>
                    )}

                    <DialogFooter className="sm:justify-between gap-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        {paymentStep === 'amount' && (
                          <>
                            <Wallet className="w-4 h-4 mr-2" />
                            Balance: ${user ? parseFloat(user.balance).toLocaleString() : '0'}
                          </>
                        )}
                        {paymentStep === 'method' && (
                          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent hover:text-primary" onClick={() => setPaymentStep('amount')}>
                            Back
                          </Button>
                        )}
                      </div>
                      {paymentStep === 'amount' ? (
                        <Button type="button" className="w-full sm:w-auto font-bold" onClick={() => setPaymentStep('method')} disabled={!chipInAmount}>
                          Continue
                        </Button>
                      ) : (
                        <Button type="submit" className="w-full sm:w-auto font-bold" onClick={handleChipIn} disabled={isChippingIn || contributeMutation.isPending} data-testid="button-confirm-payment">
                          {(isChippingIn || contributeMutation.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Payment"}
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5">
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                  <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5" onClick={copyLink}>
                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                  </Button>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                {pool.creatorId === user?.id && (
                  <div className="mb-4">
                    <Link href={`/pool/${pool.id}/spend`}>
                      <Button variant="secondary" className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                        Creator Settings & Spend
                      </Button>
                    </Link>
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-500" /> Secure payment powered by Stripe
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ShieldCheck({className}: {className?: string}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
  )
}
