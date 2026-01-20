import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Sparkles, Zap, ShieldCheck, Users, CreditCard, Code, ArrowRight, CheckCircle } from "lucide-react";
import heroImage from "@assets/generated_images/futuristic_fintech_3d_visualization_of_digital_currency_pooling.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold text-lg">
              C
            </div>
            <span className="font-display font-bold text-xl tracking-tight">ChipInPay</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How It Works</a>
            <a href="#developers" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Developers</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="font-medium" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="font-semibold shadow-lg shadow-primary/20" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Futuristic Pooling" 
            className="w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-4 h-4" />
              <span>The Future of Group Payments</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Pool funds.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Split costs.</span><br />
              Shop together.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Create pools for trips, gifts, or shared expenses. Invite friends, track contributions in real-time, and spend instantly with virtual cards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="font-semibold text-lg px-10 h-14 shadow-xl shadow-primary/30 hover:scale-105 transition-transform" asChild>
                <Link href="/login">Start Pooling Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-10 border-white/10 bg-white/5 hover:bg-white/10 text-lg" asChild>
                <Link href="/how-it-works">See How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white/[0.01]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything you need for group payments</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">From splitting dinner to funding a group vacation, ChipInPay makes it easy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
              <div className="p-4 rounded-xl bg-primary/10 text-primary w-fit mb-6">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Instant Pooling</h3>
              <p className="text-muted-foreground">Create a pool in seconds. Funds are available immediately once contributions are made.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
              <div className="p-4 rounded-xl bg-accent/10 text-accent w-fit mb-6">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Virtual Cards</h3>
              <p className="text-muted-foreground">Auto-generate virtual Visa cards tied to your pools. Spend anywhere, online or in-store.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
              <div className="p-4 rounded-xl bg-purple-500/10 text-purple-400 w-fit mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Social Splitting</h3>
              <p className="text-muted-foreground">Invite friends via link, email, or SMS. See who's contributed and who hasn't.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
              <div className="p-4 rounded-xl bg-green-500/10 text-green-400 w-fit mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Bank-Level Security</h3>
              <p className="text-muted-foreground">256-bit encryption, secure card storage, and real-time fraud monitoring.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
              <div className="p-4 rounded-xl bg-orange-500/10 text-orange-400 w-fit mb-6">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Smart Notifications</h3>
              <p className="text-muted-foreground">Get notified when friends contribute, pools hit goals, or cards are used.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
              <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 w-fit mb-6">
                <Code className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Developer API</h3>
              <p className="text-muted-foreground">Build custom integrations with our powerful REST API. Perfect for businesses.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How ChipInPay Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to start pooling funds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="font-display font-bold text-xl mb-3">Create a Pool</h3>
              <p className="text-muted-foreground">Set your goal, add a description, and choose a deadline. It takes less than a minute.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="font-display font-bold text-xl mb-3">Invite Friends</h3>
              <p className="text-muted-foreground">Share your pool via link, email, or text. Friends can contribute with one click.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="font-display font-bold text-xl mb-3">Spend Together</h3>
              <p className="text-muted-foreground">Use your virtual card to make purchases anywhere Visa is accepted.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="developers" className="py-20 bg-white/[0.01]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-purple-500/10 border border-white/10 p-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-6">
              <Code className="w-4 h-4" />
              <span>ChipInPay API</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Build with ChipInPay</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Integrate group payments into your app or platform. Our REST API gives you full control over pools, contributions, and virtual cards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-400" />
                RESTful JSON API
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Webhook Notifications
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Sandbox Environment
              </div>
            </div>
            <Button size="lg" className="font-semibold px-8 h-12" asChild>
              <a href="mailto:developers@chipinpay.com?subject=ChipInPay%20API%20Access%20Request&body=Hi%20ChipInPay%20Team%2C%0A%0AI'm%20interested%20in%20accessing%20the%20ChipInPay%20Developer%20API.%0A%0ACompany%2FProject%20Name%3A%20%0AUse%20Case%3A%20%0A%0APlease%20let%20me%20know%20the%20next%20steps.%0A%0AThanks!">
                Request API Access <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold text-lg">
                C
              </div>
              <span className="font-display font-bold text-xl tracking-tight">ChipInPay</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
              <a href="#developers" className="hover:text-primary transition-colors">Developers</a>
              <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 ChipInPay Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
