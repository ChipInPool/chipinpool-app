import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { VirtualCard } from "@/components/virtual-card";
import { ArrowLeft, Copy, Eye, EyeOff, ShoppingBag, ExternalLink, ShieldCheck, Store, Zap, Plus, DollarSign, Radio, Globe, X, ChevronRight, CreditCard, RefreshCw, Search } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  merchant: string;
  amount: string;
  status: string;
  createdAt: string;
}

const POPULAR_MERCHANTS = [
  { name: "Amazon", url: "https://www.amazon.com", icon: "🛒", color: "from-orange-500/20 to-orange-600/10" },
  { name: "eBay", url: "https://www.ebay.com", icon: "🏷️", color: "from-blue-500/20 to-blue-600/10" },
  { name: "Target", url: "https://www.target.com", icon: "🎯", color: "from-red-500/20 to-red-600/10" },
  { name: "Walmart", url: "https://www.walmart.com", icon: "🏪", color: "from-blue-600/20 to-blue-700/10" },
  { name: "Best Buy", url: "https://www.bestbuy.com", icon: "💻", color: "from-yellow-500/20 to-yellow-600/10" },
  { name: "Nike", url: "https://www.nike.com", icon: "👟", color: "from-gray-500/20 to-gray-600/10" },
  { name: "Airbnb", url: "https://www.airbnb.com", icon: "🏠", color: "from-pink-500/20 to-pink-600/10" },
  { name: "Uber Eats", url: "https://www.ubereats.com", icon: "🍔", color: "from-green-500/20 to-green-600/10" },
];

