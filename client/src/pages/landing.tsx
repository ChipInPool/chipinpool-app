import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Link } from "wouter";
import { Sparkles, Zap, ShieldCheck, Users, CreditCard, Code, ArrowRight, CheckCircle, RefreshCw, Bell } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-layout";
import { PoolPreview } from "@/components/pool-preview";
import { FeeSummary } from "@/components/fee-summary";

export default function Landing() {
  useEffect(() => {
    // The anchor may not exist until React mounts after cross-page navigation.
    if (window.location.hash === "#features") {
      document.getElementById("features")?.scrollIntoView();
    }
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <style>{`
        html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .hero-orb-1, .hero-orb-2, .hero-orb-3, .animate-in { animation: none !important; } }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes slide-right {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .hero-orb-1 { animation: float 8s ease-in-out infinite; }
        .hero-orb-2 { animation: float 10s ease-in-out infinite 2s; }
        .hero-orb-3 { animation: pulse-glow 6s ease-in-out infinite 1s; }
        .step-line::after {
          content: '';
          position: absolute;
          top: 2rem;
          left: calc(50% + 2.5rem);
          width: calc(100% - 5rem);
          height: 2px;
          background: linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent, 160 60% 50%)) 100%);
          opacity: 0.4;
        }
      `}</style>

      <PublicHeader />
      <main id="main-content">

      <section className="relative overflow-hidden py-12 sm:py-16 md:py-20">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-background to-accent/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
          <div className="hero-orb-1 absolute top-10 left-[10%] w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="hero-orb-2 absolute bottom-10 right-[10%] w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="hero-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Shared plans, simpler payments</span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.1] mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Pool funds.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">Split costs.</span><br />
              Shop together.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Create a pool for your next trip, gift, or shared expense. Invite your group and keep contributions in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="font-semibold text-base sm:text-lg px-8 sm:px-12 h-13 sm:h-16 shadow-xl shadow-primary/30 hover:scale-105 transition-transform w-full sm:w-auto rounded-xl" asChild data-testid="button-start-pooling">
                <Link href="/register">Start Pooling Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="h-13 sm:h-16 px-8 sm:px-12 border-border bg-background/50 hover:bg-background/80 text-base sm:text-lg w-full sm:w-auto rounded-xl" asChild data-testid="button-how-it-works">
                <Link href="/how-it-works">See How It Works</Link>
              </Button>
            </div>
            <PoolPreview />
          </div>
        </div>
      </section>


      <section id="features" className="py-16 sm:py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-5">
              <Zap className="w-4 h-4" /> Features
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-4 sm:mb-6">Everything you need for<br className="hidden sm:block" /> group payments</h2>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto">From splitting dinner to funding a group vacation, ChipInPool makes it easy.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Shared Pools</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Set a goal, invite your group, and track contributions. Funds become available after payment processing.</p>
            </div>

            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Virtual Cards</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Request a virtual card for eligible pools. Card availability and use depend on verification and provider requirements.</p>
            </div>

            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Social Splitting</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Invite friends via link, email, or SMS. See who's contributed and who hasn't.</p>
            </div>

            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Account Security</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Manage identity verification, account verification, and a transaction PIN from your security settings.</p>
            </div>

            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Smart Notifications</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Get notified via email or SMS when friends contribute, pools hit goals, or cards are used.</p>
            </div>

            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Recurring Contributions</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Set up weekly, monthly, or quarterly auto-contributions for ongoing pools.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 sm:py-24 md:py-32 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-sm font-semibold mb-5">
              <Sparkles className="w-4 h-4" /> Simple Process
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-4 sm:mb-6">How ChipInPool Works</h2>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl">Three simple steps to start pooling funds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6 max-w-5xl mx-auto">
            <div className="text-center relative step-line" data-testid="step-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 sm:mb-8 relative z-10 shadow-lg shadow-primary/30">1</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Create a Pool</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xs mx-auto">Set your goal, add a description, and choose a deadline. It takes less than a minute.</p>
            </div>
            <div className="text-center relative step-line" data-testid="step-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-accent to-accent/70 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 sm:mb-8 relative z-10 shadow-lg shadow-accent/30">2</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Invite Friends</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xs mx-auto">Share your pool via link, email, or text. Friends can contribute with one click.</p>
            </div>
            <div className="text-center" data-testid="step-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 sm:mb-8 relative z-10 shadow-lg shadow-purple-500/30">3</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Spend Together</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xs mx-auto">Review your pool’s available spending and payout options. Verification and provider requirements apply.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="fees" className="py-12 sm:py-20"><div className="mx-auto max-w-3xl px-4"><h2 className="text-3xl font-display font-bold mb-4">Clear fees, before you start.</h2><p className="text-muted-foreground mb-6">Understand your payout options before collecting funds.</p><FeeSummary /><Link href="/pricing" className="mt-5 inline-block text-primary underline underline-offset-4">View fee details</Link></div></section>

      <section id="developers" className="py-16 sm:py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-purple-500/10 border border-border p-8 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-6 sm:mb-8">
                <Code className="w-4 h-4" />
                <span>ChipInPay API</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 sm:mb-6">Build with ChipInPay</h2>
              <p className="text-muted-foreground text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
                Integrate group payments into your app or platform. Explore the documentation and contact us about integration access.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center mb-8 sm:mb-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  RESTful JSON API
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Webhook Notifications
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Access by Request
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="font-semibold px-8 sm:px-10 h-12 sm:h-14 w-full sm:w-auto rounded-xl" asChild data-testid="button-request-api">
                  <Link href="/api-docs">
                    View Documentation <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="px-8 sm:px-10 h-12 sm:h-14 border-border bg-background/50 w-full sm:w-auto rounded-xl" asChild>
                  <a href="mailto:mail@chipinpool.com?subject=ChipInPay%20API%20Access%20Request">
                    Contact Sales
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="get-started" className="py-16 sm:py-24 md:py-32 bg-gradient-to-b from-transparent via-primary/5 to-primary/10 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="hero-orb-2 absolute top-0 right-[20%] w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="hero-orb-1 absolute bottom-0 left-[20%] w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-4 sm:mb-6">Ready to start pooling?</h2>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed">
            Bring your group together around a shared goal, with contributions everyone can follow.
          </p>
          <Button size="lg" className="font-semibold text-base sm:text-lg px-10 sm:px-14 h-13 sm:h-16 shadow-xl shadow-primary/30 w-full sm:w-auto rounded-xl hover:scale-105 transition-transform" asChild data-testid="button-cta-start">
            <Link href="/register">Get Started Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      </main>
      <PublicFooter />
    </div>
  );
}
