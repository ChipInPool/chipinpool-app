import { useEffect, useState, useRef } from "react";
import { uploadFile } from "@/lib/upload";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, Share2, Copy, Wallet, Loader2, CreditCard, ShieldCheck, Pencil, Mail, MessageSquare, Calendar, Users, Phone, Send, UserPlus, Link as LinkIcon, Check, BarChart3, RefreshCw, Building2, ImagePlus, Upload, X, Activity, ArrowUpRight, ArrowDownLeft, ShoppingBag, Undo2, ArrowDownToLine, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'stripe' | string>('stripe');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch linked bank accounts
  const { data: bankAccountsData } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch('/api/bank-accounts', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch bank accounts');
      return res.json();
    },
    enabled: isAuthenticated,
  });
  const linkedBankAccounts = bankAccountsData?.accounts || [];

  const { data: poolActivityData } = useQuery({
    queryKey: ["poolActivity", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pools/${params?.id}/activity`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load pool activity");
      return res.json();
    },
    enabled: !!params?.id && isAuthenticated,
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetAmount, setEditTargetAmount] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [inviteEmails, setInviteEmails] = useState("");
  const [invitePhones, setInvitePhones] = useState("");
  const [showInlineEmail, setShowInlineEmail] = useState(false);
  const [showInlineSMS, setShowInlineSMS] = useState(false);
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [autoContributeDialogOpen, setAutoContributeDialogOpen] = useState(false);
  const [autoContributeAmount, setAutoContributeAmount] = useState("");
  const [autoContributeFrequency, setAutoContributeFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [startImmediately, setStartImmediately] = useState(true);
  const [autoPaymentMethod, setAutoPaymentMethod] = useState<'wallet' | string>('wallet');
  const [editImage, setEditImage] = useState("");
  const [isUploadingPoolImage, setIsUploadingPoolImage] = useState(false);
  const poolImageInputRef = useRef<HTMLInputElement>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [distributions, setDistributions] = useState<{userId: string, name: string, amount: string}[]>([]);
  const [closePoolAfterAction, setClosePoolAfterAction] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [refundResults, setRefundResults] = useState<{userId: string, name: string, amount: string}[] | null>(null);

  // Fetch pool data - use public endpoint if not authenticated
  const { data: poolData, isLoading: poolLoading } = useQuery({
    queryKey: isAuthenticated ? queryKeys.pool(params?.id || '') : ['public-pool', params?.id],
    queryFn: async () => {
      if (isAuthenticated) {
        return api.pools.get(params?.id || '');
      }
      // Public endpoint for guest viewing
      const res = await fetch(`/api/pools/${params?.id}/public`);
      if (!res.ok) throw new Error('Pool not found');
      return res.json();
    },
    enabled: !!params?.id && !authLoading,
  });
  
  const isPublicView = !isAuthenticated && poolData?.isPublic;
  
  // Guest contribution state
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");

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
    mutationFn: (data: { title?: string; description?: string; targetAmount?: string; deadline?: string; image?: string; status?: string }) => 
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

  const { data: followersData } = useQuery({
    queryKey: queryKeys.myFollowers,
    queryFn: () => api.myFollowers(),
    enabled: isAuthenticated && inviteDialogOpen,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ method, recipients }: { method: 'email' | 'sms' | 'push', recipients: string[] }) => 
      api.pools.invite(params?.id || '', method, recipients),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      toast({
        title: "Invites Sent!",
        description: data.message,
      });
      setSelectedFollowers([]);
      setInviteEmails("");
      setInvitePhones("");
      setInviteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Invites",
        description: error.message || "Could not send invites",
        variant: "destructive",
      });
    },
  });

  const autoContributeMutation = useMutation({
    mutationFn: () => {
      const pm = autoPaymentMethod === 'wallet' ? 'wallet' : 'bank';
      const bankId = autoPaymentMethod.startsWith('bank_') ? autoPaymentMethod.replace('bank_', '') : undefined;
      return api.recurring.create(params?.id || '', autoContributeAmount, autoContributeFrequency, startImmediately, pm as 'wallet' | 'bank', bankId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(params?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: ["userRecurring"] });
      toast({
        title: "Auto-Contribute Set Up!",
        description: data.message,
      });
      setAutoContributeDialogOpen(false);
      setAutoContributeAmount("");
      setAutoContributeFrequency('monthly');
      setStartImmediately(true);
      setAutoPaymentMethod('wallet');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Set Up Auto-Contribute",
        description: error.message || "Could not set up recurring contribution",
        variant: "destructive",
      });
    },
  });

  const handleSendInvitesToFollowers = () => {
    if (selectedFollowers.length === 0) return;
    inviteMutation.mutate({ method: 'push', recipients: selectedFollowers });
  };

  const handleSendEmailInvites = () => {
    const emails = inviteEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return;
    inviteMutation.mutate({ method: 'email', recipients: emails });
  };

  const handleSendSMSInvites = () => {
    const phones = invitePhones.split(/[,\n]/).map(p => p.trim()).filter(p => p);
    if (phones.length === 0) return;
    inviteMutation.mutate({ method: 'sms', recipients: phones });
  };

  const handleQuickEmailInvite = () => {
    if (!quickEmail.trim()) return;
    inviteMutation.mutate({ method: 'email', recipients: [quickEmail.trim()] });
    setQuickEmail("");
    setShowInlineEmail(false);
  };

  const handleQuickSMSInvite = () => {
    if (!quickPhone.trim()) return;
    inviteMutation.mutate({ method: 'sms', recipients: [quickPhone.trim()] });
    setQuickPhone("");
    setShowInlineSMS(false);
  };

  const toggleFollowerSelection = (followerId: string) => {
    setSelectedFollowers(prev => 
      prev.includes(followerId) 
        ? prev.filter(id => id !== followerId) 
        : [...prev, followerId]
    );
  };

  // Guest contribution handler
  const handleGuestContribute = async () => {
    if (!chipInAmount || parseFloat(chipInAmount) < 1) {
      toast({ title: "Invalid amount", description: "Please enter at least $1", variant: "destructive" });
      return;
    }
    setIsChippingIn(true);
    try {
      const res = await fetch(`/api/pools/${params?.id}/contribute-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: chipInAmount, 
          email: guestEmail || undefined,
          name: guestName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to process contribution');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsChippingIn(false);
    }
  };

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
  const remainingBalance = parseFloat(pool?.currentAmount || '0') - parseFloat(pool?.spentAmount || '0');

  const handleChipIn = async () => {
    setIsChippingIn(true);
    try {
      if (paymentMethod === 'stripe') {
        const response = await api.pools.checkout(params?.id || '', chipInAmount);
        if (response.url) {
          window.location.href = response.url;
        }
      } else if (paymentMethod === 'balance') {
        contributeMutation.mutate(chipInAmount);
      } else if (paymentMethod.startsWith('bank_')) {
        // Bank account payment via ACH
        const bankAccountId = paymentMethod.replace('bank_', '');
        const response = await fetch('/api/pools/' + params?.id + '/contribute-bank', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: chipInAmount, bankAccountId }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Bank payment failed');
        }
        const data = await response.json();
        if (data.url) {
          // Redirect to Stripe for new bank linking
          window.location.href = data.url;
        } else if (data.success) {
          // Direct payment completed or processing
          toast({ 
            title: data.status === 'succeeded' ? 'Payment Complete!' : 'Payment Initiated',
            description: data.message || "Bank payment initiated. It may take 1-3 business days to process.",
          });
          setDialogOpen(false);
          setChipInAmount('');
          queryClient.invalidateQueries({ queryKey: queryKeys.pool(params?.id || '') });
        } else if (data.clientSecret) {
          // Requires additional verification - could handle with Stripe.js
          toast({ 
            title: "Verification Required",
            description: "Your bank requires additional verification. Please try again.",
            variant: "destructive",
          });
        }
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

  const handlePoolImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ description: "Please select an image file", variant: "destructive" });
      return;
    }
    setIsUploadingPoolImage(true);
    try {
      const objectPath = await uploadFile(file);
      setEditImage(objectPath);
      toast({ description: "Image uploaded successfully" });
    } catch (err: any) {
      toast({ description: err.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploadingPoolImage(false);
    }
  };

  const handleEditPool = () => {
    updatePoolMutation.mutate({
      title: editTitle,
      description: editDescription,
      targetAmount: editTargetAmount,
      deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined,
      image: editImage || undefined,
      status: editStatus || undefined,
    });
  };

  const openEditDialog = () => {
    setEditTitle(pool.title || "");
    setEditDescription(pool.description || "");
    setEditTargetAmount(pool.targetAmount || "");
    setEditDeadline(pool.deadline ? format(new Date(pool.deadline), 'yyyy-MM-dd') : "");
    setEditImage(pool.image || "");
    setEditStatus(pool.status || "active");
    setEditDialogOpen(true);
  };

  const handleRefundAll = async () => {
    setIsRefunding(true);
    try {
      const res = await fetch(`/api/pools/${params?.id}/refund-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closePool: closePoolAfterAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Refund failed');
      setRefundResults(data.refunds);
      toast({ title: "Refunds Processed", description: data.message });
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(params?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    } catch (error: any) {
      toast({ title: "Refund Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleDistribute = async () => {
    const validDistributions = distributions.filter(d => d.userId && parseFloat(d.amount) > 0);
    if (validDistributions.length === 0) {
      toast({ title: "No Distributions", description: "Please add at least one distribution", variant: "destructive" });
      return;
    }
    setIsDistributing(true);
    try {
      const res = await fetch(`/api/pools/${params?.id}/distribute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          distributions: validDistributions.map(d => ({ userId: d.userId, amount: d.amount })),
          closePool: closePoolAfterAction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Distribution failed');
      toast({ title: "Funds Distributed", description: data.message });
      setDistributeDialogOpen(false);
      setDistributions([]);
      setClosePoolAfterAction(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(params?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    } catch (error: any) {
      toast({ title: "Distribution Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDistributing(false);
    }
  };

  const addDistribution = () => {
    setDistributions(prev => [...prev, { userId: '', name: '', amount: '' }]);
  };

  const removeDistribution = (index: number) => {
    setDistributions(prev => prev.filter((_, i) => i !== index));
  };

  const updateDistribution = (index: number, field: string, value: string) => {
    setDistributions(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const setDistributionFromContributor = (index: number, contributor: any) => {
    setDistributions(prev => prev.map((d, i) => i === index ? { ...d, userId: contributor.id, name: `${contributor.name}` } : d));
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
      <div className="max-w-5xl mx-auto px-1 sm:px-0">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 md:mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className={`relative rounded-3xl overflow-hidden border border-white/5 bg-card/50 ${pool.image ? 'aspect-video' : ''}`}>
              {pool.image && (
                <>
                  <img src={pool.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 via-transparent to-transparent" />
                </>
              )}
              <div className={`${pool.image ? 'absolute bottom-0 left-0 right-0' : 'relative'} p-4 md:p-8`}>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    {pool.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/50 dark:bg-black/40 dark:text-white/80 px-2 py-1 rounded-full backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5" />
                    {pool.status === 'active' ? `Ends ${formatDistanceToNow(new Date(pool.deadline), { addSuffix: true })}` : 'Completed'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3">
                  <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground dark:text-white break-words">{pool.title}</h1>
                  {pool.status === 'completed' && pool.category === 'Purchase' && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Purchased</Badge>
                  )}
                </div>
                <Link 
                  href={isCreator ? '/profile' : `/user/${pool.creatorId}`}
                  className="flex items-center gap-3 text-muted-foreground dark:text-white/80 hover:text-foreground dark:hover:text-white transition-colors w-fit"
                  data-testid={`link-pool-creator-${pool.creatorId}`}
                >
                  <Avatar className="w-6 h-6 border border-border dark:border-white/20">
                    <AvatarImage src={creator.avatar} />
                    <AvatarFallback>{creator.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Created by <span className="font-semibold text-foreground dark:text-white">{creator.name}</span></span>
                </Link>
              </div>
            </div>

            <div className="p-3 md:p-6 rounded-2xl bg-card border border-white/5">
              <h3 className="font-display font-bold text-lg md:text-xl mb-3 md:mb-4">About this Pool</h3>
              <p className="text-muted-foreground leading-relaxed">
                {pool.description || "No description provided."}
              </p>
            </div>

            <div className="p-3 md:p-6 rounded-2xl bg-card border border-white/5">
              <h3 className="font-display font-bold text-lg md:text-xl mb-4 md:mb-6">
                Contributors ({isPublicView ? (pool.contributorCount || 0) : contributors.length})
              </h3>
              <div className="space-y-4">
                {isPublicView ? (
                  (pool.contributorCount || 0) === 0 ? (
                    <p className="text-muted-foreground text-sm">No contributions yet. Be the first!</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {pool.contributorCount} {pool.contributorCount === 1 ? 'person has' : 'people have'} contributed to this pool. 
                      <Link href="/login" className="text-primary hover:underline ml-1">Sign in</Link> to see details.
                    </p>
                  )
                ) : contributors.length === 0 ? (
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
                          <AvatarFallback>{c.user?.firstName?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-1 hover:text-primary transition-colors">
                            {c.user?.firstName ? `${c.user.firstName} ${c.user.lastName || ''}`.trim() : 'Anonymous'}
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

            {poolActivityData && (
              <div className="p-4 md:p-6 rounded-2xl bg-card border border-white/5" data-testid="pool-activity-section">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Pool Activity
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Raised</div>
                    <div className="text-lg font-bold text-green-400" data-testid="text-pool-raised">
                      ${parseFloat(poolActivityData.summary?.raised || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Spent</div>
                    <div className="text-lg font-bold text-red-400" data-testid="text-pool-spent">
                      ${parseFloat(poolActivityData.summary?.spent || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Remaining</div>
                    <div className="text-lg font-bold text-blue-400" data-testid="text-pool-remaining">
                      ${parseFloat(poolActivityData.summary?.remaining || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(poolActivityData.activities || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                  ) : (
                    (poolActivityData.activities || []).map((activity: any) => (
                      <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors" data-testid={`pool-activity-${activity.id}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          activity.type === 'contribution' ? 'bg-green-500/20' : 
                          activity.type === 'transfer' ? 'bg-blue-500/20' : 
                          activity.type === 'withdrawal' ? 'bg-orange-500/20' : 'bg-red-500/20'
                        }`}>
                          {activity.type === 'contribution' ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          ) : activity.type === 'transfer' ? (
                            <ArrowUpRight className="w-4 h-4 text-blue-400" />
                          ) : activity.type === 'withdrawal' ? (
                            <ArrowUpRight className="w-4 h-4 text-orange-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className={`text-sm font-bold whitespace-nowrap ${
                          activity.type === 'contribution' ? 'text-green-400' : 
                          activity.type === 'transfer' ? 'text-blue-400' :
                          activity.type === 'withdrawal' ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {activity.type === 'contribution' ? '+' : '-'}${parseFloat(activity.amount).toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <CommentsSection comments={comments} poolId={pool.id} />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-4 md:p-6 rounded-3xl bg-card border border-white/10 shadow-2xl shadow-black/50">
              <div className="flex flex-col items-center mb-6 md:mb-8 relative">
                <div className="w-36 h-36 md:w-48 md:h-48">
                  <CircularProgressbarWithChildren 
                    value={percentage} 
                    styles={buildStyles({
                      pathColor: percentage >= 100 ? '#78ff44' : 'hsl(var(--primary))',
                      trailColor: 'rgba(255,255,255,0.05)',
                      pathTransitionDuration: 1.5
                    })}
                  >
                    <div className="text-center flex flex-col items-center">
                      <span className="text-2xl md:text-4xl font-display font-bold text-white tracking-tighter">${currentAmount.toLocaleString()}</span>
                      <span className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider font-medium mt-1">of ${targetAmount.toLocaleString()}</span>
                    </div>
                  </CircularProgressbarWithChildren>
                </div>
                <div className="absolute top-0 right-0 left-0 flex justify-center pointer-events-none">
                  <Confetti active={showConfetti} config={confettiConfig} />
                </div>
              </div>

              <div className="space-y-4">
                {isCreator && (
                  <>
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
                    <Button 
                      variant="outline"
                      size="lg" 
                      className="w-full border-white/10" 
                      asChild
                      data-testid="button-pool-analytics"
                    >
                      <Link href={`/pool/${pool.id}/analytics`}>
                        <BarChart3 className="w-5 h-5 mr-2" /> View Analytics
                      </Link>
                    </Button>
                    <Button 
                      variant="outline"
                      size="lg" 
                      className="w-full border-white/10 hover:border-primary/30 hover:text-primary transition-colors" 
                      asChild
                      data-testid="button-spend-now-marketplace"
                    >
                      <Link href={`/spend-now?pool=${pool.id}`}>
                        <ShoppingBag className="w-5 h-5 mr-2" /> Spend Now Marketplace
                      </Link>
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Dialog open={refundDialogOpen} onOpenChange={(open) => { setRefundDialogOpen(open); if (!open) { setRefundResults(null); setClosePoolAfterAction(false); } }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="border-white/10 hover:border-orange-500/30 hover:text-orange-400"
                            disabled={remainingBalance <= 0}
                            data-testid="button-refund-contributors"
                          >
                            <Undo2 className="w-4 h-4 mr-2" /> Refund
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-card border-white/10">
                          <DialogHeader>
                            <DialogTitle>Refund Contributors</DialogTitle>
                            <DialogDescription>
                              Refund the remaining pool balance back to contributors proportionally.
                            </DialogDescription>
                          </DialogHeader>
                          {refundResults ? (
                            <div className="space-y-4">
                              <div className="text-sm text-green-400 font-medium">Refunds processed successfully!</div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {refundResults.map((r: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
                                    <span className="text-sm">{r.name}</span>
                                    <span className="text-sm font-mono text-green-400">${parseFloat(r.amount).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              <Button className="w-full" onClick={() => { setRefundDialogOpen(false); setRefundResults(null); }}>
                                Done
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="text-sm text-muted-foreground">Available to refund</div>
                                <div className="text-2xl font-bold font-mono">${remainingBalance.toFixed(2)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="close-pool-refund" 
                                  checked={closePoolAfterAction}
                                  onCheckedChange={(checked) => setClosePoolAfterAction(!!checked)}
                                />
                                <Label htmlFor="close-pool-refund" className="text-sm">Close pool after refund</Label>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
                                <Button 
                                  onClick={handleRefundAll} 
                                  disabled={isRefunding || remainingBalance <= 0}
                                  className="bg-orange-500 hover:bg-orange-600"
                                  data-testid="button-confirm-refund"
                                >
                                  {isRefunding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Refunding...</> : 'Refund All'}
                                </Button>
                              </DialogFooter>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Dialog open={distributeDialogOpen} onOpenChange={(open) => { setDistributeDialogOpen(open); if (!open) { setDistributions([]); setClosePoolAfterAction(false); } }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            className="border-white/10 hover:border-green-500/30 hover:text-green-400"
                            disabled={remainingBalance <= 0}
                            data-testid="button-distribute-balance"
                          >
                            <ArrowDownToLine className="w-4 h-4 mr-2" /> Distribute
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg bg-card border-white/10">
                          <DialogHeader>
                            <DialogTitle>Distribute Pool Balance</DialogTitle>
                            <DialogDescription>
                              Send custom amounts from the pool to specific wallets.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                              <div className="text-sm text-muted-foreground">Available to distribute</div>
                              <div className="text-2xl font-bold font-mono">${remainingBalance.toFixed(2)}</div>
                              {distributions.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Distributing: ${distributions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toFixed(2)}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {distributions.map((dist, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                                  <Select
                                    value={dist.userId}
                                    onValueChange={(value) => {
                                      const contributor = contributors.find((c: any) => c.id === value);
                                      if (contributor) setDistributionFromContributor(index, contributor);
                                    }}
                                  >
                                    <SelectTrigger className="flex-1 bg-white/5 border-white/10" data-testid={`select-distribute-user-${index}`}>
                                      <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {contributors.filter((c: any) => c.id).map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="$0.00"
                                    value={dist.amount}
                                    onChange={(e) => updateDistribution(index, 'amount', e.target.value)}
                                    className="w-24 bg-white/5 border-white/10 text-right font-mono"
                                    data-testid={`input-distribute-amount-${index}`}
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeDistribution(index)}
                                    className="shrink-0 text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <Button 
                              variant="outline" 
                              className="w-full border-dashed border-white/10"
                              onClick={addDistribution}
                              data-testid="button-add-distribution"
                            >
                              <Plus className="w-4 h-4 mr-2" /> Add Recipient
                            </Button>

                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id="close-pool-distribute" 
                                checked={closePoolAfterAction}
                                onCheckedChange={(checked) => setClosePoolAfterAction(!!checked)}
                              />
                              <Label htmlFor="close-pool-distribute" className="text-sm">Close pool after distribution</Label>
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDistributeDialogOpen(false)}>Cancel</Button>
                              <Button 
                                onClick={handleDistribute} 
                                disabled={isDistributing || distributions.length === 0}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid="button-confirm-distribute"
                              >
                                {isDistributing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Distributing...</> : 'Distribute Funds'}
                              </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                )}

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25" data-testid="button-chip-in" disabled={pool.status !== 'active'}>
                      <Wallet className="w-5 h-5 mr-2" /> {pool.status !== 'active' ? 'Pool Closed' : 'Chip In Now'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-card border-white/10">
                    <DialogHeader>
                      <DialogTitle>Chip in to {pool.title}</DialogTitle>
                    </DialogHeader>
                    
                    {paymentStep === 'amount' ? (
                      <div className="grid gap-6 py-4 animate-in fade-in slide-in-from-left-4">
                        <div className="grid grid-cols-4 gap-2 md:gap-4">
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
                        {/* Guest info fields for public view */}
                        {isPublicView && (
                          <div className="space-y-4 border-t border-white/10 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="guest-name">Your Name (optional)</Label>
                              <Input
                                id="guest-name"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Enter your name"
                                className="bg-white/5 border-white/10"
                                data-testid="input-guest-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="guest-email">Email (optional - for receipt)</Label>
                              <Input
                                id="guest-email"
                                type="email"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="bg-white/5 border-white/10"
                                data-testid="input-guest-email"
                              />
                            </div>
                          </div>
                        )}
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
                          
                          {/* Linked Bank Accounts */}
                          {linkedBankAccounts.length > 0 && (
                            <>
                              <div className="my-3 border-t border-white/10 pt-3">
                                <p className="text-xs text-muted-foreground mb-2">Linked Bank Accounts</p>
                              </div>
                              {linkedBankAccounts.map((account: any) => (
                                <button
                                  key={account.id}
                                  onClick={() => setPaymentMethod(`bank_${account.id}`)}
                                  className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                                    paymentMethod === `bank_${account.id}` 
                                      ? 'border-primary bg-primary/10' 
                                      : 'border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    paymentMethod === `bank_${account.id}` ? 'bg-primary text-primary-foreground' : 'bg-white/10'
                                  }`}>
                                    <Building2 className="w-5 h-5" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <p className="font-medium">{account.institutionName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {account.accountName} ••••{account.accountMask}
                                    </p>
                                  </div>
                                  {paymentMethod === `bank_${account.id}` && <ShieldCheck className="w-5 h-5 text-primary" />}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4">
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
                        isPublicView ? (
                          <Button 
                            type="button" 
                            className="w-full sm:w-auto font-bold" 
                            onClick={handleGuestContribute} 
                            disabled={!chipInAmount || isChippingIn}
                            data-testid="button-guest-checkout"
                          >
                            {isChippingIn ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Continue to Payment"}
                          </Button>
                        ) : (
                          <Button type="button" className="w-full sm:w-auto font-bold" onClick={() => setPaymentStep('method')} disabled={!chipInAmount}>
                            Continue
                          </Button>
                        )
                      ) : (
                        <Button type="submit" className="w-full sm:w-auto font-bold" onClick={handleChipIn} disabled={isChippingIn || contributeMutation.isPending} data-testid="button-confirm-payment">
                          {(isChippingIn || contributeMutation.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Payment"}
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Sign in prompt for guests */}
                {isPublicView && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Want more features? Sign in to track your contributions and set up recurring payments.
                    </p>
                    <Button variant="outline" size="sm" asChild className="border-white/20">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </div>
                )}

                {/* Auto-contribute - only for authenticated users */}
                {isAuthenticated && (
                <Dialog open={autoContributeDialogOpen} onOpenChange={setAutoContributeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full h-12 border-white/10 hover:bg-primary/5 hover:border-primary/30" 
                      data-testid="button-auto-contribute"
                      disabled={pool.status !== 'active'}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Set Up Auto-Contribute
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-card border-white/10">
                    <DialogHeader>
                      <DialogTitle>Set Up Auto-Contribute</DialogTitle>
                      <DialogDescription>
                        Automatically contribute to {pool.title} on a recurring schedule using your wallet balance.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="auto-amount">Amount per contribution ($)</Label>
                        <Input
                          id="auto-amount"
                          value={autoContributeAmount}
                          onChange={(e) => setAutoContributeAmount(e.target.value)}
                          placeholder="0.00"
                          className="text-xl h-12 bg-white/5 border-white/10 text-center font-bold"
                          data-testid="input-auto-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select value={autoContributeFrequency} onValueChange={(v) => setAutoContributeFrequency(v as 'weekly' | 'monthly' | 'quarterly')}>
                          <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setAutoPaymentMethod('wallet')}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                              autoPaymentMethod === 'wallet' ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                            data-testid="auto-payment-wallet"
                          >
                            <div className="flex items-center gap-3">
                              <Wallet className="w-5 h-5" />
                              <div className="text-left">
                                <div className="font-medium text-sm">Wallet Balance</div>
                                <div className="text-xs text-muted-foreground">${user ? parseFloat(user.balance).toLocaleString() : '0'} available</div>
                              </div>
                            </div>
                            {autoPaymentMethod === 'wallet' && <ShieldCheck className="w-5 h-5 text-primary" />}
                          </button>
                          {linkedBankAccounts.map((account: any) => (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => setAutoPaymentMethod(`bank_${account.id}`)}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                autoPaymentMethod === `bank_${account.id}` ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/10 hover:border-white/20'
                              }`}
                              data-testid={`auto-payment-bank-${account.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5" />
                                <div className="text-left">
                                  <div className="font-medium text-sm">{account.bankName || 'Bank Account'}</div>
                                  <div className="text-xs text-muted-foreground">••••{account.accountMask}</div>
                                </div>
                              </div>
                              {autoPaymentMethod === `bank_${account.id}` && <ShieldCheck className="w-5 h-5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="start-immediately"
                          checked={startImmediately}
                          onCheckedChange={(checked) => setStartImmediately(checked as boolean)}
                          data-testid="checkbox-start-immediately"
                        />
                        <Label htmlFor="start-immediately" className="text-sm text-muted-foreground cursor-pointer">
                          Make first contribution immediately
                        </Label>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Your Balance
                          </span>
                          <span className="font-semibold">${user ? parseFloat(user.balance).toLocaleString() : '0'}</span>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAutoContributeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => autoContributeMutation.mutate()}
                        disabled={!autoContributeAmount || parseFloat(autoContributeAmount) <= 0 || autoContributeMutation.isPending || (autoPaymentMethod === 'wallet' && startImmediately && user && parseFloat(autoContributeAmount) > parseFloat(user.balance))}
                        data-testid="button-confirm-auto-contribute"
                      >
                        {autoContributeMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting Up...</>
                        ) : (
                          "Set Up Auto-Contribute"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                )}

                {/* Authenticated user actions - hide for guests */}
                {isAuthenticated && (
                <div className={`grid gap-2 md:gap-3 ${isCreator ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5" data-testid="button-invite">
                        <UserPlus className="w-4 h-4 mr-2" /> Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-card border-white/10">
                      <DialogHeader>
                        <DialogTitle>Invite to {pool.title}</DialogTitle>
                        <DialogDescription>Invite friends to chip in!</DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="share" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-white/5 text-xs sm:text-sm">
                          <TabsTrigger value="share" className="data-[state=active]:bg-primary/20" data-testid="tab-share-link">
                            <LinkIcon className="w-4 h-4 mr-2" /> Share Link
                          </TabsTrigger>
                          <TabsTrigger value="friends" className="data-[state=active]:bg-primary/20" data-testid="tab-invite-friends">
                            <Users className="w-4 h-4 mr-2" /> Friends
                          </TabsTrigger>
                          <TabsTrigger value="contact" className="data-[state=active]:bg-primary/20" data-testid="tab-invite-contact">
                            <Mail className="w-4 h-4 mr-2" /> Contact
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="share" className="space-y-4 pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
                              className={`h-12 border-white/10 hover:bg-white/5 justify-start ${showInlineEmail ? 'bg-primary/20 border-primary/50' : ''}`}
                              onClick={() => { setShowInlineEmail(!showInlineEmail); setShowInlineSMS(false); }}
                              data-testid="button-share-email"
                            >
                              <Mail className="w-4 h-4 mr-2" /> Email
                            </Button>
                            <Button 
                              variant="outline" 
                              className={`h-12 border-white/10 hover:bg-white/5 justify-start ${showInlineSMS ? 'bg-primary/20 border-primary/50' : ''}`}
                              onClick={() => { setShowInlineSMS(!showInlineSMS); setShowInlineEmail(false); }}
                              data-testid="button-share-sms"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" /> Text/SMS
                            </Button>
                          </div>
                          
                          {showInlineEmail && (
                            <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
                              <Label htmlFor="quick-email" className="text-sm">Send email invite</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="quick-email"
                                  type="email"
                                  value={quickEmail}
                                  onChange={(e) => setQuickEmail(e.target.value)}
                                  placeholder="friend@example.com"
                                  className="flex-1 bg-white/5 border-white/10"
                                  data-testid="input-quick-email"
                                />
                                <Button 
                                  onClick={handleQuickEmailInvite}
                                  disabled={!quickEmail.trim() || inviteMutation.isPending}
                                  className="shrink-0"
                                  data-testid="button-send-quick-email"
                                >
                                  {inviteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {showInlineSMS && (
                            <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
                              <Label htmlFor="quick-phone" className="text-sm">Send SMS invite</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="quick-phone"
                                  type="tel"
                                  value={quickPhone}
                                  onChange={(e) => setQuickPhone(e.target.value)}
                                  placeholder="+1 234 567 8901"
                                  className="flex-1 bg-white/5 border-white/10"
                                  data-testid="input-quick-phone"
                                />
                                <Button 
                                  onClick={handleQuickSMSInvite}
                                  disabled={!quickPhone.trim() || inviteMutation.isPending}
                                  className="shrink-0"
                                  data-testid="button-send-quick-sms"
                                >
                                  {inviteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
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
                        </TabsContent>
                        
                        <TabsContent value="friends" className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Select followers to invite</Label>
                            <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-white/10 p-2">
                              {followersData?.followers && followersData.followers.length > 0 ? (
                                followersData.followers.map((follower: any) => (
                                  <div 
                                    key={follower.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                      selectedFollowers.includes(follower.id) ? 'bg-primary/20 border border-primary/50' : 'bg-white/5 hover:bg-white/10'
                                    }`}
                                    onClick={() => toggleFollowerSelection(follower.id)}
                                    data-testid={`follower-item-${follower.id}`}
                                  >
                                    <Checkbox 
                                      checked={selectedFollowers.includes(follower.id)}
                                      className="pointer-events-none"
                                    />
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={follower.avatar} />
                                      <AvatarFallback>{follower.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{follower.name}</p>
                                      <p className="text-xs text-muted-foreground">{follower.email}</p>
                                    </div>
                                    {selectedFollowers.includes(follower.id) && (
                                      <Check className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No followers yet. Share your pool to get more followers!
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            onClick={handleSendInvitesToFollowers}
                            disabled={selectedFollowers.length === 0 || inviteMutation.isPending}
                            className="w-full font-bold"
                            data-testid="button-send-friend-invites"
                          >
                            {inviteMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                            ) : (
                              <><Send className="w-4 h-4 mr-2" />Send Invites ({selectedFollowers.length})</>
                            )}
                          </Button>
                        </TabsContent>
                        
                        <TabsContent value="contact" className="space-y-4 pt-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="invite-emails">
                                <Mail className="w-4 h-4 inline mr-2" />
                                Email Addresses
                              </Label>
                              <Textarea 
                                id="invite-emails"
                                value={inviteEmails}
                                onChange={(e) => setInviteEmails(e.target.value)}
                                placeholder="Enter email addresses (comma or newline separated)"
                                className="min-h-[80px] bg-white/5 border-white/10 resize-none"
                                data-testid="input-invite-emails"
                              />
                              <Button 
                                onClick={handleSendEmailInvites}
                                disabled={!inviteEmails.trim() || inviteMutation.isPending}
                                variant="outline"
                                className="w-full border-white/10"
                                data-testid="button-send-email-invites"
                              >
                                {inviteMutation.isPending ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                                ) : (
                                  <><Mail className="w-4 h-4 mr-2" />Send Email Invites</>
                                )}
                              </Button>
                            </div>
                            
                            <div className="border-t border-white/10 pt-4 space-y-2">
                              <Label htmlFor="invite-phones">
                                <Phone className="w-4 h-4 inline mr-2" />
                                Phone Numbers (SMS)
                              </Label>
                              <Textarea 
                                id="invite-phones"
                                value={invitePhones}
                                onChange={(e) => setInvitePhones(e.target.value)}
                                placeholder="Enter phone numbers (comma or newline separated)"
                                className="min-h-[80px] bg-white/5 border-white/10 resize-none"
                                data-testid="input-invite-phones"
                              />
                              <Button 
                                onClick={handleSendSMSInvites}
                                disabled={!invitePhones.trim() || inviteMutation.isPending}
                                variant="outline"
                                className="w-full border-white/10"
                                data-testid="button-send-sms-invites"
                              >
                                {inviteMutation.isPending ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                                ) : (
                                  <><Phone className="w-4 h-4 mr-2" />Send SMS Invites</>
                                )}
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
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
                            <Label>Pool Image</Label>
                            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
                              {editImage ? (
                                <div className="relative">
                                  <img src={editImage} alt="Pool" className="w-full h-32 object-cover" data-testid="img-edit-pool-image" />
                                  <button
                                    type="button"
                                    onClick={() => setEditImage("")}
                                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                                    data-testid="button-remove-pool-image"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
                                  <ImagePlus className="w-8 h-8 mb-2" />
                                  <span className="text-sm">No image</span>
                                </div>
                              )}
                              <div className="p-2 border-t border-white/10">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={isUploadingPoolImage}
                                  onClick={() => poolImageInputRef.current?.click()}
                                  data-testid="button-upload-pool-image"
                                >
                                  {isUploadingPoolImage ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                                  ) : (
                                    <><Upload className="w-4 h-4 mr-2" /> {editImage ? 'Change Image' : 'Upload Image'}</>
                                  )}
                                </Button>
                              </div>
                            </div>
                            <input
                              type="file"
                              ref={poolImageInputRef}
                              accept="image/*"
                              className="hidden"
                              onChange={handlePoolImageUpload}
                              data-testid="input-pool-image-file"
                            />
                          </div>
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <div className="space-y-2">
                            <Label htmlFor="edit-status">Status</Label>
                            <select
                              id="edit-status"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              data-testid="select-edit-status"
                            >
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="closed">Closed</option>
                              <option value="completed">Completed</option>
                              <option value="expired">Expired</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                              {editStatus === 'paused' && 'Contributions will be temporarily suspended'}
                              {editStatus === 'closed' && 'Pool will be closed. Can be reopened later.'}
                              {editStatus === 'completed' && 'Mark pool as complete when goal is reached'}
                              {editStatus === 'active' && 'Pool is open for contributions'}
                              {editStatus === 'expired' && 'Pool deadline has passed'}
                            </p>
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
                )}
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