export default function SpendPool() {
  const [, params] = useRoute("/pool/:id/spend");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'virtual' | 'transfer'>('virtual');
  const [liveMode, setLiveMode] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [merchantName, setMerchantName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showCardPanel, setShowCardPanel] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [cardHelperOpen, setCardHelperOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: poolData, isLoading: poolLoading } = useQuery({
    queryKey: queryKeys.pool(params?.id || ''),
    queryFn: () => api.pools.get(params?.id || ''),
    enabled: !!params?.id && isAuthenticated,
  });

  const { data: cardData, isLoading: cardLoading, refetch: refetchCard } = useQuery({
    queryKey: queryKeys.virtualCard(params?.id || ''),
    queryFn: () => api.virtualCards.get(params?.id || ''),
    enabled: !!params?.id && isAuthenticated,
    refetchInterval: liveMode ? 2000 : false,
  });

  const card = cardData?.card;

  const { data: transactionsData, refetch: refetchTransactions } = useQuery({
    queryKey: queryKeys.cardTransactions(card?.id || ''),
    queryFn: () => api.virtualCards.getTransactions(card?.id || ''),
    enabled: !!card?.id,
    refetchInterval: liveMode ? 2000 : false,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async ({ merchant, amount }: { merchant: string; amount: string }) => {
      return api.virtualCards.createTransaction(card!.id, merchant, amount);
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Payment Successful",
        description: `Paid $${parseFloat(variables.amount).toFixed(2)} to ${variables.merchant}`,
      });
      setPurchaseOpen(false);
      setMerchantName("");
      setPurchaseAmount("");
      refetchCard();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: queryKeys.virtualCard(params?.id || '') });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not process payment",
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

  if (poolLoading || authLoading || cardLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-40 mb-6" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </Layout>
    );
  }

  const pool = poolData?.pool;
  const transactions: Transaction[] = transactionsData?.transactions || [];

  if (!pool) return <Layout><div className="text-center py-20">Pool not found</div></Layout>;
  
  if (pool.creatorId !== user?.id) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only the pool creator can spend pool funds.</p>
          <Button className="mt-4" asChild>
            <Link href={`/pool/${pool.id}`}>Back to Pool</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const currentBalance = parseFloat(card?.balance || pool.currentAmount || '0');
  const cardNumber = card?.cardNumber || '4922000000000000';
  const cvc = card?.cvc || '000';
  const expiry = card?.expiry || '05/28';

  const formatCardNumber = (num: string, show: boolean) => {
    const clean = num.replace(/\s/g, '');
    if (show) {
      return `${clean.slice(0,4)} ${clean.slice(4,8)} ${clean.slice(8,12)} ${clean.slice(12,16)}`;
    }
    return `•••• •••• •••• ${clean.slice(-4)}`;
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

  const handleQuickPurchase = (merchant: string, amount: number) => {
    if (currentBalance < amount) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${amount.toFixed(2)} but only have $${currentBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    createTransactionMutation.mutate({ merchant, amount: amount.toString() });
  };

  const handleCustomPurchase = () => {
    const amount = parseFloat(purchaseAmount);
    if (!merchantName.trim()) {
      toast({ title: "Enter merchant name", variant: "destructive" });
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Enter valid amount", variant: "destructive" });
      return;
    }
    if (amount > currentBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    createTransactionMutation.mutate({ merchant: merchantName, amount: amount.toString() });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const openMerchantBrowser = (url: string) => {
    setBrowserUrl(url);
    setUrlInput(url);
    setIframeError(false);
    setBrowserOpen(true);
  };

  const openExternalWithHelper = (url: string) => {
    window.open(url, '_blank');
    setCardHelperOpen(true);
    setBrowserOpen(false);
    toast({
      title: "Card details ready",
      description: "Your card info is shown below. Copy and paste at checkout!",
    });
  };

  const navigateToUrl = () => {
    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setIframeError(false);
    setBrowserUrl(url);
  };

  const refreshBrowser = () => {
    const currentUrl = browserUrl;
    setBrowserUrl('');
    setIframeError(false);
    setTimeout(() => setBrowserUrl(currentUrl), 100);
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Link href={`/pool/${pool.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pool
        </Link>

        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Spend Pool Funds</h1>
            <p className="text-muted-foreground">Use the collected funds securely online or transfer to a merchant.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                liveMode 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
              }`}
              data-testid="button-toggle-live-mode"
            >
              <Radio className={`w-3 h-3 ${liveMode ? 'animate-pulse' : ''}`} />
              {liveMode ? 'LIVE' : 'Live Mode'}
            </button>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Available to Spend</p>
              <motion.p 
                key={currentBalance}
                initial={{ scale: 1.1, color: 'hsl(var(--primary))' }}
                animate={{ scale: 1, color: 'hsl(var(--primary))' }}
                className="text-3xl font-mono font-bold"
              >
                ${currentBalance.toFixed(2)}
              </motion.p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-7 space-y-6">
            <div className="p-1 rounded-3xl bg-linear-to-b from-white/10 to-transparent">
              <div className="bg-card/50 backdrop-blur-xl rounded-[22px] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Virtual Pool Card</h2>
                    <p className="text-xs text-muted-foreground">Generated for "{pool.title}"</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 border-white/10"
                    onClick={() => setShowCardDetails(!showCardDetails)}
                    data-testid="button-toggle-card-details"
                  >
                    {showCardDetails ? <EyeOff className="w-3.5 h-3.5 mr-2" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
                    {showCardDetails ? "Hide Numbers" : "Show Numbers"}
                  </Button>
                </div>

                <div className="mb-8">
                  <VirtualCard 
                    balance={currentBalance} 
                    poolName={pool.title}
                    cardNumber={formatCardNumber(cardNumber, showCardDetails)}
                    cvc={showCardDetails ? cvc : "•••"}
                    expiry={expiry}
                  />
                </div>

                <AnimatePresence>
                  {showCardDetails && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center group cursor-pointer" onClick={() => handleCopy(cardNumber.replace(/\s/g, ''), "Card number")}>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Number</div>
                            <div className="font-mono text-sm font-medium text-foreground">{formatCardNumber(cardNumber, true)}</div>
                          </div>
                          <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-white/5 border border-white/5 group cursor-pointer" onClick={() => handleCopy(expiry, "Expiry")}>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expiry</div>
                            <div className="font-mono text-sm font-medium text-foreground">{expiry}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/5 border border-white/5 group cursor-pointer" onClick={() => handleCopy(cvc, "CVC")}>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CVC</div>
                            <div className="font-mono text-sm font-medium text-foreground">{cvc}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>This is a single-use virtual card. It will lock automatically after the full balance is spent.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 space-y-6">
            <div className="rounded-2xl bg-card border border-white/10 overflow-hidden">
              <div className="flex border-b border-white/10">
                <button 
                  onClick={() => setActiveTab('virtual')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'virtual' ? 'bg-white/5 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                >
                  Online Checkout
                </button>
                <button 
                  onClick={() => setActiveTab('transfer')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'transfer' ? 'bg-white/5 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                >
                  Direct Transfer
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'virtual' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Shop online with your virtual card. Browse stores and pay at checkout using your card details.
                    </p>
                    
                    <Button 
                      className="w-full group bg-gradient-to-r from-primary to-primary/80" 
                      onClick={() => openMerchantBrowser('https://www.amazon.com')}
                      data-testid="button-shop-now"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Shop Now
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <div className="pt-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Popular Stores</p>
                      <div className="grid grid-cols-4 gap-2">
                        {POPULAR_MERCHANTS.slice(0, 8).map((merchant) => (
                          <button
                            key={merchant.name}
                            onClick={() => openMerchantBrowser(merchant.url)}
                            className={`p-3 rounded-xl bg-gradient-to-br ${merchant.color} border border-white/5 hover:border-white/20 transition-all hover:scale-105 flex flex-col items-center gap-1`}
                            data-testid={`button-merchant-${merchant.name.toLowerCase()}`}
                          >
                            <span className="text-xl">{merchant.icon}</span>
                            <span className="text-[10px] font-medium truncate w-full text-center">{merchant.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full border-white/10" data-testid="button-manual-entry">
                            <Plus className="w-4 h-4 mr-2" />
                            Log Manual Purchase
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10">
                          <DialogHeader>
                            <DialogTitle>Log a Purchase</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <Label htmlFor="merchant">Merchant Name</Label>
                              <Input
                                id="merchant"
                                placeholder="e.g., Amazon, Uber, Netflix"
                                value={merchantName}
                                onChange={(e) => setMerchantName(e.target.value)}
                                className="mt-1.5"
                                data-testid="input-merchant-name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="amount">Amount ($)</Label>
                              <div className="relative mt-1.5">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  id="amount"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={currentBalance}
                                  placeholder="0.00"
                                  value={purchaseAmount}
                                  onChange={(e) => setPurchaseAmount(e.target.value)}
                                  className="pl-9"
                                  data-testid="input-purchase-amount"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Available: ${currentBalance.toFixed(2)}
                              </p>
                            </div>
                            <Button 
                              className="w-full" 
                              onClick={handleCustomPurchase}
                              disabled={createTransactionMutation.isPending}
                              data-testid="button-confirm-purchase"
                            >
                              {createTransactionMutation.isPending ? "Processing..." : "Log Purchase"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Transfer funds directly to a connected bank account or merchant ID.
                    </p>
                    <div className="p-4 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-center gap-2 py-8 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">Connect Bank Account</h4>
                        <p className="text-xs text-muted-foreground">Via Plaid or Stripe Connect</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                {liveMode && (
                  <span className="flex items-center gap-1.5 text-xs text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              {transactions.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {transactions.map((tx, index) => (
                      <motion.div 
                        key={tx.id} 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.merchant}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <span className="font-mono text-sm text-red-400">-${parseFloat(tx.amount).toFixed(2)}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No transactions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 bg-card border-white/10 flex flex-col">
          <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-background/50">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBrowserOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigateToUrl()}
                  placeholder="Enter website URL..."
                  className="pl-9 h-9 bg-white/5 border-white/10"
                  data-testid="input-browser-url"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateToUrl}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshBrowser}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs gap-1.5"
                onClick={() => openExternalWithHelper(browserUrl)}
              >
                <ExternalLink className="w-3 h-3" />
                Open External
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            {browserUrl ? (
              <>
                <iframe
                  src={browserUrl}
                  className="w-full h-full border-0"
                  title="Merchant Website"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  onError={handleIframeError}
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 rounded-xl bg-card/95 backdrop-blur-xl border border-white/10 shadow-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Site not loading?</span>
                  </div>
                  <Button size="sm" onClick={() => openExternalWithHelper(browserUrl)} className="gap-2 h-8">
                    <ExternalLink className="w-3 h-3" />
                    Open in New Tab
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Enter a URL to start shopping</p>
                  <p className="text-sm opacity-75">Use your virtual card at checkout</p>
                </div>
              </div>
            )}
            
            <AnimatePresence>
              {showCardPanel && (
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="absolute right-4 top-4 w-72 bg-card/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                >
                  <div className="p-3 border-b border-white/10 flex items-center justify-between bg-primary/10">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Your Card</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-primary font-bold">${currentBalance.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCardPanel(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div 
                      className="p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors flex justify-between items-center group"
                      onClick={() => handleCopy(cardNumber.replace(/\s/g, ''), "Card number")}
                    >
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase">Card Number</div>
                        <div className="font-mono text-xs font-medium">{formatCardNumber(cardNumber, true)}</div>
                      </div>
                      <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className="p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                        onClick={() => handleCopy(expiry, "Expiry")}
                      >
                        <div className="text-[9px] text-muted-foreground uppercase">Expiry</div>
                        <div className="font-mono text-xs font-medium flex items-center justify-between">
                          {expiry}
                          <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                      <div 
                        className="p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                        onClick={() => handleCopy(cvc, "CVC")}
                      >
                        <div className="text-[9px] text-muted-foreground uppercase">CVC</div>
                        <div className="font-mono text-xs font-medium flex items-center justify-between">
                          {cvc}
                          <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    </div>
                    <div className="pt-1 text-[10px] text-center text-muted-foreground">
                      Click any field to copy
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!showCardPanel && (
              <Button
                className="absolute right-4 top-4 h-10 w-10 rounded-full shadow-lg"
                onClick={() => setShowCardPanel(true)}
              >
                <CreditCard className="w-5 h-5" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {cardHelperOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 w-80 bg-card/95 backdrop-blur-xl rounded-2xl border border-primary/30 shadow-2xl shadow-primary/10 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Card Ready for Checkout</p>
                  <p className="text-xs text-muted-foreground">Click to copy details</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCardHelperOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
                  <p className="text-lg font-mono font-bold text-primary">${currentBalance.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</p>
                  <p className="text-sm font-medium">Visa Debit</p>
                </div>
              </div>
              
              <div 
                className="p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors flex justify-between items-center group"
                onClick={() => handleCopy(cardNumber.replace(/\s/g, ''), "Card number")}
              >
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Number</div>
                  <div className="font-mono text-sm font-medium">{formatCardNumber(cardNumber, true)}</div>
                </div>
                <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className="p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                  onClick={() => handleCopy(expiry, "Expiry")}
                >
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expiry</div>
                  <div className="font-mono text-sm font-medium flex items-center justify-between">
                    {expiry}
                    <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
                <div 
                  className="p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                  onClick={() => handleCopy(cvc, "CVC")}
                >
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CVC</div>
                  <div className="font-mono text-sm font-medium flex items-center justify-between">
                    {cvc}
                    <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full border-white/10 text-xs"
                onClick={() => {
                  setCardHelperOpen(false);
                  setPurchaseOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-2" />
                Log this purchase when done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
