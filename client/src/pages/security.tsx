import { useState, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Mail, Phone, Key, Smartphone, UserCheck, CheckCircle, XCircle, Loader2, Building, Plus, CreditCard, Zap, Trash2, Star, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise, getStripeInstance } from "@/lib/stripe";

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
          placeholder="Name on card"
          value={cardholderName}
          onChange={(e) => onCardholderNameChange(e.target.value)}
          data-testid="input-cardholder-name"
        />
      </div>
      <div className="space-y-2">
        <Label>Card Details</Label>
        <div className="p-3 border border-white/10 rounded-md bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#fff',
                  '::placeholder': {
                    color: '#6b7280',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
            onChange={(event) => setCardComplete(event.complete)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your card details are securely handled by Stripe and never stored on our servers.
        </p>
      </div>
      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!cardholderName || !cardComplete || isSubmitting}
          className="bg-gradient-to-r from-lime-500 to-green-500"
          data-testid="button-confirm-link-debit-card"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Link Card
        </Button>
      </div>
    </div>
  );
}

export default function Security() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [emailCode, setEmailCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [pin, setPin] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showRecoveryCodesDialog, setShowRecoveryCodesDialog] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    const promise = getStripePromise();
    promise.catch((error) => {
      console.error('Failed to load Stripe:', error);
      setStripeError(error.message || 'Failed to load payment system');
    });
    setStripePromise(promise);
  }, []);

  const { data: securityStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["securityStatus"],
    queryFn: api.security.getStatus,
    enabled: isAuthenticated,
  });

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

  const setDefaultMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/bank-accounts/${accountId}/default`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to set default');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast({ description: "Default payout method updated" });
    },
    onError: () => {
      toast({ description: "Failed to update default", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast({ description: "Payout method removed" });
    },
    onError: () => {
      toast({ description: "Failed to remove payout method", variant: "destructive" });
    },
  });

  const [bankLinkLoading, setBankLinkLoading] = useState(false);

  const completeBankLinkMutation = useMutation({
    mutationFn: async ({ accountId, setupIntentId }: { accountId: string; setupIntentId?: string }) => {
      const res = await fetch('/api/stripe/financial-connections/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, setupIntentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to link bank account');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast({ description: "Bank account linked successfully!" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to link bank account", variant: "destructive" });
    },
  });

  const handleLinkBank = async () => {
    setBankLinkLoading(true);
    try {
      const res = await fetch('/api/stripe/financial-connections/create-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to initiate bank linking');
      }
      const { clientSecret, setupIntentId } = await res.json();
      
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
        completeBankLinkMutation.mutate({ accountId: account.id, setupIntentId });
      } else {
        toast({ description: "No accounts were selected", variant: "destructive" });
      }
    } catch (error: any) {
      if (error.message !== 'Bank linking failed') {
        toast({ description: error.message || "Failed to start bank linking", variant: "destructive" });
      }
    } finally {
      setBankLinkLoading(false);
    }
  };

  const [showDebitCardDialog, setShowDebitCardDialog] = useState(false);
  const [debitCardholderName, setDebitCardholderName] = useState('');

  const handleLinkDebitCard = () => {
    if (user) {
      setDebitCardholderName(`${user.firstName} ${user.lastName}`);
    }
    setShowDebitCardDialog(true);
  };

  const handleDebitCardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
    toast({ description: "Debit card linked for instant payouts!" });
    setShowDebitCardDialog(false);
    setDebitCardholderName('');
  };

  const handleDebitCardError = (error: string) => {
    toast({ description: error, variant: "destructive" });
  };

  const bankAccountsList = bankAccounts.filter((a: any) => a.payoutMethod === 'bank_account' || !a.payoutMethod);
  const debitCardsList = bankAccounts.filter((a: any) => a.payoutMethod === 'debit_card');

  const sendEmailMutation = useMutation({
    mutationFn: api.security.sendEmailVerification,
    onSuccess: () => {
      setEmailSent(true);
      toast({ description: "Verification code sent to your email" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: api.security.verifyEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityStatus"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setEmailCode("");
      setEmailSent(false);
      toast({ description: "Email verified successfully!" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const sendPhoneMutation = useMutation({
    mutationFn: api.security.sendPhoneVerification,
    onSuccess: () => {
      setPhoneSent(true);
      toast({ description: "Verification code sent to your phone" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: api.security.verifyPhone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityStatus"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setPhoneCode("");
      setPhoneSent(false);
      toast({ description: "Phone verified successfully!" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const setPinMutation = useMutation({
    mutationFn: api.security.setPin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityStatus"] });
      setPin("");
      toast({ description: "Transaction PIN set successfully!" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const setup2FAMutation = useMutation({
    mutationFn: api.security.setup2FA,
    onSuccess: (data: any) => {
      setQrCode(data.qrCode);
      setTwoFactorSecret(data.secret);
      setRecoveryCodes(data.recoveryCodes || []);
      setShowQRDialog(true);
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: api.security.enable2FA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityStatus"] });
      setShowQRDialog(false);
      setTwoFactorCode("");
      if (recoveryCodes.length > 0) {
        setShowRecoveryCodesDialog(true);
      } else {
        toast({ description: "Two-factor authentication enabled!" });
      }
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });
  
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");
  
  const regenerateCodesMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch('/api/mfa/regenerate-codes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate codes');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setRecoveryCodes(data.recoveryCodes || []);
      setShowRegenerateDialog(false);
      setRegenerateCode("");
      setShowRecoveryCodesDialog(true);
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to regenerate recovery codes", variant: "destructive" });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: api.security.disable2FA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityStatus"] });
      setTwoFactorCode("");
      toast({ description: "Two-factor authentication disabled" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const [showKYCModal, setShowKYCModal] = useState(false);
  const [kycClientSecret, setKycClientSecret] = useState<string | null>(null);

  const startKYCMutation = useMutation({
    mutationFn: api.security.startKYC,
    onSuccess: async (data: any) => {
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      
      toast({ description: "Unable to start verification. Please try again.", variant: "destructive" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  if (authLoading || statusLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const status = securityStatus || {};

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Security Settings
          </h1>
          <p className="text-muted-foreground mt-2">Protect your account and enable security features</p>
        </div>

        <div className="space-y-6">
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <CardTitle>Email Verification</CardTitle>
                </div>
                {status.emailVerified ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Verified
                  </Badge>
                )}
              </div>
              <CardDescription>Verify your email address for account recovery</CardDescription>
            </CardHeader>
            {!status.emailVerified && (
              <CardContent className="space-y-4">
                {!emailSent ? (
                  <Button 
                    onClick={() => sendEmailMutation.mutate()} 
                    disabled={sendEmailMutation.isPending}
                    data-testid="button-send-email-verification"
                  >
                    {sendEmailMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Send Verification Code
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-digit code"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      maxLength={6}
                      data-testid="input-email-code"
                    />
                    <Button 
                      onClick={() => verifyEmailMutation.mutate(emailCode)}
                      disabled={emailCode.length !== 6 || verifyEmailMutation.isPending}
                      data-testid="button-verify-email"
                    >
                      {verifyEmailMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Verify
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-green-400" />
                  <CardTitle>Phone Verification</CardTitle>
                </div>
                {status.phoneVerified ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Verified
                  </Badge>
                )}
              </div>
              <CardDescription>Add your phone number for SMS notifications and 2FA</CardDescription>
            </CardHeader>
            {!status.phoneVerified && (
              <CardContent className="space-y-4">
                {!phoneSent ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Phone number (e.g., +1234567890)"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      data-testid="input-phone-number"
                    />
                    <Button 
                      onClick={() => sendPhoneMutation.mutate(phoneNumber)}
                      disabled={phoneNumber.length < 10 || sendPhoneMutation.isPending}
                      data-testid="button-send-phone-verification"
                    >
                      {sendPhoneMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send Code
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-digit code"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      maxLength={6}
                      data-testid="input-phone-code"
                    />
                    <Button 
                      onClick={() => verifyPhoneMutation.mutate(phoneCode)}
                      disabled={phoneCode.length !== 6 || verifyPhoneMutation.isPending}
                      data-testid="button-verify-phone"
                    >
                      {verifyPhoneMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Verify
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-yellow-400" />
                  <CardTitle>Transaction PIN</CardTitle>
                </div>
                {status.hasTransactionPin ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Set
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Set
                  </Badge>
                )}
              </div>
              <CardDescription>Set a 4-digit PIN to authorize spending from your pools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={status.hasTransactionPin ? "Enter new 4-digit PIN" : "Set 4-digit PIN"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  data-testid="input-pin"
                />
                <Button 
                  onClick={() => setPinMutation.mutate(pin)}
                  disabled={pin.length !== 4 || setPinMutation.isPending}
                  data-testid="button-set-pin"
                >
                  {setPinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {status.hasTransactionPin ? "Update PIN" : "Set PIN"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  <CardTitle>Two-Factor Authentication</CardTitle>
                </div>
                {status.twoFactorEnabled ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Disabled
                  </Badge>
                )}
              </div>
              <CardDescription>Use an authenticator app for extra security when logging in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-digit code to disable"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      maxLength={6}
                      data-testid="input-2fa-disable-code"
                    />
                    <Button 
                      variant="destructive"
                      onClick={() => disable2FAMutation.mutate(twoFactorCode)}
                      disabled={twoFactorCode.length !== 6 || disable2FAMutation.isPending}
                      data-testid="button-disable-2fa"
                    >
                      {disable2FAMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Disable 2FA
                    </Button>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRegenerateDialog(true)}
                    data-testid="button-regenerate-recovery-codes"
                  >
                    Regenerate Recovery Codes
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setup2FAMutation.mutate()}
                  disabled={setup2FAMutation.isPending}
                  data-testid="button-setup-2fa"
                >
                  {setup2FAMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Set Up 2FA
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-accent" />
                  <CardTitle>Identity Verification (KYC)</CardTitle>
                </div>
                {status.kycStatus === 'verified' ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : status.kycStatus === 'pending' ? (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Verified
                  </Badge>
                )}
              </div>
              <CardDescription>Verify your identity to unlock higher limits and withdrawals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {status.kycStatus !== 'verified' && status.kycStatus !== 'pending' && (
                <Button 
                  onClick={() => startKYCMutation.mutate()}
                  disabled={startKYCMutation.isPending}
                  className="bg-gradient-to-r from-primary to-accent"
                  data-testid="button-start-kyc"
                >
                  {startKYCMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Start Verification
                </Button>
              )}
              {(status.kycStatus === 'pending' || status.kycStatus === 'failed') && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {status.kycStatus === 'pending' 
                      ? "Your verification is in progress. Click 'Refresh Status' to check if it's complete, or restart if needed."
                      : "Your verification failed. You can restart the process to try again."}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {status.kycStatus === 'pending' && (
                      <Button 
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/security/kyc/refresh', {
                              method: 'POST',
                              credentials: 'include',
                            });
                            if (!res.ok) throw new Error('Failed to refresh');
                            const data = await res.json();
                            queryClient.invalidateQueries({ queryKey: ['securityStatus'] });
                            queryClient.invalidateQueries({ queryKey: ['user'] });
                            toast({ description: data.message || 'Status refreshed' });
                          } catch {
                            toast({ description: 'Failed to refresh status', variant: 'destructive' });
                          }
                        }}
                        data-testid="button-refresh-kyc"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Status
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/security/kyc/restart', {
                            method: 'POST',
                            credentials: 'include',
                          });
                          if (!res.ok) throw new Error('Failed to restart');
                          queryClient.invalidateQueries({ queryKey: ['securityStatus'] });
                          toast({ description: 'Verification reset. You can start again.' });
                        } catch {
                          toast({ description: 'Failed to restart verification', variant: 'destructive' });
                        }
                      }}
                      data-testid="button-restart-kyc"
                    >
                      Restart Verification
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-cyan-400" />
                  <CardTitle>Bank Accounts</CardTitle>
                </div>
                {bankAccountsList.length > 0 ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> {bankAccountsList.length} Linked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Linked
                  </Badge>
                )}
              </div>
              <CardDescription>Securely link your bank for verified withdrawals (1-3 business days, free)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          <p className="text-xs text-muted-foreground">Standard ACH (1-3 business days)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!account.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(account.id)}
                            disabled={setDefaultMutation.isPending}
                            data-testid={`button-set-default-${account.id}`}
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
                className={bankAccountsList.length > 0 ? "" : "bg-gradient-to-r from-cyan-500 to-blue-500"}
                data-testid="button-link-bank"
                disabled={bankLinkLoading || completeBankLinkMutation.isPending}
              >
                {(bankLinkLoading || completeBankLinkMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!bankLinkLoading && !completeBankLinkMutation.isPending && <Plus className="w-4 h-4 mr-2" />}
                {bankLinkLoading ? "Connecting..." : completeBankLinkMutation.isPending ? "Linking..." : bankAccountsList.length > 0 ? "Add Another Account" : "Link Bank Account"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-lime-400" />
                  <CardTitle>Debit Cards</CardTitle>
                  <Badge className="bg-lime-500/20 text-lime-400 border-lime-500/30">
                    <Zap className="w-3 h-3 mr-1" /> Instant
                  </Badge>
                </div>
                {debitCardsList.length > 0 ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> {debitCardsList.length} Linked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Linked
                  </Badge>
                )}
              </div>
              <CardDescription>Link a debit card for instant withdrawals (30 minutes, 1.5% fee)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            {account.isDefault && <span className="ml-2 text-cyan-400">(Default)</span>}
                          </p>
                          <p className="text-xs text-lime-400">Instant (seconds, 1.5% fee)</p>
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
                onClick={handleLinkDebitCard}
                variant={debitCardsList.length > 0 ? "outline" : "default"}
                className={debitCardsList.length > 0 ? "" : "bg-gradient-to-r from-lime-500 to-green-500"}
                data-testid="button-link-debit-card"
              >
                <Plus className="w-4 h-4 mr-2" />
                {debitCardsList.length > 0 ? "Add Another Card" : "Link Debit Card"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCode && (
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              Or enter this code manually: <code className="bg-muted px-2 py-1 rounded">{twoFactorSecret}</code>
            </p>
            <div className="w-full space-y-2">
              <Label>Enter the 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  data-testid="input-2fa-enable-code"
                />
                <Button 
                  onClick={() => enable2FAMutation.mutate(twoFactorCode)}
                  disabled={twoFactorCode.length !== 6 || enable2FAMutation.isPending}
                  data-testid="button-enable-2fa"
                >
                  {enable2FAMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enable
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecoveryCodesDialog} onOpenChange={setShowRecoveryCodesDialog}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Recovery Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a secure place. Each code can only be used once to access your account if you lose your authenticator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-2">
              {recoveryCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono text-center py-1" data-testid={`recovery-code-${i}`}>
                  {code}
                </code>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              These codes will not be shown again. Copy them now!
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join('\n'));
                  toast({ description: "Recovery codes copied to clipboard" });
                }}
                data-testid="button-copy-recovery-codes"
              >
                Copy All
              </Button>
              <Button
                onClick={() => {
                  setShowRecoveryCodesDialog(false);
                  setRecoveryCodes([]);
                  toast({ description: "Two-factor authentication enabled!" });
                }}
                data-testid="button-close-recovery-codes"
              >
                I've Saved My Codes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Regenerate Recovery Codes</DialogTitle>
            <DialogDescription>
              Enter your current 6-digit authenticator code to generate new recovery codes. This will invalidate all existing codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="regenerate-code">Authentication Code</Label>
              <Input
                id="regenerate-code"
                placeholder="000000"
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                data-testid="input-regenerate-code"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowRegenerateDialog(false); setRegenerateCode(""); }}>
                Cancel
              </Button>
              <Button
                onClick={() => regenerateCodesMutation.mutate(regenerateCode)}
                disabled={regenerateCode.length !== 6 || regenerateCodesMutation.isPending}
                data-testid="button-confirm-regenerate"
              >
                {regenerateCodesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Regenerate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
