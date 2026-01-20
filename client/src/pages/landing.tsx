import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Sparkles, Zap, ShieldCheck, Users, CreditCard, Code, ArrowRight, CheckCircle, Star, RefreshCw, Bell, Globe } from "lucide-react";
import heroImage from "@assets/generated_images/futuristic_fintech_3d_visualization_of_digital_currency_pooling.png";

const stats = [
  { label: "Active Users", value: "50K+" },
  { label: "Pools Created", value: "120K+" },
  { label: "Funds Pooled", value: "$8M+" },
  { label: "Countries", value: "15+" },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Trip Organizer",
    content: "ChipInPay made our group trip to Hawaii so much easier. No more chasing people for money!",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 5,
  },
  {
    name: "Mike R.",
    role: "Event Planner",
    content: "The virtual cards are a game-changer. We collected funds and spent them instantly for our company retreat.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    rating: 5,
  },
  {
    name: "Emily K.",
    role: "Gift Coordinator",
    content: "Perfect for group gifts! Everyone chips in, and I can buy exactly what we want with the virtual card.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    rating: 5,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-background font-bold text-lg shadow-lg shadow-primary/30">
              C
            </div>
            <span className="font-display font-bold text-xl tracking-tight">ChipInPay</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-how-it-works">How It Works</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-testimonials">Reviews</a>
            <a href="#developers" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" data-testid="link-developers">Developers</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="font-medium" asChild data-testid="button-signin">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="font-semibold shadow-lg shadow-primary/20" asChild data-testid="button-get-started">
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
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-4 h-4" />
              <span>The Future of Group Payments</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Pool funds.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">Split costs.</span><br />
              Shop together.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Create pools for trips, gifts, or shared expenses. Invite friends, track contributions in real-time, and spend instantly with virtual cards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="font-semibold text-lg px-10 h-14 shadow-xl shadow-primary/30 hover:scale-105 transition-transform" asChild data-testid="button-start-pooling">
                <Link href="/login">Start Pooling Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-10 border-white/10 bg-white/5 hover:bg-white/10 text-lg" asChild data-testid="button-how-it-works">
                <Link href="/how-it-works">See How It Works</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 border-y border-white/5 bg-white/[0.01] overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-8 md:gap-16 text-muted-foreground opacity-60">
            <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
              <ShieldCheck className="w-5 h-5" /> Bank-Level Security
            </div>
            <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
              <CreditCard className="w-5 h-5" /> Visa Cards
            </div>
            <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
              <Globe className="w-5 h-5" /> Works Worldwide
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm font-medium whitespace-nowrap">
              <RefreshCw className="w-5 h-5" /> Instant Transfers
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white/[0.01]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" /> Features
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Everything you need for group payments</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">From splitting dinner to funding a group vacation, ChipInPay makes it easy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="p-4 rounded-xl bg-primary/10 text-primary w-fit mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Instant Pooling</h3>
              <p className="text-muted-foreground">Create a pool in seconds. Funds are available immediately once contributions are made.</p>
            </div>

            <div className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300">
              <div className="p-4 rounded-xl bg-accent/10 text-accent w-fit mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Virtual Cards</h3>
              <p className="text-muted-foreground">Auto-generate virtual Visa cards tied to your pools. Spend anywhere, online or in-store.</p>
            </div>

            <div className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
              <div className="p-4 rounded-xl bg-purple-500/10 text-purple-400 w-fit mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Social Splitting</h3>
              <p className="text-muted-foreground">Invite friends via link, email, or SMS. See who's contributed and who hasn't.</p>
            </div>

            <div className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300">
              <div className="p-4 rounded-xl bg-green-500/10 text-green-400 w-fit mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Bank-Level Security</h3>
              <p className="text-muted-foreground">256-bit encryption, KYC verification, and real-time fraud monitoring.</p>
            </div>

            <div className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300">
              <div className="p-4 rounded-xl bg-orange-500/10 text-orange-400 w-fit mb-6 group-hover:scale-110 transition-transform">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Smart Notifications</h3>
              <p className="text-muted-foreground">Get notified via email or SMS when friends contribute, pools hit goals, or cards are used.</p>
            </div>

            <div className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
              <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 w-fit mb-6 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">Recurring Contributions</h3>
              <p className="text-muted-foreground">Set up weekly, monthly, or quarterly auto-contributions for ongoing pools.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" /> Simple Process
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">How ChipInPay Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to start pooling funds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-accent/50" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-background flex items-center justify-center text-2xl font-bold mx-auto mb-6 relative z-10 shadow-lg shadow-primary/30">1</div>
              <h3 className="font-display font-bold text-xl mb-3">Create a Pool</h3>
              <p className="text-muted-foreground">Set your goal, add a description, and choose a deadline. It takes less than a minute.</p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-accent/50 to-purple-500/50" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/70 text-background flex items-center justify-center text-2xl font-bold mx-auto mb-6 relative z-10 shadow-lg shadow-accent/30">2</div>
              <h3 className="font-display font-bold text-xl mb-3">Invite Friends</h3>
              <p className="text-muted-foreground">Share your pool via link, email, or text. Friends can contribute with one click.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 relative z-10 shadow-lg shadow-purple-500/30">3</div>
              <h3 className="font-display font-bold text-xl mb-3">Spend Together</h3>
              <p className="text-muted-foreground">Use your virtual card to make purchases anywhere Visa is accepted.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-white/[0.01]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-sm font-semibold mb-4">
              <Star className="w-4 h-4" /> Reviews
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Loved by Thousands</h2>
            <p className="text-muted-foreground text-lg">See what our users are saying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="developers" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-purple-500/10 border border-white/10 p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-6">
                <Code className="w-4 h-4" />
                <span>ChipInPay API</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Build with ChipInPay</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Integrate group payments into your app or platform. Our REST API gives you full control over pools, contributions, and virtual cards.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="font-semibold px-8 h-12" asChild data-testid="button-request-api">
                  <Link href="/api-docs">
                    View Documentation <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="px-8 h-12 border-white/10 bg-white/5" asChild>
                  <a href="mailto:developers@chipinpay.com?subject=ChipInPay%20API%20Access%20Request">
                    Contact Sales
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-transparent to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Ready to start pooling?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of users who are already splitting costs and pooling funds with ChipInPay.
          </p>
          <Button size="lg" className="font-semibold text-lg px-12 h-14 shadow-xl shadow-primary/30" asChild data-testid="button-cta-start">
            <Link href="/login">Get Started Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-background font-bold text-lg shadow-lg shadow-primary/20">
                  C
                </div>
                <span className="font-display font-bold text-xl tracking-tight">ChipInPay</span>
              </div>
              <p className="text-sm text-muted-foreground">Pool funds together. Pay smarter.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/how-it-works" className="block hover:text-primary transition-colors">How It Works</Link>
                <a href="#features" className="block hover:text-primary transition-colors">Features</a>
                <Link href="/api-docs" className="block hover:text-primary transition-colors">API Documentation</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-primary transition-colors">About</a>
                <a href="#" className="block hover:text-primary transition-colors">Careers</a>
                <a href="mailto:support@chipinpay.com" className="block hover:text-primary transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-primary transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-primary transition-colors">Terms of Service</a>
                <a href="#" className="block hover:text-primary transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2026 ChipInPay Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
