import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Terminal, Code2, Globe, Shield, Zap } from "lucide-react";
import { useState } from "react";
import heroImage from "@assets/generated_images/developer_api_documentation_abstract_visualization_with_code_blocks.png";

export default function ApiDocs() {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(`npm install @chipin/sdk`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-card/30 mb-12">
        <div className="absolute inset-0 z-0">
           <img src={heroImage} className="w-full h-full object-cover opacity-40 mix-blend-screen" alt="API Docs Hero" />
           <div className="absolute inset-0 bg-linear-to-r from-background via-background/95 to-transparent" />
        </div>
        <div className="relative z-10 p-8 md:p-16 max-w-3xl">
           <Badge variant="outline" className="mb-6 bg-primary/10 text-primary border-primary/20 backdrop-blur-md">Developer Preview</Badge>
           <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">Build with ChipInPay</h1>
           <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
             Integrate social group payments directly into your checkout flow. 
             Allow your customers to split costs instantly without leaving your site.
           </p>
           <div className="flex flex-wrap gap-4">
              <Button size="lg" className="h-12 px-8 font-bold shadow-lg shadow-primary/20">Get API Keys</Button>
              <Button variant="outline" size="lg" className="h-12 px-8 border-white/10 bg-white/5">View on GitHub</Button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-8">
           <div className="sticky top-24">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Documentation</h3>
              <nav className="space-y-1">
                 <a href="#introduction" className="block px-3 py-2 rounded-md bg-primary/10 text-primary font-medium border-l-2 border-primary">Introduction</a>
                 <a href="#quickstart" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">Quick Start</a>
                 <a href="#authentication" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">Authentication</a>
                 <a href="#checkout" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">Checkout Session</a>
                 <a href="#webhooks" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">Webhooks</a>
              </nav>

              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mt-8 mb-4">SDK References</h3>
              <nav className="space-y-1">
                 <a href="#" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">Node.js</a>
                 <a href="#" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">Python</a>
                 <a href="#" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">React</a>
              </nav>
           </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-16">
           {/* Introduction */}
           <section id="introduction" className="space-y-6">
              <h2 className="text-3xl font-display font-bold">Introduction</h2>
              <p className="text-muted-foreground text-lg">
                ChipInPay allows e-commerce merchants to offer "Split Payment" as a native checkout option. 
                Instead of one person paying $500, they can start a pool directly at checkout and invite friends to contribute.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                 <div className="p-6 rounded-xl bg-card border border-white/5">
                    <Globe className="w-8 h-8 text-primary mb-4" />
                    <h3 className="font-bold mb-2">Universal Checkout</h3>
                    <p className="text-sm text-muted-foreground">Works with any payment gateway via our unified API layer.</p>
                 </div>
                 <div className="p-6 rounded-xl bg-card border border-white/5">
                    <Shield className="w-8 h-8 text-accent mb-4" />
                    <h3 className="font-bold mb-2">Fraud Protection</h3>
                    <p className="text-sm text-muted-foreground">Built-in risk analysis for all pooled transactions.</p>
                 </div>
                 <div className="p-6 rounded-xl bg-card border border-white/5">
                    <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                    <h3 className="font-bold mb-2">Instant Settlement</h3>
                    <p className="text-sm text-muted-foreground">We collect the pool and settle the full amount to you instantly.</p>
                 </div>
              </div>
           </section>

           {/* Quick Start */}
           <section id="quickstart" className="space-y-6">
              <h2 className="text-3xl font-display font-bold">Quick Start</h2>
              <p className="text-muted-foreground">Install the React SDK to get started.</p>
              
              <div className="relative group">
                 <div className="absolute top-3 right-3 z-10">
                    <Button variant="ghost" size="icon" onClick={copyCode} className="h-8 w-8 bg-white/10 hover:bg-white/20">
                       {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                 </div>
                 <div className="bg-[#0D1117] rounded-xl border border-white/10 p-6 overflow-x-auto font-mono text-sm">
                    <div className="flex gap-2 mb-4 border-b border-white/5 pb-2">
                       <span className="text-green-400">npm</span>
                       <span className="text-muted-foreground">yarn</span>
                       <span className="text-muted-foreground">pnpm</span>
                    </div>
                    <span className="text-purple-400">npm</span> install <span className="text-blue-400">@chipin/sdk</span>
                 </div>
              </div>
           </section>

           {/* Integration Example */}
           <section id="checkout" className="space-y-6">
              <h2 className="text-3xl font-display font-bold">Create a Checkout Session</h2>
              <p className="text-muted-foreground">Initialize the ChipIn button in your checkout component.</p>
              
              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">CheckoutForm.tsx</span>
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">import</span> {"{ ChipInProvider, PayButton }"} <span className="text-purple-400">from</span> <span className="text-green-400">'@chipin/sdk'</span>;

<span className="text-purple-400">export function</span> <span className="text-blue-400">Checkout</span>() {"{"}
  <span className="text-purple-400">return</span> (
    <span className="text-gray-500">&lt;</span><span className="text-yellow-400">ChipInProvider</span> <span className="text-blue-300">apiKey</span>=<span className="text-green-400">"pk_live_..."</span><span className="text-gray-500">&gt;</span>
      <span className="text-gray-500">&lt;</span><span className="text-yellow-400">div</span> <span className="text-blue-300">className</span>=<span className="text-green-400">"checkout-container"</span><span className="text-gray-500">&gt;</span>
        <span className="text-gray-500">&lt;</span><span className="text-yellow-400">h1</span><span className="text-gray-500">&gt;</span>Total: $499.00<span className="text-gray-500">&lt;/</span><span className="text-yellow-400">h1</span><span className="text-gray-500">&gt;</span>
        
        <span className="text-gray-500">{/* Standard checkout button */}</span>
        <span className="text-gray-500">&lt;</span><span className="text-yellow-400">button</span><span className="text-gray-500">&gt;</span>Pay Now<span className="text-gray-500">&lt;/</span><span className="text-yellow-400">button</span><span className="text-gray-500">&gt;</span>

        <span className="text-gray-500">{/* ChipIn Split button */}</span>
        <span className="text-gray-500">&lt;</span><span className="text-yellow-400">PayButton</span> 
          <span className="text-blue-300">amount</span>={"{49900}"}
          <span className="text-blue-300">currency</span>=<span className="text-green-400">"USD"</span>
          <span className="text-blue-300">onSuccess</span>={"{handleSuccess}"}
        <span className="text-gray-500">/&gt;</span>
      <span className="text-gray-500">&lt;/</span><span className="text-yellow-400">div</span><span className="text-gray-500">&gt;</span>
    <span className="text-gray-500">&lt;/</span><span className="text-yellow-400">ChipInProvider</span><span className="text-gray-500">&gt;</span>
  );
{"}"}
</pre>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </Layout>
  );
}
