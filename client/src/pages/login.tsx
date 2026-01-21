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
import { Loader2, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [showKycPrompt, setShowKycPrompt] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    // Don't redirect if we're showing KYC prompt
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

  // Don't redirect if showing KYC prompt
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerForm.name, registerForm.email, registerForm.password);
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
                      placeholder="password123"
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
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Your name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      required
                      data-testid="input-register-name"
                    />
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
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
