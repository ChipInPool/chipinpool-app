import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Shield, CheckCircle2, ArrowRight, Phone, Mail, Calendar, User } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
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

  useEffect(() => {
    if (!authLoading && isAuthenticated && !showKycPrompt) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, showKycPrompt, setLocation]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast({ description: "Welcome back!" });
      setLocation("/");
    } catch (error: any) {
      toast({ description: error.message || "Login failed", variant: "destructive" });
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

    setIsLoading(true);
    try {
      await register({
        ...registerForm,
        phoneVerificationCode: verificationCode,
      });
      toast({ description: "Account created! Welcome to ChipIn." });
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
      const data = await api.security.startKYC();
      
      if (data.clientSecret) {
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (!stripeKey) {
          toast({ description: "Stripe is not configured. Please contact support.", variant: "destructive" });
          return;
        }
        
        const stripe = await import('@stripe/stripe-js').then(m => m.loadStripe(stripeKey));
        
        if (stripe && data.clientSecret) {
          const { error } = await stripe.verifyIdentity(data.clientSecret);
          if (error) {
            toast({ description: error.message || "Verification failed", variant: "destructive" });
          } else {
            toast({ description: "Identity verification submitted!" });
          }
        }
      }
      window.location.href = "/";
    } catch (error: any) {
      toast({ description: error.message || "Failed to start verification", variant: "destructive" });
    } finally {
      setKycLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    window.location.href = `/api/auth/${provider}`;
  };

  if (showKycPrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-background font-bold text-xl">
                C
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">ChipIn</span>
            </div>
          </div>
          
          <Card className="border-white/10 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Account Created!</CardTitle>
              <CardDescription>
                Just one more step to unlock all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Verify Your Identity</p>
                    <p className="text-xs text-muted-foreground">
                      Quick verification enables pool creation, virtual cards, and higher limits.
                    </p>
                  </div>
                </div>
              </div>
              
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-background font-bold text-xl">
              C
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">ChipIn</span>
          </div>
          <p className="text-muted-foreground">Pool funds together. Pay smarter.</p>
        </div>

        <Card className="border-white/10 bg-card/50 backdrop-blur">
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
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
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-white/10"
                      onClick={() => handleSocialLogin('google')}
                      data-testid="button-google-login"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-white/10"
                      onClick={() => handleSocialLogin('apple')}
                      data-testid="button-apple-login"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Apple
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                {step === 'form' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
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
                      <Label htmlFor="register-username">Username</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="johndoe"
                          className="pl-8"
                          value={registerForm.username}
                          onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                          required
                          data-testid="input-register-username"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Phone Number</Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        required
                        data-testid="input-register-phone"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-dob">Date of Birth</Label>
                      <Input
                        id="register-dob"
                        type="date"
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        required
                        data-testid="input-register-dob"
                      />
                      <p className="text-[10px] text-muted-foreground">You must be at least 18 years old</p>
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
                        minLength={6}
                        data-testid="input-register-password"
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      className="w-full" 
                      disabled={codeSending}
                      onClick={handleSendCode}
                      data-testid="button-send-code"
                    >
                      {codeSending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...</>
                      ) : (
                        <><Phone className="w-4 h-4 mr-2" /> Verify Phone & Continue</>
                      )}
                    </Button>
                    
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-white/10"
                        onClick={() => handleSocialLogin('google')}
                        data-testid="button-google-signup"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-white/10"
                        onClick={() => handleSocialLogin('apple')}
                        data-testid="button-apple-signup"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        Apple
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold">Verify Your Phone</h3>
                      <p className="text-sm text-muted-foreground">
                        We sent a 6-digit code to {registerForm.phone}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest font-mono"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        required
                        data-testid="input-verification-code"
                      />
                    </div>
                    
                    {!isPhoneVerified ? (
                      <Button 
                        type="button" 
                        className="w-full" 
                        disabled={codeVerifying || verificationCode.length !== 6}
                        onClick={handleVerifyCode}
                        data-testid="button-verify-code"
                      >
                        {codeVerifying ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                        ) : (
                          <>Verify Code</>
                        )}
                      </Button>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm text-green-500 justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                          Phone verified successfully!
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                          {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
                          ) : (
                            <>Create Account</>
                          )}
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full text-muted-foreground"
                      onClick={() => {
                        setStep('form');
                        setVerificationCode('');
                        setIsCodeSent(false);
                        setIsPhoneVerified(false);
                      }}
                    >
                      Go Back
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="link" 
                      className="w-full text-sm"
                      onClick={handleSendCode}
                      disabled={codeSending}
                    >
                      {codeSending ? "Sending..." : "Resend Code"}
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
