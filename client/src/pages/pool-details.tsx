import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, Share2, Copy, Wallet, Loader2, CreditCard, ShieldCheck, Pencil, Mail, MessageSquare, Calendar } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { CommentsSection } from "@/components/comments-section";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'stripe'>('stripe');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetAmount, setEditTargetAmount] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

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

  const updatePoolMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string; targetAmount?: string; deadline?: string }) => 
      api.pools.update(params?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(params?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      toast({
        title: "Pool Updated!",
        description: "Your changes have been saved.",
      });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update pool",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
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
  const isCreator = pool.creatorId === user?.id;

  const handleChipIn = async () => {
    setIsChippingIn(true);
    try {
      if (paymentMethod === 'stripe') {
        const response = await api.pools.checkout(params?.id || '', chipInAmount);
        if (response.url) {
          window.location.href = response.url;
        }
      } else {
        contributeMutation.mutate(chipInAmount);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Could not process payment",
        variant: "destructive",
      });
    } finally {
      setIsChippingIn(false);
    }
  };

  const handleEditPool = () => {
    updatePoolMutation.mutate({
      title: editTitle,
      description: editDescription,
      targetAmount: editTargetAmount,
      deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined,
    });
  };

  const openEditDialog = () => {
    setEditTitle(pool.title || "");
    setEditDescription(pool.description || "");
    setEditTargetAmount(pool.targetAmount || "");
    setEditDeadline(pool.deadline ? format(new Date(pool.deadline), 'yyyy-MM-dd') : "");
    setEditDialogOpen(true);
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

  const poolUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareSubject = encodeURIComponent(`Chip in to ${pool.title}`);
  const shareBody = encodeURIComponent(`Hey! Join me in pooling funds for ${pool.title}. We're at $${currentAmount.toLocaleString()} of $${targetAmount.toLocaleString()}. Chip in here: ${poolUrl}`);
  const shareText = encodeURIComponent(`Join me in pooling funds for ${pool.title}! Chip in here: ${poolUrl}`);

  const copyLink = () => {
    navigator.clipboard.writeText(poolUrl);
    toast({ description: "Link copied to clipboard!" });
  };

  const shareViaEmail = () => {
    window.open(`mailto:?subject=${shareSubject}&body=${shareBody}`, '_blank');
  };

  const shareViaSMS = () => {
    window.open(`sms:?body=${shareText}`, '_blank');
  };

  const shareViaTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${shareText}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(poolUrl)}`, '_blank');
  };

  const shareViaLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(poolUrl)}`, '_blank');
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
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
                <Link 
                  href={isCreator ? '/profile' : `/user/${pool.creatorId}`}
                  className="flex items-center gap-3 text-white/80 hover:text-white transition-colors w-fit"
                  data-testid={`link-pool-creator-${pool.creatorId}`}
                >
                  <Avatar className="w-6 h-6 border border-white/20">
                    <AvatarImage src={creator.avatar} />
                    <AvatarFallback>{creator.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Created by <span className="font-semibold text-white">{creator.name}</span></span>
                </Link>
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
                      <Link 
                        href={c.user?.id === user?.id ? '/profile' : `/user/${c.user?.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        data-testid={`link-contributor-${c.user?.id}`}
                      >
                        <Avatar>
                          <AvatarImage src={c.user?.avatar} />
                          <AvatarFallback>{c.user?.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-1 hover:text-primary transition-colors">
                            {c.user?.name || 'Anonymous'}
                            {c.user?.badges?.map((b: any) => <span key={b.id} className="text-xs" title={b.name}>{b.icon}</span>)}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString()}</p>
                        </div>
                      </Link>
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
                {isCreator && (
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                    asChild
                    data-testid="button-spend-pool-funds"
                  >
                    <Link href={`/pool/${pool.id}/spend`}>
                      <CreditCard className="w-5 h-5 mr-2" /> Spend Pool Funds
                    </Link>
                  </Button>
                )}

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
                          <span className="text-sm text-muted-foreground">Amount</span>
                          <span className="font-bold text-lg">${chipInAmount}</span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground mb-3">Choose payment method:</p>
                          <button
                            onClick={() => setPaymentMethod('stripe')}
                            className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                              paymentMethod === 'stripe' 
                                ? 'border-primary bg-primary/10' 
                                : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              paymentMethod === 'stripe' ? 'bg-primary text-primary-foreground' : 'bg-white/10'
                            }`}>
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-medium">Pay with Card</p>
                              <p className="text-xs text-muted-foreground">Secure checkout via Stripe</p>
                            </div>
                            {paymentMethod === 'stripe' && <ShieldCheck className="w-5 h-5 text-primary" />}
                          </button>
                          <button
                            onClick={() => setPaymentMethod('balance')}
                            className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                              paymentMethod === 'balance' 
                                ? 'border-primary bg-primary/10' 
                                : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              paymentMethod === 'balance' ? 'bg-primary text-primary-foreground' : 'bg-white/10'
                            }`}>
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-medium">Use Balance</p>
                              <p className="text-xs text-muted-foreground">
                                Available: ${user ? parseFloat(user.balance).toLocaleString() : '0'}
                              </p>
                            </div>
                            {paymentMethod === 'balance' && <ShieldCheck className="w-5 h-5 text-primary" />}
                          </button>
                        </div>
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

                <div className={`grid gap-3 ${isCreator ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5" data-testid="button-share">
                        <Share2 className="w-4 h-4 mr-2" /> Share
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-white/10">
                      <DialogHeader>
                        <DialogTitle>Share this Pool</DialogTitle>
                        <DialogDescription>Invite friends to chip in!</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            variant="outline" 
                            className="h-12 border-white/10 hover:bg-white/5 justify-start"
                            onClick={copyLink}
                            data-testid="button-share-copy"
                          >
                            <Copy className="w-4 h-4 mr-2" /> Copy Link
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-12 border-white/10 hover:bg-white/5 justify-start"
                            onClick={shareViaEmail}
                            data-testid="button-share-email"
                          >
                            <Mail className="w-4 h-4 mr-2" /> Email
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-12 border-white/10 hover:bg-white/5 justify-start"
                            onClick={shareViaSMS}
                            data-testid="button-share-sms"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" /> Text/SMS
                          </Button>
                        </div>
                        <div className="border-t border-white/10 pt-4">
                          <p className="text-sm text-muted-foreground mb-3">Share on social media</p>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-12 w-12 border-white/10 hover:bg-[#1DA1F2]/10 hover:border-[#1DA1F2]/50 hover:text-[#1DA1F2]"
                              onClick={shareViaTwitter}
                              data-testid="button-share-twitter"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-12 w-12 border-white/10 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/50 hover:text-[#1877F2]"
                              onClick={shareViaFacebook}
                              data-testid="button-share-facebook"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-12 w-12 border-white/10 hover:bg-[#0A66C2]/10 hover:border-[#0A66C2]/50 hover:text-[#0A66C2]"
                              onClick={shareViaLinkedIn}
                              data-testid="button-share-linkedin"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5" onClick={copyLink} data-testid="button-copy-link">
                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                  </Button>

                  {isCreator && (
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-12 border-white/10 hover:bg-white/5" 
                          onClick={openEditDialog}
                          data-testid="button-edit-pool"
                        >
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-card border-white/10">
                        <DialogHeader>
                          <DialogTitle>Edit Pool</DialogTitle>
                          <DialogDescription>Update your pool details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input 
                              id="edit-title"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Pool title"
                              className="h-12 bg-white/5 border-white/10"
                              data-testid="input-edit-title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Describe your pool..."
                              className="min-h-[100px] bg-white/5 border-white/10 resize-none"
                              data-testid="input-edit-description"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-target">Target Amount ($)</Label>
                              <Input 
                                id="edit-target"
                                type="number"
                                value={editTargetAmount}
                                onChange={(e) => setEditTargetAmount(e.target.value)}
                                placeholder="0.00"
                                className="h-12 bg-white/5 border-white/10 font-mono"
                                data-testid="input-edit-target"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-deadline">Deadline</Label>
                              <div className="relative">
                                <Input 
                                  id="edit-deadline"
                                  type="date"
                                  value={editDeadline}
                                  onChange={(e) => setEditDeadline(e.target.value)}
                                  className="h-12 bg-white/5 border-white/10 pl-10"
                                  data-testid="input-edit-deadline"
                                />
                                <Calendar className="w-4 h-4 absolute left-3 top-4 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="ghost" 
                            onClick={() => setEditDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleEditPool}
                            disabled={updatePoolMutation.isPending}
                            className="font-bold"
                            data-testid="button-save-edit"
                          >
                            {updatePoolMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 text-center">
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
