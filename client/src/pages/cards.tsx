import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Shield, Globe, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

export default function CardsPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md bg-card border-white/10">
            <CardContent className="pt-8 pb-8 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Sign in to view your cards</h2>
              <p className="text-muted-foreground mb-6">Access your virtual Visa cards by signing in.</p>
              <Link href="/login" className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors" data-testid="link-login-cards">
                Sign In
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-cards-title">My Cards</h1>
          <p className="text-muted-foreground mt-1">Virtual Visa cards for pool spending</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative mb-8">
            <div className="w-72 h-44 rounded-2xl bg-gradient-to-br from-[#001F3F] to-[#003366] border border-white/10 shadow-2xl p-6 relative overflow-hidden" data-testid="card-virtual-preview">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7FFFD4]/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#7FFFD4]/5 rounded-full translate-y-6 -translate-x-6" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs font-bold text-white/60 tracking-widest uppercase">ChipIn</span>
                  <span className="text-xs font-bold text-[#7FFFD4] tracking-widest uppercase">VISA</span>
                </div>
                <div className="font-mono text-lg text-white/80 tracking-[0.2em] mb-4">
                  •••• •••• •••• ••••
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">VIRTUAL CARD</span>
                  <span className="text-xs text-white/50">••/••</span>
                </div>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7FFFD4]/10 border border-[#7FFFD4]/20 mb-6" data-testid="badge-coming-soon">
            <div className="w-2 h-2 rounded-full bg-[#7FFFD4] animate-pulse" />
            <span className="text-sm font-bold text-[#7FFFD4] tracking-wider uppercase">Coming Soon</span>
          </div>

          <h2 className="text-2xl font-bold mb-3 text-center" data-testid="text-coming-soon-title">Virtual Visa Cards</h2>
          <p className="text-muted-foreground text-center max-w-md mb-10 leading-relaxed">
            Spend your pool funds anywhere Visa is accepted with virtual cards linked directly to your pools. Set spending limits, freeze cards instantly, and track every transaction.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
            <Card className="bg-card border-white/10">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#7FFFD4]/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-5 h-5 text-[#7FFFD4]" />
                </div>
                <p className="text-xs font-semibold">Instant Freeze</p>
                <p className="text-[11px] text-muted-foreground mt-1">Lock cards anytime</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-white/10">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#7FFFD4]/10 flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-5 h-5 text-[#7FFFD4]" />
                </div>
                <p className="text-xs font-semibold">Use Anywhere</p>
                <p className="text-[11px] text-muted-foreground mt-1">Visa accepted worldwide</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-white/10">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#7FFFD4]/10 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-[#7FFFD4]" />
                </div>
                <p className="text-xs font-semibold">Real-time Alerts</p>
                <p className="text-[11px] text-muted-foreground mt-1">Instant notifications</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
