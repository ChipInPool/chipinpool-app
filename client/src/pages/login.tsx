import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Shield, CheckCircle2, ArrowRight, Phone, Mail, Calendar, User, AlertCircle, Check, ArrowLeft, Key, KeyRound, Lock } from "lucide-react";

type LoginMethod = 'email' | 'username' | 'phone';
type ForgotMethod = 'email' | 'phone';

export default function Login() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotMethod, setForgotMethod] = useState<ForgotMethod>('email');
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [betaRestricted, setBetaRestricted] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", username: "", phone: "", password: "" });
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  
  const urlInviteCode = new URLSearchParams(searchString).get('invite')?.toUpperCase() || "";
  const [inviteCode, setInviteCode] = useState(urlInviteCode);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(urlInviteCode ? null : null);
  const [inviteCodeChecking, setInviteCodeChecking] = useState(false);
  // Signups are public unless the server reports invite-only mode.
  const [inviteOnly, setInviteOnly] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [showKycPrompt, setShowKycPrompt] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [activeTab, setActiveTab] = useState(location === "/register" ? "register" : "login");
  
  const [fieldErrors, setFieldErrors] = useState<{
    username?: { message: string; exists?: boolean };
    email?: { message: string; exists?: boolean };
    phone?: { message: string; exists?: boolean };
  }>({});
  const [fieldValid, setFieldValid] = useState<{
    username?: boolean;
    email?: boolean;
    phone?: boolean;
  }>({});
  const [checkingField, setCheckingField] = useState<string | null>(null);

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) return;
    setCheckingField('username');
    try {
      const res = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase() }),
      });
      const data = await res.json();
      if (!data.available) {
        setFieldErrors(prev => ({ ...prev, username: { message: data.message } }));
        setFieldValid(prev => ({ ...prev, username: false }));
      } else {
        setFieldErrors(prev => ({ ...prev, username: undefined }));
        setFieldValid(prev => ({ ...prev, username: true }));
      }
    } catch (e) {
      console.error('Error checking username:', e);
    } finally {
      setCheckingField(null);
    }
  }, []);

  const checkEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) return;
    setCheckingField('email');
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      const data = await res.json();
      if (!data.available) {
        setFieldErrors(prev => ({ ...prev, email: { message: data.message, exists: data.exists } }));
        setFieldValid(prev => ({ ...prev, email: false }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: undefined }));
        setFieldValid(prev => ({ ...prev, email: true }));
      }
    } catch (e) {
      console.error('Error checking email:', e);
    } finally {
      setCheckingField(null);
    }
  }, []);

  const checkPhone = useCallback(async (phone: string) => {
    if (!phone || phone.length < 10) return;
    setCheckingField('phone');
    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.available) {
        setFieldErrors(prev => ({ ...prev, phone: { message: data.message, exists: data.exists } }));
        setFieldValid(prev => ({ ...prev, phone: false }));
      } else {
        setFieldErrors(prev => ({ ...prev, phone: undefined }));
        setFieldValid(prev => ({ ...prev, phone: true }));
      }
    } catch (e) {
      console.error('Error checking phone:', e);
    } finally {
      setCheckingField(null);
    }
  }, []);

  const switchToLogin = (email?: string) => {
    if (email) {
      setLoginForm(prev => ({ ...prev, email }));
    }
    setActiveTab("login");
  };

  const checkInviteCode = useCallback(async (code: string) => {
    if (!code || code.length < 4) { setInviteCodeValid(null); return; }
    setInviteCodeChecking(true);
    try {
      const res = await fetch(`/api/beta/invite/${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await res.json();
      setInviteCodeValid(data.valid === true);
    } catch {
      setInviteCodeValid(null);
    } finally {
      setInviteCodeChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !showKycPrompt) {
      setLocation(new URLSearchParams(searchString).get("redirect") === "security" ? "/security" : "/");
    }
  }, [authLoading, isAuthenticated, showKycPrompt, setLocation, searchString]);

  useEffect(() => {
    setActiveTab(location === "/register" || urlInviteCode ? "register" : "login");
  }, [location, urlInviteCode]);

  // Ask the server whether registration currently requires an invite code.
  // Defaults to public if the request fails, matching the server default.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/signup-mode')
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setInviteOnly(data?.inviteOnly === true); })
      .catch(() => { /* leave signups open on failure */ });
    return () => { cancelled = true; };
  }, []);

  // Auto-switch to register tab and validate invite code if URL has ?invite=
  useEffect(() => {
    if (urlInviteCode) {
      setActiveTab("register");
      checkInviteCode(urlInviteCode);
    }
  }, [urlInviteCode, checkInviteCode]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && !showKycPrompt) {
    return null;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();
      if (res.status === 403 && data.betaRestricted) { setBetaRestricted(true); return; }
      if (!res.ok) throw new Error(data.message);
      
      toast({ description: "Welcome back!" });
      window.location.href = '/';
    } catch (error: any) {
      toast({ description: error.message || "Login failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: loginForm.username.replace(/^@/, ''),
          password: loginForm.password 
        }),
      });
      const data = await res.json();
      if (res.status === 403 && data.betaRestricted) { setBetaRestricted(true); return; }
      if (!res.ok) throw new Error(data.message);
      
      toast({ description: "Welcome back!" });
      window.location.href = '/';
    } catch (error: any) {
      toast({ description: error.message || "Login failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!loginForm.phone || loginForm.phone.length < 10) {
      toast({ description: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/phone-login/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginForm.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOtpSent(true);
      toast({ description: "Code sent to your phone" });
    } catch (error: any) {
      toast({ description: error.message || "Failed to send code", variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handlePhoneOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOtpCode.length !== 6) {
      toast({ description: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/phone-login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: loginForm.phone, code: phoneOtpCode }),
      });
      const data = await res.json();
      if (res.status === 403 && data.betaRestricted) { setBetaRestricted(true); return; }
      if (!res.ok) throw new Error(data.message);
      
      toast({ description: "Welcome back!" });
      window.location.href = '/';
    } catch (error: any) {
      toast({ description: error.message || "Login failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: forgotMethod,
          email: forgotMethod === 'email' ? forgotEmail : undefined,
          phone: forgotMethod === 'phone' ? forgotPhone : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setForgotSent(true);
      toast({ description: `Reset link sent via ${forgotMethod === 'email' ? 'email' : 'SMS'}` });
    } catch (error: any) {
      toast({ description: error.message || "Failed to send reset link", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const validateAge = (dob: string): boolean => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const handleSendCode = async () => {
    if (!registerForm.phone || registerForm.phone.length < 10) {
      toast({ description: "Please enter a valid phone number", variant: "destructive" });
      return;
    }

    if (!registerForm.firstName || !registerForm.lastName || !registerForm.username || 
        !registerForm.email || !registerForm.password || !registerForm.dateOfBirth) {
      toast({ description: "Please fill in all fields first", variant: "destructive" });
      return;
    }

    if (!validateAge(registerForm.dateOfBirth)) {
      toast({ description: "You must be at least 18 years old to sign up", variant: "destructive" });
      return;
    }

    if (fieldErrors.username || fieldErrors.email || fieldErrors.phone) {
      toast({ description: "Please fix the errors above before continuing", variant: "destructive" });
      return;
    }

    if (checkingField) {
      toast({ description: "Please wait while we verify your information", variant: "destructive" });
      return;
    }

    setCodeSending(true);
    try {
      await api.auth.sendPhoneCode(registerForm.phone);
      setIsCodeSent(true);
      setStep('verify');
      toast({ description: "Verification code sent to your phone" });
    } catch (error: any) {
      toast({ description: error.message || "Failed to send code", variant: "destructive" });
    } finally {
      setCodeSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({ description: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }

    setCodeVerifying(true);
    try {
      await api.auth.verifyPhoneCode(registerForm.phone, verificationCode);
      setIsPhoneVerified(true);
      toast({ description: "Phone number verified!" });
    } catch (error: any) {
      toast({ description: error.message || "Invalid code", variant: "destructive" });
    } finally {
      setCodeVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPhoneVerified) {
      toast({ description: "Please verify your phone number first", variant: "destructive" });
      return;
    }

    if (!acceptTerms) {
      toast({ description: "Please accept the Terms of Service and Privacy Policy", variant: "destructive" });
      return;
    }

    if (inviteOnly && !inviteCode.trim()) {
      toast({ description: "Please enter your invite code to register.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await register({
        ...registerForm,
        username: registerForm.username.toLowerCase(),
        email: registerForm.email.toLowerCase(),
        phoneVerificationCode: verificationCode,
        acceptTerms: true,
        inviteCode: inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
      });
      toast({ description: "Account created successfully!" });
      setShowKycPrompt(true);
    } catch (error: any) {
      toast({ description: error.message || "Registration failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartKyc = async () => {
    setKycLoading(true);
    try {
      const response = await fetch('/api/kyc/create-session', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No verification URL received');
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to start verification", variant: "destructive" });
    } finally {
      setKycLoading(false);
    }
  };

  if (showKycPrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-white/10 bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-display">Verify Your Identity</CardTitle>
              <CardDescription>
                Complete KYC verification to unlock all features including creating pools and withdrawing funds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6">
              <Button 
                className="w-full" 
                onClick={handleStartKyc}
                disabled={kycLoading}
                data-testid="button-start-kyc"
              >
                {kycLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting Verification...</>
                ) : (
                  <><Shield className="w-4 h-4 mr-2" /> Verify Now</>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground" 
                onClick={() => setLocation("/")}
                data-testid="button-skip-kyc"
              >
                Skip for now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <p className="text-[10px] text-center text-muted-foreground">
                You can complete verification later in Settings. Some features will be limited until verified.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (betaRestricted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-white/10 bg-card/50 backdrop-blur text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="text-xl font-display">Account access restricted</CardTitle>
              <CardDescription>
                This account doesn't currently have access to ChipInPool. If you think that's a mistake, get in touch and we'll sort it out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              <Button className="w-full" onClick={() => setLocation("/contact")} data-testid="button-contact-support">
                Contact Support
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setBetaRestricted(false)} data-testid="button-back-to-login">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="ChipInPool" className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-display font-bold text-2xl tracking-tight">ChipInPool</span>
            </div>
          </div>

          <Card className="border-white/10 bg-card/50 backdrop-blur">
            <CardHeader className="px-4 md:px-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2" 
                onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
              </Button>
              <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                <KeyRound className="w-5 h-5" /> Reset Password
              </CardTitle>
              <CardDescription>
                {forgotSent 
                  ? "Check your messages for the reset link" 
                  : "Choose how you'd like to receive your reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-muted-foreground">
                    If an account exists with that {forgotMethod === 'email' ? 'email' : 'phone number'}, 
                    you'll receive a reset link shortly.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={forgotMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setForgotMethod('email')}
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>
                    <Button
                      type="button"
                      variant={forgotMethod === 'phone' ? 'default' : 'outline'}
                      onClick={() => setForgotMethod('phone')}
                      className="w-full"
                    >
                      <Phone className="w-4 h-4 mr-2" /> SMS
                    </Button>
                  </div>

                  {forgotMethod === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        data-testid="input-forgot-email"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="forgot-phone">Phone Number</Label>
                      <Input
                        id="forgot-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        required
                        data-testid="input-forgot-phone"
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="ChipInPool" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-display font-bold text-2xl tracking-tight">ChipInPool</span>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">Pool funds together. Pay smarter.</p>
        </div>

        <Card className="border-white/10 bg-card/50 backdrop-blur">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="px-4 md:px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="px-4 md:px-6">
              <TabsContent value="login">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                    <Button
                      type="button"
                      variant={loginMethod === 'email' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setLoginMethod('email'); setOtpSent(false); }}
                      className="w-full"
                      data-testid="button-method-email"
                    >
                      <Mail className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Email</span>
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === 'username' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setLoginMethod('username'); setOtpSent(false); }}
                      className="w-full"
                      data-testid="button-method-username"
                    >
                      <User className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Username</span>
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === 'phone' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setLoginMethod('phone'); setOtpSent(false); }}
                      className="w-full"
                      data-testid="button-method-phone"
                    >
                      <Phone className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Phone</span>
                    </Button>
                  </div>

                  {loginMethod === 'email' && (
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@email.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                          required
                          data-testid="input-login-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          required
                          data-testid="input-login-password"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                      </Button>
                    </form>
                  )}

                  {loginMethod === 'username' && (
                    <form onSubmit={handleUsernameLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                          id="login-username"
                          type="text"
                          placeholder="@username"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                          required
                          data-testid="input-login-username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password-username">Password</Label>
                        <Input
                          id="login-password-username"
                          type="password"
                          placeholder="Your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          required
                          data-testid="input-login-password-username"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login-username">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                      </Button>
                    </form>
                  )}

                  {loginMethod === 'phone' && (
                    <form onSubmit={handlePhoneOtpLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-phone">Phone Number</Label>
                        <div className="flex gap-2">
                          <Input
                            id="login-phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={loginForm.phone}
                            onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                            required
                            disabled={otpSent}
                            className="flex-1"
                            data-testid="input-login-phone"
                          />
                          {!otpSent && (
                            <Button 
                              type="button" 
                              onClick={handleSendPhoneOtp} 
                              disabled={otpSending}
                              data-testid="button-send-otp"
                            >
                              {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Code"}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {otpSent && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="phone-otp">Verification Code</Label>
                            <Input
                              id="phone-otp"
                              type="text"
                              placeholder="Enter 6-digit code"
                              value={phoneOtpCode}
                              onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              maxLength={6}
                              required
                              data-testid="input-phone-otp"
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-verify-otp">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="w-full text-sm" 
                            onClick={() => { setOtpSent(false); setPhoneOtpCode(""); }}
                          >
                            Use a different number
                          </Button>
                        </>
                      )}
                    </form>
                  )}

                  <Button 
                    variant="link" 
                    className="w-full text-muted-foreground" 
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="button-forgot-password"
                  >
                    Forgot password?
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="register">
                {step === 'form' ? (
                  <div className="space-y-4">
                    {/* Invite Code */}
                    <div className="space-y-2">
                      <Label htmlFor="register-inviteCode" className="flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" /> Invite Code{" "}
                        {inviteOnly
                          ? <span className="text-red-500">*</span>
                          : <span className="text-muted-foreground font-normal">(optional)</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-inviteCode"
                          type="text"
                          placeholder="XXXXXXXX"
                          value={inviteCode}
                          onChange={(e) => {
                            const v = e.target.value.toUpperCase();
                            setInviteCode(v);
                            if (v.length >= 4) checkInviteCode(v);
                            else setInviteCodeValid(null);
                          }}
                          className={`font-mono tracking-widest uppercase pr-10 ${inviteCodeValid === true ? 'border-green-500' : inviteCodeValid === false ? 'border-red-500' : ''}`}
                          required={inviteOnly}
                          data-testid="input-invite-code"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {inviteCodeChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                          {!inviteCodeChecking && inviteCodeValid === true && <Check className="w-4 h-4 text-green-500" />}
                          {!inviteCodeChecking && inviteCodeValid === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                      {inviteCodeValid === false && (
                        <p className={`text-xs ${inviteOnly ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {inviteOnly
                            ? 'Invalid or expired invite code.'
                            : "That code isn't valid, but you can still sign up without one."}
                        </p>
                      )}
                      {inviteCodeValid === true && (
                        <p className="text-xs text-green-600">Invite code accepted!</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {inviteOnly ? (
                          <>
                            ChipInPool is invite-only right now. Don't have a code?{" "}
                            <button type="button" className="underline text-primary" onClick={() => setLocation("/contact")}>
                              Get in touch
                            </button>
                          </>
                        ) : (
                          <>Have an invite code? Enter it here — otherwise just continue, anyone can sign up.</>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="register-firstName">First Name</Label>
                        <Input
                          id="register-firstName"
                          type="text"
                          placeholder="John"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                          required
                          data-testid="input-register-firstName"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-lastName">Last Name</Label>
                        <Input
                          id="register-lastName"
                          type="text"
                          placeholder="Doe"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                          required
                          data-testid="input-register-lastName"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="flex items-center gap-2">
                        <User className="w-4 h-4" /> Username
                        {checkingField === 'username' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {fieldValid.username && <Check className="w-4 h-4 text-green-500" />}
                      </Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="@johndoe"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                        onBlur={() => checkUsername(registerForm.username)}
                        required
                        className={fieldErrors.username ? 'border-red-500' : fieldValid.username ? 'border-green-500' : ''}
                        data-testid="input-register-username"
                      />
                      {fieldErrors.username && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {fieldErrors.username.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email
                        {checkingField === 'email' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {fieldValid.email && <Check className="w-4 h-4 text-green-500" />}
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@email.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        onBlur={() => checkEmail(registerForm.email)}
                        required
                        className={fieldErrors.email ? 'border-red-500' : fieldValid.email ? 'border-green-500' : ''}
                        data-testid="input-register-email"
                      />
                      {fieldErrors.email && (
                        <div className="text-xs text-red-500">
                          <p className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {fieldErrors.email.message}
                          </p>
                          {fieldErrors.email.exists && (
                            <button 
                              type="button"
                              className="text-primary underline mt-1"
                              onClick={() => switchToLogin(registerForm.email)}
                            >
                              Sign in instead
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                        data-testid="input-register-password"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Phone Number
                        {checkingField === 'phone' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {fieldValid.phone && <Check className="w-4 h-4 text-green-500" />}
                      </Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        onBlur={() => checkPhone(registerForm.phone)}
                        required
                        className={fieldErrors.phone ? 'border-red-500' : fieldValid.phone ? 'border-green-500' : ''}
                        data-testid="input-register-phone"
                      />
                      {fieldErrors.phone && (
                        <div className="text-xs text-red-500">
                          <p className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {fieldErrors.phone.message}
                          </p>
                          {fieldErrors.phone.exists && (
                            <button 
                              type="button"
                              className="text-primary underline mt-1"
                              onClick={() => setActiveTab("login")}
                            >
                              Sign in instead
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-dob" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Date of Birth
                      </Label>
                      <Input
                        id="register-dob"
                        type="date"
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                        required
                        data-testid="input-register-dob"
                      />
                      <p className="text-xs text-muted-foreground">You must be 18+ to use ChipInPool</p>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleSendCode}
                      disabled={codeSending}
                      data-testid="button-send-verification"
                    >
                      {codeSending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Code...</>
                      ) : (
                        <><Phone className="w-4 h-4 mr-2" /> Verify Phone & Continue</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to {registerForm.phone}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="text-center text-xl md:text-2xl tracking-widest"
                        data-testid="input-verification-code"
                      />
                    </div>
                    
                    {!isPhoneVerified ? (
                      <Button 
                        type="button"
                        className="w-full"
                        onClick={handleVerifyCode}
                        disabled={codeVerifying || verificationCode.length !== 6}
                        data-testid="button-verify-code"
                      >
                        {codeVerifying ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                        ) : (
                          <>Verify Code</>
                        )}
                      </Button>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-green-500">Phone verified!</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="accept-terms"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1"
                            data-testid="checkbox-terms"
                          />
                          <label htmlFor="accept-terms" className="text-xs text-muted-foreground">
                            I agree to the{" "}
                            <a href="/terms" className="text-primary underline">Terms of Service</a>
                            {" "}and{" "}
                            <a href="/privacy" className="text-primary underline">Privacy Policy</a>
                          </label>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoading || !acceptTerms}
                          data-testid="button-create-account"
                        >
                          {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
                          ) : (
                            <>Create Account</>
                          )}
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full text-sm" 
                      onClick={() => { setStep('form'); setIsCodeSent(false); setIsPhoneVerified(false); setVerificationCode(""); }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back to form
                    </Button>
                  </form>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
