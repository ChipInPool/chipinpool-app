import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoolCard } from "@/components/pool-card";
import { Star, MapPin, Calendar, Link as LinkIcon, Trophy, Target, Wallet, Plus, Minus, Clock, Users, UserPlus, ChevronDown, ChevronUp, Building, AlertCircle, Receipt, RefreshCw, Loader2, CreditCard, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useLocation, useSearch, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showNewBankForm, setShowNewBankForm] = useState(false);
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [institutionName, setInstitutionName] = useState("");
  const [saveAsPayoutMethod, setSaveAsPayoutMethod] = useState(true);
  const [payoutMethodsDialogOpen, setPayoutMethodsDialogOpen] = useState(false);

  const handleSyncWallet = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/wallet/sync", { 
        method: "POST", 
        credentials: "include" 
      });
      const data = await response.json();
      if (data.synced > 0) {
        toast({ description: data.message });
        queryClient.invalidateQueries({ queryKey: queryKeys.user });
      } else {
        toast({ description: "Wallet is up to date" });
      }
    } catch (error: any) {
      toast({ description: "Failed to sync wallet", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('deposit') === 'success') {
      toast({ description: "Deposit successful! Syncing your balance..." });
      // Auto-sync wallet from Stripe after successful deposit
      fetch("/api/wallet/sync", { method: "POST", credentials: "include" })
        .then(res => res.json())
        .then(data => {
          queryClient.invalidateQueries({ queryKey: queryKeys.user });
          if (data.synced > 0) {
            toast({ description: `Added $${data.balance} to your wallet` });
          }
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.user });
        });
      window.history.replaceState({}, '', '/profile');
    }
  }, [searchString, toast, queryClient]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const response = await api.users.depositCheckout(amount);
      if (response.url) {
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          response.url,
          'stripe_checkout',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
        if (!popup) {
          window.location.href = response.url;
        } else {
          setDepositDialogOpen(false);
          setIsProcessing(false);
        }
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to start checkout", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (parseFloat(amount) < 10) {
      toast({ description: "Minimum withdrawal is $10", variant: "destructive" });
      return;
    }
    
    // Validation depends on whether using saved method or new bank details
    if (selectedMethodId) {
      // Using saved method - no additional validation needed
    } else if (showNewBankForm) {
      if (!routingNumber || routingNumber.length !== 9) {
        toast({ description: "Please enter a valid 9-digit routing number", variant: "destructive" });
        return;
      }
      if (!accountNumber || accountNumber.length < 4) {
        toast({ description: "Please enter a valid account number", variant: "destructive" });
        return;
      }
      if (!accountHolderName.trim()) {
        toast({ description: "Please enter the account holder name", variant: "destructive" });
        return;
      }
      if (!institutionName.trim()) {
        toast({ description: "Please enter the bank name", variant: "destructive" });
        return;
      }
    } else {
      toast({ description: "Please select a payout method or add a new bank account", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      // Build request body based on selected method
      const body: any = { amount };
      
      if (selectedMethodId) {
        body.savedMethodId = selectedMethodId;
      } else {
        body.routingNumber = routingNumber;
        body.accountNumber = accountNumber;
        body.accountHolderName = accountHolderName.trim();
        body.accountType = accountType;
        
        // Optionally save as payout method
        if (saveAsPayoutMethod) {
          await fetch('/api/payout-methods', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountHolderName: accountHolderName.trim(),
              routingNumber,
              accountNumber,
              accountType,
              institutionName: institutionName.trim(),
              setAsDefault: payoutMethods.length === 0,
            }),
          });
          refetchPayoutMethods();
        }
      }

      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }
      toast({ description: data.message || `Withdrawal request submitted` });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      setWithdrawDialogOpen(false);
      setAmount("");
      setRoutingNumber("");
      setAccountNumber("");
      setAccountHolderName("");
      setInstitutionName("");
      setSelectedMethodId(null);
      setShowNewBankForm(false);
    } catch (error: any) {
      toast({ description: error.message || "Withdrawal failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate withdrawal amount
  const withdrawAmount = parseFloat(amount || '0');

  const handleDeletePayoutMethod = async (methodId: string) => {
    try {
      const res = await fetch(`/api/payout-methods/${methodId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ description: "Payout method removed" });
      refetchPayoutMethods();
      if (selectedMethodId === methodId) {
        setSelectedMethodId(null);
      }
    } catch (error) {
      toast({ description: "Failed to remove payout method", variant: "destructive" });
    }
  };

  const handleSetDefaultPayoutMethod = async (methodId: string) => {
    try {
      const res = await fetch(`/api/payout-methods/${methodId}/set-default`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to set default');
      toast({ description: "Default payout method updated" });
      refetchPayoutMethods();
    } catch (error) {
      toast({ description: "Failed to update default", variant: "destructive" });
    }
  };

  const { data: poolsData, isLoading: poolsLoading } = useQuery({
    queryKey: queryKeys.pools,
    queryFn: api.pools.list,
    enabled: isAuthenticated,
  });

  const { data: followersData } = useQuery({
    queryKey: queryKeys.followers(user?.id || ""),
    queryFn: () => api.users.getFollowers(user?.id || ""),
    enabled: isAuthenticated && !!user?.id,
  });

  const { data: followingData } = useQuery({
    queryKey: queryKeys.following(user?.id || ""),
    queryFn: () => api.users.getFollowing(user?.id || ""),
    enabled: isAuthenticated && !!user?.id,
  });

  const { data: plaidStatus } = useQuery({
    queryKey: ["plaidStatus"],
    queryFn: api.plaid.getStatus,
    enabled: isAuthenticated,
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch("/api/bank-accounts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: payoutMethodsData, refetch: refetchPayoutMethods } = useQuery({
    queryKey: ["payoutMethods"],
    queryFn: async () => {
      const res = await fetch("/api/payout-methods", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payout methods");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const payoutMethods = payoutMethodsData?.methods || [];

  const hasBankLinked = plaidStatus?.hasBankLinked || 
    (bankAccountsData?.accounts?.some((a: any) => a.stripeFinancialConnectionsAccountId || a.canReceivePayouts));

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-64 rounded-3xl mb-20" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-24">
            <div className="lg:col-span-4">
              <Skeleton className="h-96 rounded-2xl" />
            </div>
            <div className="lg:col-span-8">
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const pools = poolsData?.pools || [];
  const userPools = pools.filter((p: any) => p.creatorId === user.id);
  const joinedPools = pools.filter((p: any) => 
    p.creatorId !== user.id && 
    p.contributors?.some((c: any) => c.user?.id === user.id)
  );

  const badges = user.badges || [];
  const poolsCreated = parseInt(String(user.poolsCreated)) || 0;
  const totalContributed = parseFloat(user.totalContributed) || 0;
  const rating = parseFloat(user.rating || '5.0') || 5.0;

  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="relative mb-20">
          <div className="h-64 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-accent/20 to-purple-500/20 mix-blend-overlay" />
            <img 
              src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=80" 
              alt="Cover" 
              className="w-full h-full object-cover opacity-60" 
            />
          </div>

          <div className="absolute -bottom-16 left-8 right-8 flex items-end justify-between">
            <div className="flex items-end gap-6">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback>{user.firstName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-background rounded-full" title="Online" />
              </div>
              <div className="pb-2 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-display font-bold">{user.firstName} {user.lastName}</h1>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Pro Member</Badge>
                </div>
                <p className="text-muted-foreground mb-2">@{user.username}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {user.location || 'Location not set'}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex gap-3 mb-4">
              <Button variant="outline" className="border-white/10" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ description: "Profile link copied to clipboard" }); }}>
                <LinkIcon className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-24">
          <div className="lg:col-span-4 space-y-6">
            <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-card border border-white/5 text-center">
              <div>
                <div className="text-2xl font-bold font-display">{poolsCreated}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Created</div>
              </div>
              <div className="border-x border-white/5">
                <div className="text-2xl font-bold font-display">{userPools.length + joinedPools.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Joined</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display flex items-center justify-center gap-1">
                  {rating.toFixed(1)} <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Rating</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-white/5" data-testid="network-section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> Network
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  onClick={() => setFollowersDialogOpen(true)}
                  className="text-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  data-testid="button-followers-count"
                >
                  <div className="text-xl font-bold font-display flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" /> {followers.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </button>
                <button 
                  onClick={() => setFollowingDialogOpen(true)}
                  className="text-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  data-testid="button-following-count"
                >
                  <div className="text-xl font-bold font-display flex items-center justify-center gap-1">
                    <UserPlus className="w-4 h-4 text-muted-foreground" /> {following.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Following</div>
                </button>
              </div>

              <Collapsible open={followersOpen} onOpenChange={setFollowersOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-sm" data-testid="trigger-followers">
                  <span className="text-muted-foreground">Followers</span>
                  {followersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {followers.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2">No followers yet</p>
                  ) : (
                    <div className="space-y-2">
                      {followers.slice(0, 5).map((follower: any) => (
                        <Link key={follower.id} href={`/user/${follower.id}`} data-testid={`link-follower-${follower.id}`}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={follower.avatar || undefined} />
                              <AvatarFallback>{follower.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{follower.name}</span>
                          </div>
                        </Link>
                      ))}
                      {followers.length > 5 && (
                        <button 
                          onClick={() => setFollowersDialogOpen(true)}
                          className="text-sm text-primary hover:underline px-2"
                          data-testid="button-view-all-followers"
                        >
                          View all {followers.length} followers
                        </button>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={followingOpen} onOpenChange={setFollowingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-sm mt-2" data-testid="trigger-following">
                  <span className="text-muted-foreground">Following</span>
                  {followingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {following.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2">Not following anyone yet</p>
                  ) : (
                    <div className="space-y-2">
                      {following.slice(0, 5).map((followedUser: any) => (
                        <Link key={followedUser.id} href={`/user/${followedUser.id}`} data-testid={`link-following-${followedUser.id}`}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={followedUser.avatar || undefined} />
                              <AvatarFallback>{followedUser.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{followedUser.name}</span>
                          </div>
                        </Link>
                      ))}
                      {following.length > 5 && (
                        <button 
                          onClick={() => setFollowingDialogOpen(true)}
                          className="text-sm text-primary hover:underline px-2"
                          data-testid="button-view-all-following"
                        >
                          View all {following.length} following
                        </button>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-white/5" data-testid="wallet-section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-500" /> Wallet
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSyncWallet}
                  disabled={isSyncing}
                  data-testid="button-sync-wallet"
                  title="Sync wallet with Stripe"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold font-display text-green-500" data-testid="text-balance">
                  ${parseFloat(user.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</div>
              </div>
              <div className="flex gap-2 mb-3">
                <Button 
                  className="flex-1" 
                  onClick={() => setDepositDialogOpen(true)}
                  data-testid="button-add-funds"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Funds
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setWithdrawDialogOpen(true)}
                  data-testid="button-withdraw"
                >
                  <Minus className="w-4 h-4 mr-2" /> Withdraw
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 text-muted-foreground hover:text-foreground"
                  asChild
                  data-testid="button-transactions"
                >
                  <Link href="/transactions">
                    <Receipt className="w-4 h-4 mr-2" /> Transactions
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-muted-foreground hover:text-foreground"
                  asChild
                  data-testid="button-recurring"
                >
                  <Link href="/recurring">
                    <RefreshCw className="w-4 h-4 mr-2" /> Recurring
                  </Link>
                </Button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" /> Achievements
                </h3>
                <span className="text-xs text-muted-foreground">{badges.length} earned</span>
              </div>
              <div className="space-y-4">
                {badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No badges yet. Start contributing to earn achievements!</p>
                ) : (
                  badges.map((badge: any) => (
                    <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${badge.color}`}>
                        {badge.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{badge.name}</div>
                        <div className="text-xs text-muted-foreground">{badge.description || 'Earned 2024'}</div>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex items-center gap-3 p-2 rounded-lg opacity-50 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                    🎯
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Goal Getter</div>
                    <div className="text-xs text-muted-foreground">Complete 10 pools</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-linear-to-br from-primary/10 to-accent/10 border border-primary/10">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-primary">
                <Target className="w-4 h-4" /> Impact
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                You've helped friends achieve <span className="text-foreground font-bold">${totalContributed.toLocaleString()}</span> in goals!
              </p>
              <div className="h-2 rounded-full bg-background/50 overflow-hidden">
                <div className="h-full bg-linear-to-r from-primary to-accent" style={{ width: `${Math.min(100, (totalContributed / 5000) * 100)}%` }} />
              </div>
              <div className="mt-2 text-xs text-right text-muted-foreground">
                {totalContributed >= 1000 ? 'Top 5% of contributors' : 'Keep contributing!'}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-6 border-b border-white/10 pb-4">
              <button className="text-lg font-bold border-b-2 border-primary pb-4 -mb-4.5 px-2">My Pools</button>
              <button className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors px-2">Activity</button>
            </div>

            {poolsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-[300px] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {userPools.length > 0 && (
                  <section>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Created by You</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userPools.map((pool: any) => (
                        <PoolCard key={pool.id} pool={pool} />
                      ))}
                    </div>
                  </section>
                )}

                {joinedPools.length > 0 && (
                  <section>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Chipped In</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {joinedPools.map((pool: any) => (
                        <PoolCard key={pool.id} pool={pool} />
                      ))}
                    </div>
                  </section>
                )}

                {userPools.length === 0 && joinedPools.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No pools yet. Create your first pool to get started!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-500" />
              </div>
              Add Funds
            </DialogTitle>
            <DialogDescription>
              Securely deposit money to your ChipIn wallet
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-5">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-green-500">
                ${parseFloat(user?.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to deposit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="pl-8 text-lg h-12"
                  data-testid="input-deposit-amount"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {[25, 50, 100, 250].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAmount(preset.toString())}
                  data-testid={`button-preset-${preset}`}
                >
                  ${preset}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-purple-300">Powered by Stripe</p>
                <p className="text-muted-foreground text-xs">Secure payment processing</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setDepositDialogOpen(false); setAmount(""); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeposit} 
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-deposit"
            >
              {isProcessing ? "Processing..." : `Deposit $${amount || '0'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Minus className="w-5 h-5 text-blue-500" />
              </div>
              Withdraw Funds
            </DialogTitle>
            <DialogDescription>
              Transfer money from your wallet to your bank
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-5">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-blue-400">
                ${parseFloat(user?.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to withdraw (min $10)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                    max={parseFloat(user?.balance || '0')}
                    step="0.01"
                    className="pl-8 text-lg h-12"
                    data-testid="input-withdraw-amount"
                  />
                </div>
                {parseFloat(amount || '0') > parseFloat(user?.balance || '0') && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Amount exceeds available balance
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setAmount((parseFloat(user?.balance || '0') * 0.25).toFixed(2))}>25%</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setAmount((parseFloat(user?.balance || '0') * 0.5).toFixed(2))}>50%</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setAmount((parseFloat(user?.balance || '0') * 0.75).toFixed(2))}>75%</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setAmount(user?.balance || '0')}>Max</Button>
              </div>

              <div className="pt-2 border-t border-white/10">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Payout Method
                </h4>
                
                {user?.kycStatus !== 'verified' && (
                  <Alert className="mb-3 border-yellow-500/30 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-sm">
                      Please complete identity verification before withdrawing. <a href="/kyc" className="underline text-yellow-400">Verify now</a>
                    </AlertDescription>
                  </Alert>
                )}

                {payoutMethods.length > 0 && !showNewBankForm && (
                  <div className="space-y-2 mb-3">
                    {payoutMethods.map((method: any) => (
                      <div 
                        key={method.id}
                        onClick={() => setSelectedMethodId(method.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMethodId === method.id 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                        data-testid={`payout-method-${method.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Building className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{method.institutionName}</p>
                            <p className="text-xs text-muted-foreground">
                              {method.accountType} ••••{method.accountMask}
                            </p>
                          </div>
                          {method.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {selectedMethodId === method.id && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => { setShowNewBankForm(true); setSelectedMethodId(null); }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Use a different bank account
                    </Button>
                  </div>
                )}

                {(payoutMethods.length === 0 || showNewBankForm) && (
                  <div className="space-y-3">
                    {showNewBankForm && payoutMethods.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setShowNewBankForm(false); setSelectedMethodId(payoutMethods[0]?.id); }}
                      >
                        ← Back to saved methods
                      </Button>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Bank Name</label>
                      <Input
                        type="text"
                        placeholder="e.g., Chase, Bank of America"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        className="h-10"
                        data-testid="input-bank-name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Account Holder Name</label>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        className="h-10"
                        data-testid="input-account-holder"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Routing Number</label>
                        <Input
                          type="text"
                          placeholder="9 digits"
                          value={routingNumber}
                          onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          maxLength={9}
                          className="h-10"
                          data-testid="input-routing-number"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Account Number</label>
                        <Input
                          type="text"
                          placeholder="Account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                          maxLength={17}
                          className="h-10"
                          data-testid="input-account-number"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant={accountType === 'checking' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setAccountType('checking')}
                      >
                        Checking
                      </Button>
                      <Button
                        variant={accountType === 'savings' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setAccountType('savings')}
                      >
                        Savings
                      </Button>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={saveAsPayoutMethod}
                        onChange={(e) => setSaveAsPayoutMethod(e.target.checked)}
                        className="rounded"
                      />
                      Save this bank for future withdrawals
                    </label>
                  </div>
                )}
              </div>

              {withdrawAmount >= 10 && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>You'll receive</span>
                    <span className="text-green-400">${withdrawAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                <span>Withdrawals are processed within 1-2 business days.</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { 
              setWithdrawDialogOpen(false); 
              setAmount(""); 
              setRoutingNumber(""); 
              setAccountNumber(""); 
              setAccountHolderName(""); 
              setInstitutionName("");
              setSelectedMethodId(null);
              setShowNewBankForm(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdraw} 
              disabled={
                isProcessing || 
                !amount || 
                parseFloat(amount) < 10 || 
                parseFloat(amount) > parseFloat(user?.balance || '0') ||
                user?.kycStatus !== 'verified' ||
                (!selectedMethodId && !showNewBankForm) ||
                (showNewBankForm && (routingNumber.length !== 9 || accountNumber.length < 4 || !accountHolderName.trim() || !institutionName.trim()))
              }
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-withdraw"
            >
              {isProcessing ? "Processing..." : `Request Withdrawal`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followersDialogOpen} onOpenChange={setFollowersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> Followers ({followers.length})
            </DialogTitle>
            <DialogDescription>
              People who follow you
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            {followers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No followers yet</p>
            ) : (
              <div className="space-y-2">
                {followers.map((follower: any) => (
                  <Link key={follower.id} href={`/user/${follower.id}`} onClick={() => setFollowersDialogOpen(false)} data-testid={`dialog-link-follower-${follower.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={follower.avatar || undefined} />
                        <AvatarFallback>{follower.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{follower.name}</span>
                        {follower.email && (
                          <span className="text-xs text-muted-foreground block truncate">{follower.email}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={followingDialogOpen} onOpenChange={setFollowingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Following ({following.length})
            </DialogTitle>
            <DialogDescription>
              People you follow
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            {following.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Not following anyone yet</p>
            ) : (
              <div className="space-y-2">
                {following.map((followedUser: any) => (
                  <Link key={followedUser.id} href={`/user/${followedUser.id}`} onClick={() => setFollowingDialogOpen(false)} data-testid={`dialog-link-following-${followedUser.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={followedUser.avatar || undefined} />
                        <AvatarFallback>{followedUser.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{followedUser.name}</span>
                        {followedUser.email && (
                          <span className="text-xs text-muted-foreground block truncate">{followedUser.email}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
