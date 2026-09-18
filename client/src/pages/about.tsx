import { PublicLayout as Layout } from "@/components/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, Zap, Heart, Target, Globe } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 md:py-12 px-1 sm:px-0">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-display font-bold mb-3 md:mb-4">About ChipInPool</h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to make group payments simple, transparent, and social.
          </p>
        </div>

        <div className="prose prose-invert max-w-none mb-8 md:mb-12">
          <div className="bg-card/50 border border-white/10 rounded-2xl p-4 md:p-8 mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              ChipInPool was born from a simple frustration: splitting bills and pooling money with friends shouldn't be complicated. Whether it's a group trip, a birthday gift, or shared household expenses, we believe managing money together should bring people closer, not create awkward moments.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Founded in 2024, we set out to build the most intuitive, secure, and social way to handle group finances. ChipInPool brings shared goals and contributions into one place.
            </p>
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Community First</h3>
              <p className="text-sm text-muted-foreground">
                We build for real people with real needs. Every feature starts with understanding how groups actually manage money together.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Security & Trust</h3>
              <p className="text-sm text-muted-foreground">
                Manage account verification and spending controls, with Stripe integrations for payment processing and identity verification.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="font-semibold mb-2">Simplicity</h3>
              <p className="text-sm text-muted-foreground">
                Complex problems deserve elegant solutions. We obsess over making every interaction intuitive and delightful.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="font-semibold mb-2">Transparency</h3>
              <p className="text-sm text-muted-foreground">
                No hidden fees, no surprises. Everyone in a pool can see contributions and spending in real-time.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">Goal-Oriented</h3>
              <p className="text-sm text-muted-foreground">
                Whether saving for a trip or funding a project, we help groups stay motivated and reach their targets together.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2">Inclusive</h3>
              <p className="text-sm text-muted-foreground">
                Money management tools should be accessible to everyone. We're building for diverse communities worldwide.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-2xl p-5 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Join Our Journey</h2>
          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 max-w-xl mx-auto">
            We're building a clearer way to collect contributions and manage shared expenses.
          </p>
          <a href="/register" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors" data-testid="link-about-get-started">
            Get Started Free
          </a>
        </div>
      </div>
    </Layout>
  );
}
