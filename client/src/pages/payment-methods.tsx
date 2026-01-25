import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, CreditCard, Plus, Trash2, Star, Loader2, CheckCircle, XCircle, Zap, Shield, ArrowRight, Clock, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise, getStripeInstance } from "@/lib/stripe";
import { useLocation } from "wouter";

interface DebitCardFormProps {
  cardholderName: string;
  onCardholderNameChange: (name: string) => void;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

function DebitCardForm({ cardholderName, onCardholderNameChange, onSuccess, onError, onCancel }: DebitCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onError("Stripe not loaded. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError("Card element not found. Please refresh and try again.");
      return;
    }

    if (!cardholderName.trim()) {
      onError("Please enter the cardholder name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { token, error } = await stripe.createToken(cardElement, {
        name: cardholderName,
        currency: 'usd',
      });

      if (error) {
        onError(error.message || "Failed to process card.");
        setIsSubmitting(false);
        return;
      }

      if (!token) {
        onError("Failed to create card token.");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/debit-cards/link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.id,
          cardholderName: cardholderName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        onError(err.error || 'Failed to link debit card');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      onError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          value={cardholderName}
          onChange={(e) => onCardholderNameChange(e.target.value)}
          placeholder="Name on card"
          data-testid="input-cardholder-name"
        />
      </div>
      <div className="space-y-2">
        <Label>Card Details</Label>
        <div className="p-3 border rounded-lg bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#f87171' },
              },
            }}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Your card details are securely handled by Stripe and never stored on our servers.</p>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} data-testid="button-cancel-card">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!cardComplete || !cardholderName.trim() || isSubmitting}
          className="bg-gradient-to-r from-lime-500 to-green-500"
          data-testid="button-link-card-submit"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Link Card
        </Button>
      </div>
    </div>
  );
}

