import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ArrowLeft, Sparkles, Users, Shield, Zap } from "lucide-react";

export default function Waitlist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Signups are public unless the server reports invite-only mode.
  const [inviteOnly, setInviteOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/signup-mode')
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setInviteOnly(data?.inviteOnly === true); })
      .catch(() => { /* leave signups open on failure */ });
    return () => { cancelled = true; };
  }, []);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/beta/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast({ description: "You're already on the waitlist! We'll be in touch." });
        setSubmitted(true);
        return;
      }
      if (!res.ok) throw new Error(data.message);
      setSubmitted(true);
    } catch (error: any) {
      toast({ description: error.message || "Failed to join waitlist", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Card className="border-white/10 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">You're on the list!</CardTitle>
              <CardDescription className="text-base">
                Thanks for joining the ChipInPool Beta waitlist. We'll email you as soon as a spot opens up — it won't be long!
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/login")}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="ChipInPool" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-display font-bold text-2xl tracking-tight">ChipInPool</span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> {inviteOnly ? 'Private Beta' : 'Now Open'}
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">
            {inviteOnly ? 'Join the Waitlist' : 'Create your account'}
          </h1>
          <p className="text-muted-foreground">
            {inviteOnly ? (
              "ChipInPool is currently invite-only. Sign up and we'll send you an invite when a spot opens up."
            ) : (
              <>
                ChipInPool is open to everyone — no invite needed.{" "}
                <button type="button" className="underline text-primary" onClick={() => setLocation('/login')}>
                  Sign up now
                </button>
                , or leave your details below and we'll keep you posted.
              </>
            )}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Users, label: "Group Pools" },
            { icon: Shield, label: "Secure & KYC" },
            { icon: Zap, label: "Virtual Cards" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-white/10 text-center">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <Card className="border-white/10 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="waitlist-firstName">First Name</Label>
                  <Input
                    id="waitlist-firstName"
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                    data-testid="input-waitlist-firstName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-lastName">Last Name</Label>
                  <Input
                    id="waitlist-lastName"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                    data-testid="input-waitlist-lastName"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-email">Email</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  data-testid="input-waitlist-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="waitlist-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="input-waitlist-phone"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-join-waitlist">
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Request Early Access</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an invite code?{" "}
            <button
              className="text-primary underline font-medium"
              onClick={() => setLocation("/login?tab=register")}
              data-testid="link-have-invite"
            >
              Create your account
            </button>
          </p>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/login")}
            data-testid="link-back-login"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
