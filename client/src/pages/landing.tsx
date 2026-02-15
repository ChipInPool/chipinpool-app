import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Sparkles, Zap, ShieldCheck, Users, CreditCard, Code, ArrowRight, CheckCircle, RefreshCw, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function Landing() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <style>{`
        html { scroll-behavior: smooth; }
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

      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ChipInPool" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-display font-bold text-xl tracking-tight">ChipInPool</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-how-it-works">How It Works</a>
            <a href="#developers" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-developers">Developers</a>
            <a href="#get-started" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-get-started">Get Started</a>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="font-medium" asChild data-testid="button-signin">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="font-semibold" asChild data-testid="button-get-started">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 sm:py-28 md:py-40">
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
              <span>The Future of Group Payments</span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-extrabold tracking-tight leading-[1.1] mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Pool funds.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">Split costs.</span><br />
              Shop together.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Create pools for trips, gifts, or shared expenses. Invite friends, track contributions in real-time, and spend instantly with virtual cards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="font-semibold text-base sm:text-lg px-8 sm:px-12 h-13 sm:h-16 shadow-xl shadow-primary/30 hover:scale-105 transition-transform w-full sm:w-auto rounded-xl" asChild data-testid="button-start-pooling">
                <Link href="/login">Start Pooling Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="h-13 sm:h-16 px-8 sm:px-12 border-border bg-background/50 hover:bg-background/80 text-base sm:text-lg w-full sm:w-auto rounded-xl" asChild data-testid="button-how-it-works">
                <Link href="/how-it-works">See How It Works</Link>
              </Button>
            </div>

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
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Instant Pooling</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Create a pool in seconds. Funds are available immediately once contributions are made.</p>
            </div>

            <div className="group relative p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 hover:-translate-y-1" data-testid="card-feature-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Virtual Cards</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">Auto-generate virtual Visa cards tied to your pools. Spend anywhere, online or in-store.</p>
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
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 sm:mb-3">Bank-Level Security</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">256-bit encryption, KYC verification, and real-time fraud monitoring.</p>
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
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xs mx-auto">Use your virtual card to make purchases anywhere Visa is accepted.</p>
            </div>
          </div>
        </div>
      </section>

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
                Integrate group payments into your app or platform. Our REST API gives you full control over pools, contributions, and virtual cards.
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
                  Production Ready
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
            Join thousands of users who are already splitting costs and pooling funds with ChipInPool.
          </p>
          <Button size="lg" className="font-semibold text-base sm:text-lg px-10 sm:px-14 h-13 sm:h-16 shadow-xl shadow-primary/30 w-full sm:w-auto rounded-xl hover:scale-105 transition-transform" asChild data-testid="button-cta-start">
            <Link href="/login">Get Started Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/30 py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-10 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="ChipInPool" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-display font-bold text-xl tracking-tight">ChipInPool</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Pool funds together. Pay smarter. The modern way to handle group expenses.</p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" data-testid="link-social-x">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" data-testid="link-social-facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" data-testid="link-social-instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <Link href="/how-it-works" className="block hover:text-primary transition-colors">How It Works</Link>
                <a href="#features" className="block hover:text-primary transition-colors">Features</a>
                <Link href="/api-docs" className="block hover:text-primary transition-colors">API Documentation</Link>
                <Link href="/security" className="block hover:text-primary transition-colors">Security</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <Link href="/about" className="block hover:text-primary transition-colors">About</Link>
                <Link href="/careers" className="block hover:text-primary transition-colors">Careers</Link>
                <Link href="/contact" className="block hover:text-primary transition-colors">Contact</Link>
                <Link href="/faq" className="block hover:text-primary transition-colors">FAQ</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <Link href="/privacy" className="block hover:text-primary transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="block hover:text-primary transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2026 ChipInPool Corp. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/60">Made with ❤️ for group payments everywhere</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