export default function PaymentMethods() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [bankLinkLoading, setBankLinkLoading] = useState(false);
  const [showDebitCardDialog, setShowDebitCardDialog] = useState(false);
  const [debitCardholderName, setDebitCardholderName] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    setStripePromise(getStripePromise());
  }, []);

  useEffect(() => {
    if (user?.firstName && user?.lastName) {
      setDebitCardholderName(`${user.firstName} ${user.lastName}`);
    }
  }, [user]);

  const { data: bankAccountsData, refetch: refetchBankAccounts } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch('/api/bank-accounts', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch bank accounts');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const bankAccounts = bankAccountsData?.accounts || [];
  const bankAccountsList = bankAccounts.filter((a: any) => a.accountType === 'checking' || a.accountType === 'savings');
  const debitCardsList = bankAccounts.filter((a: any) => a.accountType === 'debit');

  const { data: connectStatus, refetch: refetchConnectStatus } = useQuery({
    queryKey: ["stripeConnectStatus"],
    queryFn: async () => {
      const res = await fetch('/api/stripe/connect/status', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch Connect status');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const completeBankLinkMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch('/api/bank-accounts/complete-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete linking');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Bank account linked successfully!" });
      refetchBankAccounts();
    },
    onError: (err: Error) => {
      toast({ description: err.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/bank-accounts/${accountId}/set-default`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to set default');
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Default payment method updated" });
      refetchBankAccounts();
    },
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Payment method removed" });
      refetchBankAccounts();
    },
  });

  const handleLinkBank = async () => {
    setBankLinkLoading(true);
    try {
      const res = await fetch('/api/bank-accounts/link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to initiate bank linking');
      }
      const { clientSecret } = await res.json();
      
      const stripe = await getStripeInstance();
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }
      
      const result = await stripe.collectFinancialConnectionsAccounts({
        clientSecret,
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Bank linking failed');
      }
      
      if (result.financialConnectionsSession?.accounts && result.financialConnectionsSession.accounts.length > 0) {
        const account = result.financialConnectionsSession.accounts[0];
        completeBankLinkMutation.mutate(account.id);
      }
    } catch (err: any) {
      toast({ description: err.message || 'Failed to link bank account', variant: 'destructive' });
    } finally {
      setBankLinkLoading(false);
    }
  };

  const handleSetupPayouts = async () => {
    setConnectLoading(true);
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start onboarding');
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast({ description: err.message, variant: 'destructive' });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDebitCardSuccess = () => {
    setShowDebitCardDialog(false);
    toast({ description: "Debit card linked successfully!" });
    refetchBankAccounts();
  };

  const handleDebitCardError = (error: string) => {
    toast({ description: error, variant: "destructive" });
  };

  if (!isAuthenticated && !authLoading) {
    navigate('/login');
    return null;
  }

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your payment methods for deposits and withdrawals</p>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Payout Verification</CardTitle>
                <CardDescription>Required to receive withdrawals</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {connectStatus?.payoutsEnabled ? (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">Verified - Payouts Enabled</p>
                  <p className="text-xs text-muted-foreground">You can receive withdrawals to your linked payment methods</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {connectStatus?.hasConnectAccount ? (
                  <p className="text-sm text-yellow-400">Your verification is incomplete. Please finish to receive payouts.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Complete verification once to enable all withdrawal methods.</p>
                )}
                <Button 
                  onClick={handleSetupPayouts}
                  className="bg-gradient-to-r from-primary to-accent"
                  disabled={connectLoading}
                  data-testid="button-setup-payouts"
                >
                  {connectLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {connectStatus?.hasConnectAccount ? "Complete Verification" : "Verify for Payouts"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="bank" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank" className="flex items-center gap-2" data-testid="tab-bank-accounts">
              <Building className="w-4 h-4" />
              Bank Accounts
              {bankAccountsList.length > 0 && (
                <Badge variant="secondary" className="ml-1">{bankAccountsList.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="debit" className="flex items-center gap-2" data-testid="tab-debit-cards">
              <CreditCard className="w-4 h-4" />
              Debit Cards
              {debitCardsList.length > 0 && (
                <Badge variant="secondary" className="ml-1">{debitCardsList.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="space-y-4">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-cyan-400" />
                      ACH Bank Accounts
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Link your bank for deposits and standard withdrawals
                    </CardDescription>
                  </div>
                  {bankAccountsList.length > 0 && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" /> Linked
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <Clock className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Standard ACH Transfer</p>
                    <p className="text-xs text-muted-foreground">1-3 business days, no fees</p>
                  </div>
                </div>

                {bankAccountsList.length > 0 && (
                  <div className="space-y-2">
                    {bankAccountsList.map((account: any) => (
                      <div key={account.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{account.institutionName}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.accountType} ••••{account.accountMask}
                              {account.isDefault && <span className="ml-2 text-cyan-400">(Default)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!account.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDefaultMutation.mutate(account.id)}
                              disabled={setDefaultMutation.isPending}
                              data-testid={`button-set-default-bank-${account.id}`}
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBankAccountMutation.mutate(account.id)}
                            disabled={deleteBankAccountMutation.isPending}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            data-testid={`button-delete-bank-${account.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button 
                  onClick={handleLinkBank}
                  variant={bankAccountsList.length > 0 ? "outline" : "default"}
                  className={bankAccountsList.length > 0 ? "" : "bg-gradient-to-r from-cyan-500 to-blue-500 w-full"}
                  data-testid="button-link-bank"
                  disabled={bankLinkLoading || completeBankLinkMutation.isPending}
                >
                  {(bankLinkLoading || completeBankLinkMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {!bankLinkLoading && !completeBankLinkMutation.isPending && <Plus className="w-4 h-4 mr-2" />}
                  {bankLinkLoading ? "Connecting..." : completeBankLinkMutation.isPending ? "Linking..." : bankAccountsList.length > 0 ? "Add Another Account" : "Link Bank Account"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debit" className="space-y-4">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-lime-400" />
                      Debit Cards
                      <Badge className="bg-lime-500/20 text-lime-400 border-lime-500/30 ml-2">
                        <Zap className="w-3 h-3 mr-1" /> Instant
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Link a debit card for instant withdrawals
                    </CardDescription>
                  </div>
                  {debitCardsList.length > 0 && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" /> Linked
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-lime-500/10 rounded-lg border border-lime-500/20">
                  <Zap className="w-5 h-5 text-lime-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Instant Transfer</p>
                    <p className="text-xs text-muted-foreground">Within 30 minutes, 1.5% fee</p>
                  </div>
                </div>

                {debitCardsList.length > 0 && (
                  <div className="space-y-2">
                    {debitCardsList.map((account: any) => (
                      <div key={account.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{account.institutionName}</p>
                            <p className="text-xs text-muted-foreground">
                              ••••{account.accountMask}
                              {account.isDefault && <span className="ml-2 text-lime-400">(Default)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!account.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDefaultMutation.mutate(account.id)}
                              disabled={setDefaultMutation.isPending}
                              data-testid={`button-set-default-debit-${account.id}`}
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBankAccountMutation.mutate(account.id)}
                            disabled={deleteBankAccountMutation.isPending}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            data-testid={`button-delete-debit-${account.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button 
                  onClick={() => setShowDebitCardDialog(true)}
                  variant={debitCardsList.length > 0 ? "outline" : "default"}
                  className={debitCardsList.length > 0 ? "" : "bg-gradient-to-r from-lime-500 to-green-500 w-full"}
                  data-testid="button-link-debit-card"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {debitCardsList.length > 0 ? "Add Another Card" : "Link Debit Card"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2 p-4 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">1</div>
                <h3 className="font-medium">Link a Payment Method</h3>
                <p className="text-sm text-muted-foreground">Connect your bank account or debit card securely through Stripe</p>
              </div>
              <div className="space-y-2 p-4 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                <h3 className="font-medium">Complete Verification</h3>
                <p className="text-sm text-muted-foreground">Verify your identity once to enable withdrawals to all linked accounts</p>
              </div>
              <div className="space-y-2 p-4 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 font-bold">3</div>
                <h3 className="font-medium">Deposit & Withdraw</h3>
                <p className="text-sm text-muted-foreground">Add funds or withdraw from pool contributions anytime</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDebitCardDialog} onOpenChange={setShowDebitCardDialog}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-lime-400" />
              Link Debit Card for Instant Payouts
            </DialogTitle>
            <DialogDescription>
              Get your money in 30 minutes with a 1.5% fee. Your card details are securely processed by Stripe.
            </DialogDescription>
          </DialogHeader>
          {stripePromise && (
            <Elements stripe={stripePromise}>
              <DebitCardForm
                cardholderName={debitCardholderName}
                onCardholderNameChange={setDebitCardholderName}
                onSuccess={handleDebitCardSuccess}
                onError={handleDebitCardError}
                onCancel={() => setShowDebitCardDialog(false)}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
