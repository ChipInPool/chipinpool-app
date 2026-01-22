import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { VirtualCard } from "@/components/virtual-card";
import { ArrowLeft, Copy, Eye, EyeOff, ShoppingBag, ExternalLink, ShieldCheck, Store, Zap, DollarSign, Radio, Globe, X, ChevronRight, CreditCard, RefreshCw, Search, Building2, Loader2, CheckCircle, AlertCircle, Banknote, User, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransferSectionProps {
  poolId: string;
  balance: number;
  onTransferComplete: () => void;
}

interface BankAccount {
  id: string;
  institutionName: string;
  accountName: string;
  accountMask: string;
  accountType: string;
  isDefault: boolean;
}

interface Contributor {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string | null;
  totalContributed: string;
  hasBankLinked: boolean;
}

function TransferSection({ poolId, balance, onTransferComplete }: TransferSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [transferAmount, setTransferAmount] = useState("");
  const [recipientType, setRecipientType] = useState<"self" | "contributor">("self");
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: bankAccountsData, isLoading: loadingBankAccounts } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch("/api/bank-accounts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load bank accounts");
      return res.json();
    },
  });

  const { data: contributorsData, isLoading: loadingContributors } = useQuery({
    queryKey: ["poolContributors", poolId],
    queryFn: async () => {
      const res = await fetch(`/api/pools/${poolId}/contributors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load contributors");
      return res.json();
    },
  });

  const bankAccounts: BankAccount[] = bankAccountsData?.accounts || [];
  const contributors: Contributor[] = (contributorsData?.contributors || []).filter(
    (c: Contributor) => c.userId !== user?.id
  );

  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankAccountId) {
      const defaultAccount = bankAccounts.find(a => a.isDefault) || bankAccounts[0];
      setSelectedBankAccountId(defaultAccount.id);
    }
  }, [bankAccounts, selectedBankAccountId]);

  const transferMutation = useMutation({
    mutationFn: async (data: { toUserId: string; amount: string; notes?: string; bankAccountId?: string }) => {
      const res = await fetch(`/api/pools/${poolId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || "Transfer failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: recipientType === "self" ? "Transfer Initiated" : "Transfer Request Sent",
        description: data.message,
      });
      setTransferAmount("");
      setNotes("");
      setSelectedContributor(null);
      setConfirmOpen(false);
      onTransferComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Could not process transfer",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast({ description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (parseFloat(transferAmount) > balance) {
      toast({ description: "Amount exceeds available balance", variant: "destructive" });
      return;
    }
    if (recipientType === "self" && !selectedBankAccountId) {
      toast({ description: "Please link a bank account first", variant: "destructive" });
      return;
    }
    if (recipientType === "contributor" && !selectedContributor) {
      toast({ description: "Please select a contributor", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmTransfer = () => {
    const toUserId = recipientType === "self" ? user?.id : selectedContributor?.userId;
    if (!toUserId) return;

    transferMutation.mutate({
      toUserId,
      amount: transferAmount,
      notes: notes || undefined,
      bankAccountId: recipientType === "self" ? selectedBankAccountId : undefined,
    });
  };

  const getRecipientName = () => {
    if (recipientType === "self") {
      return "Your bank account";
    }
    return selectedContributor ? `${selectedContributor.firstName} ${selectedContributor.lastName}` : "";
  };

  const getSelectedBankAccount = () => bankAccounts.find(a => a.id === selectedBankAccountId);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Transfer pool funds to your bank account or send to a contributor.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Transfer To</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setRecipientType("self"); setSelectedContributor(null); }}
              className={`p-3 rounded-lg border text-left transition-all ${
                recipientType === "self" 
                  ? "border-primary bg-primary/10" 
                  : "border-white/10 hover:border-white/20"
              }`}
              data-testid="button-transfer-self"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">My Bank Account</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Transfer to your linked bank</p>
            </button>
            <button
              type="button"
              onClick={() => setRecipientType("contributor")}
              className={`p-3 rounded-lg border text-left transition-all ${
                recipientType === "contributor" 
                  ? "border-primary bg-primary/10" 
                  : "border-white/10 hover:border-white/20"
              }`}
              data-testid="button-transfer-contributor"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Pool Contributor</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Send to someone who contributed</p>
            </button>
          </div>
        </div>

        {recipientType === "self" && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Select Bank Account</span>
            </div>
            {loadingBankAccounts ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No bank accounts linked yet</p>
                <Button variant="outline" size="sm" className="border-white/10" asChild>
                  <Link href="/wallet">Link Bank Account</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedBankAccountId(account.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      selectedBankAccountId === account.id
                        ? "border-primary bg-primary/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    data-testid={`bank-account-${account.id}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{account.institutionName}</div>
                      <div className="text-xs text-muted-foreground">
                        {account.accountName} ****{account.accountMask}
                      </div>
                    </div>
                    {account.isDefault && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Default</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {recipientType === "contributor" && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Select Contributor</span>
            </div>
            {loadingContributors ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : contributors.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No other contributors to this pool</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contributors.map((contributor) => (
                  <button
                    key={contributor.userId}
                    type="button"
                    onClick={() => setSelectedContributor(contributor)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                      selectedContributor?.userId === contributor.userId
                        ? "border-primary bg-primary/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    data-testid={`contributor-${contributor.userId}`}
                  >
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={contributor.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-sm">
                        {contributor.firstName?.[0]}{contributor.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {contributor.firstName} {contributor.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{contributor.username} · Contributed ${contributor.totalContributed}
                      </div>
                    </div>
                    {!contributor.hasBankLinked && (
                      <span className="text-xs text-yellow-500 flex-shrink-0">No bank linked</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedContributor && !selectedContributor.hasBankLinked && (
              <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-500">
                  This contributor hasn't linked a bank account yet. They'll be asked to link one when accepting the transfer.
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="transferAmount">Transfer Amount</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="transferAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              placeholder="0.00"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="pl-9 bg-background/50 border-white/10"
              data-testid="input-transfer-amount"
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">
              Available: ${balance.toFixed(2)}
            </p>
            <button 
              type="button"
              onClick={() => setTransferAmount(balance.toFixed(2))}
              className="text-xs text-primary hover:underline"
              data-testid="button-transfer-max"
            >
              Transfer Max
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Input
            id="notes"
            placeholder="Add a note for this transfer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5 bg-background/50 border-white/10"
            data-testid="input-transfer-notes"
          />
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80"
          onClick={handleTransfer}
          disabled={
            transferMutation.isPending || 
            !transferAmount || 
            (recipientType === "self" && !selectedBankAccountId) ||
            (recipientType === "contributor" && !selectedContributor)
          }
          data-testid="button-initiate-transfer"
        >
          {transferMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Banknote className="w-4 h-4 mr-2" />
              {recipientType === "self" ? "Transfer to Bank" : "Send Transfer Request"}
            </>
          )}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              {recipientType === "self" ? "Confirm Transfer" : "Confirm Transfer Request"}
            </DialogTitle>
            <DialogDescription>
              {recipientType === "self" 
                ? "Please review the transfer details before confirming."
                : "The recipient will be notified to accept this transfer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recipient:</span>
              <span className="font-medium">{getRecipientName()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium text-lg">${parseFloat(transferAmount || "0").toFixed(2)}</span>
            </div>
            {recipientType === "self" && getSelectedBankAccount() && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank Account:</span>
                <span className="font-mono">
                  {getSelectedBankAccount()?.institutionName} ****{getSelectedBankAccount()?.accountMask}
                </span>
              </div>
            )}
            {notes && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Notes:</span>
                <span className="text-right max-w-[200px] truncate">{notes}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {recipientType === "self" ? "Estimated Arrival:" : "Status:"}
              </span>
              <span>
                {recipientType === "self" ? "1-3 business days" : "Pending acceptance"}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="border-white/10">
              Cancel
            </Button>
            <Button 
              onClick={confirmTransfer} 
              disabled={transferMutation.isPending}
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {recipientType === "self" ? "Confirm Transfer" : "Send Request"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showCardPanel, setShowCardPanel] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [cardHelperOpen, setCardHelperOpen] = useState(false);
  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);
  const [stripeElementsReady, setStripeElementsReady] = useState(false);
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
  const lastFour = card?.lastFour || '****';
  const expiry = card?.expiry || '';

  const formatCardNumber = () => {
    return `•••• •••• •••• ${lastFour}`;
  };

  const handleToggleCardDetails = async () => {
    if (showCardDetails) {
      setShowCardDetails(false);
      setStripeElementsReady(false);
      return;
    }
    
    if (!card?.stripeCardId) {
      toast({ description: "No virtual card available. Card will be created when pool is funded.", variant: "destructive" });
      return;
    }
    
    setCardDetailsLoading(true);
    try {
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (!stripeKey) {
        toast({ description: "Stripe is not configured", variant: "destructive" });
        return;
      }
      
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripeKey);
      
      if (!stripe) {
        toast({ description: "Failed to load Stripe", variant: "destructive" });
        return;
      }
      
      // Create nonce for ephemeral key
      const nonceResult = await stripe.createEphemeralKeyNonce({
        issuingCard: card.stripeCardId,
      });
      
      if (!nonceResult.nonce) {
        toast({ description: "Failed to create secure session", variant: "destructive" });
        return;
      }
      
      // Get ephemeral key from server
      const keyData = await api.virtualCards.getEphemeralKey(params?.id || '', nonceResult.nonce);
      
      // Create Stripe Elements for card display
      const elements = stripe.elements();
      
      // Mount card number element
      const cardNumberElement = elements.create('issuingCardNumberDisplay', {
        issuingCard: card.stripeCardId,
        nonce: nonceResult.nonce,
        ephemeralKeySecret: keyData.ephemeralKeySecret,
        style: {
          base: {
            color: '#fff',
            fontSize: '16px',
            fontFamily: 'monospace',
          },
        },
      });
      
      // Mount CVC element
      const cardCvcElement = elements.create('issuingCardCvcDisplay', {
        issuingCard: card.stripeCardId,
        nonce: nonceResult.nonce,
        ephemeralKeySecret: keyData.ephemeralKeySecret,
        style: {
          base: {
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
        },
      });
      
      // Mount expiry element
      const cardExpiryElement = elements.create('issuingCardExpiryDisplay', {
        issuingCard: card.stripeCardId,
        nonce: nonceResult.nonce,
        ephemeralKeySecret: keyData.ephemeralKeySecret,
        style: {
          base: {
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
        },
      });
      
      // Wait a moment for DOM to be ready
      setShowCardDetails(true);
      await new Promise(r => setTimeout(r, 100));
      
      const numberContainer = document.getElementById('stripe-card-number');
      const cvcContainer = document.getElementById('stripe-card-cvc');
      const expiryContainer = document.getElementById('stripe-card-expiry');
      
      if (numberContainer) cardNumberElement.mount(numberContainer);
      if (cvcContainer) cardCvcElement.mount(cvcContainer);
      if (expiryContainer) cardExpiryElement.mount(expiryContainer);
      
      setStripeElementsReady(true);
    } catch (error: any) {
      console.error('Card details error:', error);
      toast({ description: error.message || "Failed to retrieve card details", variant: "destructive" });
      setShowCardDetails(false);
    } finally {
      setCardDetailsLoading(false);
    }
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
                    onClick={handleToggleCardDetails}
                    disabled={cardDetailsLoading}
                    data-testid="button-toggle-card-details"
                  >
                    {cardDetailsLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    ) : showCardDetails ? (
                      <EyeOff className="w-3.5 h-3.5 mr-2" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 mr-2" />
                    )}
                    {cardDetailsLoading ? "Loading..." : showCardDetails ? "Hide Numbers" : "Show Numbers"}
                  </Button>
                </div>

                <div className="mb-8">
                  <VirtualCard 
                    balance={currentBalance} 
                    poolName={pool.title}
                    cardNumber={formatCardNumber()}
                    cvc="•••"
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
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Card Number</div>
                          <div id="stripe-card-number" className="font-mono text-sm font-medium text-foreground min-h-[24px]">
                            {!stripeElementsReady && <span className="animate-pulse">Loading...</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Expiry</div>
                            <div id="stripe-card-expiry" className="font-mono text-sm font-medium text-foreground min-h-[24px]">
                              {!stripeElementsReady && <span className="animate-pulse">Loading...</span>}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CVC</div>
                            <div id="stripe-card-cvc" className="font-mono text-sm font-medium text-foreground min-h-[24px]">
                              {!stripeElementsReady && <span className="animate-pulse">Loading...</span>}
                            </div>
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

                    <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-300">
                        Use your virtual card details at checkout. Click "Show Card Details" above to reveal your full card number, expiry, and CVC.
                      </p>
                    </div>
                  </div>
                ) : (
                  <TransferSection 
                    poolId={params?.id || ''} 
                    balance={currentBalance} 
                    onTransferComplete={() => {
                      refetchCard();
                      refetchTransactions();
                    }}
                  />
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
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-[9px] text-muted-foreground uppercase">Card Number</div>
                      <div className="font-mono text-xs font-medium">{formatCardNumber()}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-[9px] text-muted-foreground uppercase">Expiry</div>
                        <div className="font-mono text-xs font-medium">{expiry || '••/••'}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-[9px] text-muted-foreground uppercase">CVC</div>
                        <div className="font-mono text-xs font-medium">•••</div>
                      </div>
                    </div>
                    <div className="pt-1 text-[10px] text-center text-muted-foreground">
                      View full details in card panel
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
              
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Number</div>
                <div className="font-mono text-sm font-medium">{formatCardNumber()}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expiry</div>
                  <div className="font-mono text-sm font-medium">{expiry || '••/••'}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CVC</div>
                  <div className="font-mono text-sm font-medium">•••</div>
                </div>
              </div>
              
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Click "Show Numbers" in the card panel to reveal full details
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
