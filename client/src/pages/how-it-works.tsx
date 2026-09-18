import { PublicLayout as Layout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, UserPlus, CreditCard, Share2, Gift } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <UserPlus className="w-8 h-8 text-primary" />,
      title: "1. Create a Pool",
      description: "Set a goal, add details, and choose a category. It only takes a minute to get started."
    },
    {
      icon: <Share2 className="w-8 h-8 text-accent" />,
      title: "2. Invite Friends",
      description: "Share your unique pool link via SMS, WhatsApp, or social media. Friends can chip in without an account."
    },
    {
      icon: <CreditCard className="w-8 h-8 text-purple-400" />,
      title: "3. Collect Funds",
      description: "Watch contributions roll in. Track confirmed contributions and progress toward your goal."
    },
    {
      icon: <Gift className="w-8 h-8 text-yellow-400" />,
      title: "4. Spend & Enjoy",
      description: "Review the available card and bank payout options for your pool. Verification and provider requirements apply."
    }
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 md:py-12 px-1 sm:px-0">
         <div className="text-center mb-8 md:mb-16">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold mb-4 md:mb-6">How ChipInPool Works</h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
               Pooling money shouldn't be a hassle. We've streamlined the process so you can focus on the experience, not the math.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-10 md:mb-20">
            {steps.map((step, i) => (
               <div key={i} className="p-5 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-colors">
                  <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 text-7xl md:text-9xl font-bold font-display pointer-events-none">
                     {i + 1}
                  </div>
                  <div className="relative z-10">
                     <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                        {step.icon}
                     </div>
                     <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-3">{step.title}</h3>
                     <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
               </div>
            ))}
         </div>

         <div className="rounded-2xl md:rounded-3xl bg-linear-to-br from-primary/20 to-accent/20 p-1">
            <div className="bg-background rounded-[20px] md:rounded-[22px] p-6 md:p-12 text-center">
               <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 md:mb-4">Ready to start?</h2>
               <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">Create a shared plan for trips, gifts, and more.</p>
               <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform" asChild>
                 <Link href="/register">Start Your First Pool <ArrowRight className="w-5 h-5 ml-2" /></Link>
               </Button>
            </div>
         </div>
      </div>
    </Layout>
  );
}
