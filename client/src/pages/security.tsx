import { useState } from "react";
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
import { Shield, Mail, Phone, Key, Smartphone, UserCheck, CheckCircle, XCircle, Loader2, Building } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { data: securityStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["securityStatus"],
    queryFn: api.security.getStatus,
    enabled: isAuthenticated,
  });

  const { data: plaidStatus } = useQuery({
    queryKey: ["plaidStatus"],
    queryFn: api.plaid.getStatus,
    enabled: isAuthenticated,
  });

  const linkBankMutation = useMutation({
    mutationFn: async () => {
      const { linkToken } = await api.plaid.getLinkToken();
      // Open Plaid Link in a new window for sandbox testing
      const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?isWebview=true&token=${linkToken}`;
      const popup = window.open(plaidUrl, 'plaid-link', 'width=400,height=600');
      
      // For demo purposes, simulate successful bank linking after a delay
      // In production, you would use Plaid Link SDK properly
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Refresh status after popup closes
            queryClient.invalidateQueries({ queryKey: ["plaidStatus"] });
            resolve({ success: true });
          }
        }, 1000);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          reject(new Error("Bank linking timed out"));
        }, 300000);
      });
    },
    onSuccess: () => {
      toast({ description: "Bank account linking initiated. Follow the instructions in the popup." });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to link bank account", variant: "destructive" });
    },
  });

  const handleLinkBank = () => {
    linkBankMutation.mutate();
  };

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
      toast({ description: "Two-factor authentication enabled!" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
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

  const startKYCMutation = useMutation({
    mutationFn: api.security.startKYC,
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, '_blank', 'width=600,height=700');
      }
      toast({ description: "KYC verification started. Please complete it in the new window." });
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
            <CardContent>
              {status.kycStatus !== 'verified' && (
                <Button 
                  onClick={() => startKYCMutation.mutate()}
                  disabled={startKYCMutation.isPending || status.kycStatus === 'pending'}
                  className="bg-gradient-to-r from-primary to-accent"
                  data-testid="button-start-kyc"
                >
                  {startKYCMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {status.kycStatus === 'pending' ? 'Verification in Progress' : 'Start Verification'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-cyan-400" />
                  <CardTitle>Bank Account</CardTitle>
                </div>
                {plaidStatus?.hasBankLinked ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Linked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    <XCircle className="w-3 h-3 mr-1" /> Not Linked
                  </Badge>
                )}
              </div>
              <CardDescription>Link a bank account to withdraw funds to your bank</CardDescription>
            </CardHeader>
            <CardContent>
              {!plaidStatus?.hasBankLinked && (
                <Button 
                  onClick={handleLinkBank}
                  disabled={linkBankMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500"
                  data-testid="button-link-bank"
                >
                  {linkBankMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Link Bank Account
                </Button>
              )}
              {plaidStatus?.hasBankLinked && (
                <p className="text-sm text-green-400">
                  Your bank account is linked. You can withdraw funds from your wallet.
                </p>
              )}
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
    </Layout>
  );
}
