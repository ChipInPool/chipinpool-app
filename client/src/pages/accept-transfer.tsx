import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Banknote, Building2, CheckCircle, XCircle, Loader2, AlertCircle, Shield, Clock, Zap, CreditCard, RefreshCw } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface TransferRequest {
  id: string;
  poolId: string;
  poolName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  amount: string;
  notes: string | null;
  status: "pending" | "accepted" | "completed" | "cancelled" | "failed";
  createdAt: string;
}

interface BankAccount {
  id: string;
  institutionName: string;
  accountName: string;
  accountMask: string;
  accountType: string;
  payoutMethod: 'bank_account' | 'debit_card';
  isDefault: boolean;
  canReceivePayouts: boolean;
}

export default function AcceptTransfer() {
  const [, params] = useRoute("/transfer/:requestId/accept");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [payoutSpeed, setPayoutSpeed] = useState<'standard' | 'instant'>('standard');
  const [confirmDeclineOpen, setConfirmDeclineOpen] = useState(false);

  const requestId = params?.requestId;

  const { data: transferData, isLoading: loadingTransfer, error: transferError } = useQuery({
    queryKey: ["transferRequest", requestId],
    queryFn: async () => {
      const res = await fetch(`/api/transfer-requests/${requestId}`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to load transfer request");
      }
      return res.json();
    },
    enabled: !!requestId && !!user,
  });

  const { data: bankAccountsData, isLoading: loadingBankAccounts } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch("/api/bank-accounts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load bank accounts");
      return res.json();
    },
    enabled: !!user,
  });

  const transferRequest: TransferRequest | null = transferData?.request || null;
  const allBankAccounts: BankAccount[] = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData?.accounts || []);
  // Only show accounts that can receive payouts (have Plaid credentials)
  // HIDDEN: Also filter out debit cards temporarily - was: allBankAccounts.filter(a => a.canReceivePayouts)
  const bankAccounts = allBankAccounts.filter(a => a.canReceivePayouts).filter((a: any) => a.accountType !== 'debit');
  const hasNonPayableAccounts = allBankAccounts.length > 0 && bankAccounts.length === 0;

  // Get selected account and detect if it's a debit card
  const selectedAccount = bankAccounts.find(a => a.id === selectedBankAccountId);
  const isDebitCard = selectedAccount?.payoutMethod === 'debit_card';

  // Calculate fees - debit cards always use instant
  const INSTANT_FEE_RATE = 0.015; // 1.5%
  const rawAmount = transferRequest ? parseFloat(transferRequest.amount) : 0;
  const effectivePayoutSpeed = isDebitCard ? 'instant' : payoutSpeed;
  const instantFee = effectivePayoutSpeed === 'instant' ? rawAmount * INSTANT_FEE_RATE : 0;
  const netAmount = rawAmount - instantFee;

  // Auto-select default bank account and set appropriate payout speed
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankAccountId) {
      const defaultAccount = bankAccounts.find(a => a.isDefault) || bankAccounts[0];
      setSelectedBankAccountId(defaultAccount.id);
      // Debit cards are always instant, bank accounts default to standard
      if (defaultAccount.payoutMethod === 'debit_card') {
        setPayoutSpeed('instant');
      }
    }
  }, [bankAccounts, selectedBankAccountId]);

  // Handle bank account selection - auto-set payout speed based on account type
  const handleBankAccountSelect = (accountId: string) => {
    const account = bankAccounts.find(a => a.id === accountId);
    setSelectedBankAccountId(accountId);
    if (account?.payoutMethod === 'debit_card') {
      // Debit cards always use instant (push-to-card)
      setPayoutSpeed('instant');
    } else {
      // Bank accounts default to standard but can choose instant
      setPayoutSpeed('standard');
    }
  };

  const acceptMutation = useMutation({
    mutationFn: async (data: { bankAccountId: string; payoutSpeed: 'standard' | 'instant' }) => {
      const res = await fetch(`/api/transfer-requests/${requestId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        const error: any = new Error(errorData.error || "Failed to accept transfer");
        error.code = errorData.code; // Preserve structured error code
        throw error;
      }
      return res.json();
    },
    onSuccess: (data) => {
      const speedMsg = payoutSpeed === 'instant' 
        ? "arriving instantly" 
        : "arriving in 1-3 business days";
      toast({
        title: "Transfer Accepted",
        description: `$${netAmount.toFixed(2)} is ${speedMsg}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["transferRequest", requestId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setLocation("/transactions");
    },
    onError: (error: any) => {
      // Check if this is an RTP not supported error using structured code
      if (error.code === 'RTP_NOT_SUPPORTED') {
        // Switch to standard payout and show helpful message
        setPayoutSpeed('standard');
        toast({
          title: "Instant Payout Unavailable",
          description: "Your bank doesn't support instant payouts. We've switched to standard payout (1-3 business days, no fee).",
        });
      } else {
        toast({
          title: "Failed to Accept",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transfer-requests/${requestId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to decline transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer Declined",
        description: "The transfer request has been declined. The pool creator has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["transferRequest", requestId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Decline",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!selectedBankAccountId) {
      toast({
        title: "No Bank Account",
        description: "Please link a bank account or debit card first to receive the transfer.",
        variant: "destructive",
      });
      return;
    }
    
    acceptMutation.mutate({ bankAccountId: selectedBankAccountId, payoutSpeed });
  };

  const handleDecline = () => {
    setConfirmDeclineOpen(false);
    declineMutation.mutate();
  };

  if (authLoading || loadingTransfer) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to accept this transfer request.
              </p>
              <Button asChild>
                <Link href="/login">Log In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (transferError || !transferRequest) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Transfer Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This transfer request doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild variant="outline">
                <Link href="/">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (transferRequest.status !== "pending") {
    const statusConfig = {
      accepted: { icon: CheckCircle, color: "text-green-500", title: "Already Accepted", message: "This transfer has already been accepted and is being processed." },
      completed: { icon: CheckCircle, color: "text-green-500", title: "Transfer Completed", message: "This transfer has been completed and the funds have been deposited." },
      cancelled: { icon: XCircle, color: "text-yellow-500", title: "Transfer Cancelled", message: "This transfer request was cancelled by the sender." },
      failed: { icon: XCircle, color: "text-destructive", title: "Transfer Failed", message: "This transfer failed to process. Please contact support." },
    };
    const config = statusConfig[transferRequest.status];
    const StatusIcon = config.icon;

    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <StatusIcon className={`w-12 h-12 mx-auto ${config.color} mb-4`} />
              <h2 className="text-xl font-semibold mb-2">{config.title}</h2>
              <p className="text-muted-foreground mb-4">{config.message}</p>
              <Button asChild variant="outline">
                <Link href="/transactions">View Transactions</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Card className="border-white/10">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Banknote className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Transfer Request</CardTitle>
              <CardDescription>
                {transferRequest.fromUserName} wants to send you money from a pool
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className="text-4xl font-bold text-primary">${parseFloat(transferRequest.amount).toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From Pool:</span>
                  <span className="font-medium">{transferRequest.poolName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sender:</span>
                  <span className="font-medium">{transferRequest.fromUserName}</span>
                </div>
                {transferRequest.notes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <span className="text-right max-w-[200px]">{transferRequest.notes}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested:</span>
                  <span>{new Date(transferRequest.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Bank Account Selection - Show first so payout speed adapts */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Select Payment Destination</span>
                </div>

                {loadingBankAccounts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="text-center py-4">
                    {hasNonPayableAccounts ? (
                      <>
                        <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Bank needs re-linking</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Your existing bank account needs to be re-linked via Plaid to receive payouts.
                        </p>
                        <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10" asChild>
                          <Link href="/security">Re-link Bank Account</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-3">
                          You need to link a bank account to receive this transfer
                        </p>
                        <Button size="sm" asChild>
                          <Link href="/security">Link Bank Account</Link>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bankAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => handleBankAccountSelect(account.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                          selectedBankAccountId === account.id
                            ? "border-primary bg-primary/5"
                            : "border-white/10 hover:border-white/20"
                        }`}
                        data-testid={`bank-account-${account.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {account.payoutMethod === 'debit_card' ? (
                            <CreditCard className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Building2 className="w-4 h-4 text-cyan-400" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{account.institutionName}</div>
                            <div className="text-xs text-muted-foreground">
                              ****{account.accountMask}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.payoutMethod === 'debit_card' && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">INSTANT</span>
                          )}
                          {account.isDefault && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Default</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Payout Speed Options - adapts based on account type */}
              {selectedBankAccountId && (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-lime-400" />
                    <span className="text-sm font-medium">Payout Speed</span>
                  </div>
                  
                  {/* HIDDEN: Debit card instant payout section temporarily disabled */}
                  {false && isDebitCard && (
                    <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-yellow-500" />
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              Instant to Card
                              <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">PUSH-TO-CARD</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Funds arrive in seconds</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm text-yellow-500">1.5% fee</div>
                          <div className="text-xs text-muted-foreground">
                            You receive ${netAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Debit card payouts are always instant via push-to-card.
                      </p>
                    </div>
                  )}
                  {/* Bank Account payout options (was inside else branch of isDebitCard ternary) */}
                  {/* Standard Option - Bank Account */}
                  <button
                    type="button"
                    onClick={() => setPayoutSpeed('standard')}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      payoutSpeed === 'standard'
                        ? "border-primary bg-primary/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    data-testid="payout-speed-standard"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="font-medium text-sm">Standard ACH</div>
                          <div className="text-xs text-muted-foreground">1-3 business days</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm text-green-500">Free</div>
                        <div className="text-xs text-muted-foreground">
                          You receive ${rawAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Instant Option - Bank Account via RTP */}
                  <button
                    type="button"
                    onClick={() => setPayoutSpeed('instant')}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      payoutSpeed === 'instant'
                        ? "border-primary bg-primary/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    data-testid="payout-speed-instant"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            Instant RTP
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">FAST</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Arrives in seconds</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm text-yellow-500">1.5% fee</div>
                        <div className="text-xs text-muted-foreground">
                          You receive ${(rawAmount - rawAmount * INSTANT_FEE_RATE).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {payoutSpeed === 'instant' && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span>${rawAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-yellow-500">
                          <span>Instant fee (1.5%):</span>
                          <span>-${(rawAmount * INSTANT_FEE_RATE).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-foreground">
                          <span>You receive:</span>
                          <span>${netAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Note: Instant RTP may not be available for all banks. If unavailable, we'll use standard ACH.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => setConfirmDeclineOpen(true)}
                  disabled={declineMutation.isPending || acceptMutation.isPending}
                  data-testid="button-decline-transfer"
                >
                  {declineMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline
                    </>
                  )}
                </Button>
                <Button
                  className="bg-gradient-to-r from-primary to-primary/80"
                  onClick={handleAccept}
                  disabled={!selectedBankAccountId || acceptMutation.isPending || declineMutation.isPending}
                  data-testid="button-accept-transfer"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmDeclineOpen} onOpenChange={setConfirmDeclineOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Decline Transfer?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this transfer of ${parseFloat(transferRequest.amount).toFixed(2)}? 
              The sender will be notified and the funds will remain in the pool.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeclineOpen(false)} className="border-white/10">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDecline} 
              disabled={declineMutation.isPending}
              data-testid="button-confirm-decline"
            >
              {declineMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                "Yes, Decline"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
