import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Copy, Terminal, Code2, Globe, Shield, Zap, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@assets/generated_images/developer_api_documentation_abstract_visualization_with_code_blocks.png";

export default function ApiDocs() {
  const [copied, setCopied] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    useCase: "",
    monthlyVolume: "",
  });

  const copyCode = () => {
    navigator.clipboard.writeText(`npm install @chipin/sdk`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest("POST", "/api/developer/request-access", {
        ...formData,
        email: user?.email,
        name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
      });
      setSubmitted(true);
      toast({
        title: "Request Submitted!",
        description: "We'll review your application and get back to you within 2-3 business days.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
              <Button 
                size="lg" 
                className="h-12 px-8 font-bold shadow-lg shadow-primary/20"
                onClick={() => setShowRequestForm(true)}
                data-testid="button-request-api-keys"
              >
                Request API Keys
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 border-white/10 bg-white/5">View on GitHub</Button>
           </div>
        </div>
      </div>

      {/* API Access Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold">Request API Access</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowRequestForm(false)}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-close-api-form"
              >
                &times;
              </Button>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground mb-6">
                  We'll review your request and send your API keys to <strong>{user?.email}</strong> within 2-3 business days.
                </p>
                <Button onClick={() => setShowRequestForm(false)} data-testid="button-close-success">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-5">
                <div>
                  <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Acme Inc."
                    required
                    className="mt-1.5 bg-background/50 border-white/10"
                    data-testid="input-company-name"
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    required
                    className="mt-1.5 bg-background/50 border-white/10"
                    data-testid="input-website"
                  />
                </div>

                <div>
                  <Label htmlFor="useCase" className="text-sm font-medium">Describe Your Use Case</Label>
                  <Textarea
                    id="useCase"
                    value={formData.useCase}
                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                    placeholder="We're building an e-commerce platform and want to offer split payments for group purchases..."
                    required
                    rows={4}
                    className="mt-1.5 bg-background/50 border-white/10 resize-none"
                    data-testid="input-use-case"
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyVolume" className="text-sm font-medium">Expected Monthly Transaction Volume</Label>
                  <select
                    id="monthlyVolume"
                    value={formData.monthlyVolume}
                    onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                    required
                    className="w-full mt-1.5 px-3 py-2 rounded-md bg-background/50 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="select-monthly-volume"
                  >
                    <option value="">Select volume...</option>
                    <option value="under_10k">Under $10,000</option>
                    <option value="10k_50k">$10,000 - $50,000</option>
                    <option value="50k_100k">$50,000 - $100,000</option>
                    <option value="100k_500k">$100,000 - $500,000</option>
                    <option value="over_500k">Over $500,000</option>
                  </select>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    API keys will be sent to <strong>{user?.email || "your email"}</strong>. Make sure this email is correct in your profile settings.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-bold"
                  disabled={submitting}
                  data-testid="button-submit-api-request"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

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
                 <a href="#nodejs-sdk" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">Node.js</a>
                 <a href="#python-sdk" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">Python</a>
                 <a href="#react-sdk" className="block px-3 py-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent">React</a>
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

           {/* Authentication */}
           <section id="authentication" className="space-y-6">
              <h2 className="text-3xl font-display font-bold">Authentication</h2>
              <p className="text-muted-foreground">All API requests require authentication via your API key.</p>
              
              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">HTTP Request</span>
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">Authorization:</span> Bearer <span className="text-green-400">pk_live_your_api_key_here</span>

<span className="text-muted-foreground"># Example cURL request</span>
<span className="text-blue-400">curl</span> -X POST https://api.chipinpay.com/v1/pools \
  -H <span className="text-green-400">"Authorization: Bearer pk_live_..."</span> \
  -H <span className="text-green-400">"Content-Type: application/json"</span> \
  -d <span className="text-green-400">'{"{"}"amount": 50000, "currency": "usd"{"}"}'</span>
</pre>
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

           {/* Webhooks */}
           <section id="webhooks" className="space-y-6">
              <h2 className="text-3xl font-display font-bold">Webhooks</h2>
              <p className="text-muted-foreground">Receive real-time updates when pools are funded or contributions are made.</p>
              
              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">Webhook Payload</span>
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
{"{"}
  <span className="text-blue-300">"event"</span>: <span className="text-green-400">"pool.funded"</span>,
  <span className="text-blue-300">"data"</span>: {"{"}
    <span className="text-blue-300">"pool_id"</span>: <span className="text-green-400">"pool_123abc"</span>,
    <span className="text-blue-300">"amount"</span>: <span className="text-yellow-400">50000</span>,
    <span className="text-blue-300">"currency"</span>: <span className="text-green-400">"usd"</span>,
    <span className="text-blue-300">"contributors"</span>: <span className="text-yellow-400">4</span>,
    <span className="text-blue-300">"metadata"</span>: {"{"}
      <span className="text-blue-300">"order_id"</span>: <span className="text-green-400">"ord_789xyz"</span>
    {"}"}
  {"}"},
  <span className="text-blue-300">"created_at"</span>: <span className="text-green-400">"2026-01-20T12:00:00Z"</span>
{"}"}
</pre>
                 </div>
              </div>
           </section>

           {/* Node.js SDK */}
           <section id="nodejs-sdk" className="space-y-6 pt-8 border-t border-white/5">
              <h2 className="text-3xl font-display font-bold">Node.js SDK</h2>
              <p className="text-muted-foreground">Server-side integration for Node.js applications.</p>
              
              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">Installation</span>
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">npm</span> install <span className="text-blue-400">@chipin/node-sdk</span>
</pre>
                 </div>
              </div>

              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">server.js</span>
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">const</span> ChipIn = <span className="text-purple-400">require</span>(<span className="text-green-400">'@chipin/node-sdk'</span>);

<span className="text-purple-400">const</span> chipin = <span className="text-purple-400">new</span> <span className="text-yellow-400">ChipIn</span>(<span className="text-green-400">'sk_live_your_secret_key'</span>);

<span className="text-muted-foreground">// Create a checkout session</span>
<span className="text-purple-400">const</span> session = <span className="text-purple-400">await</span> chipin.checkoutSessions.<span className="text-blue-400">create</span>({"{"}
  <span className="text-blue-300">amount</span>: <span className="text-yellow-400">49900</span>,
  <span className="text-blue-300">currency</span>: <span className="text-green-400">'usd'</span>,
  <span className="text-blue-300">description</span>: <span className="text-green-400">'Group vacation booking'</span>,
  <span className="text-blue-300">success_url</span>: <span className="text-green-400">'https://yoursite.com/success'</span>,
  <span className="text-blue-300">cancel_url</span>: <span className="text-green-400">'https://yoursite.com/cancel'</span>,
  <span className="text-blue-300">metadata</span>: {"{"} <span className="text-blue-300">order_id</span>: <span className="text-green-400">'ord_123'</span> {"}"}
{"}"});

console.<span className="text-blue-400">log</span>(session.url); <span className="text-muted-foreground">// Redirect user to this URL</span>
</pre>
                 </div>
              </div>
           </section>

           {/* Python SDK */}
           <section id="python-sdk" className="space-y-6 pt-8 border-t border-white/5">
              <h2 className="text-3xl font-display font-bold">Python SDK</h2>
              <p className="text-muted-foreground">Server-side integration for Python applications.</p>
              
              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">Installation</span>
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">pip</span> install <span className="text-blue-400">chipinpay</span>
</pre>
                 </div>
              </div>

              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">app.py</span>
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">import</span> chipinpay

chipinpay.api_key = <span className="text-green-400">"sk_live_your_secret_key"</span>

<span className="text-muted-foreground"># Create a checkout session</span>
session = chipinpay.CheckoutSession.<span className="text-blue-400">create</span>(
    <span className="text-blue-300">amount</span>=<span className="text-yellow-400">49900</span>,
    <span className="text-blue-300">currency</span>=<span className="text-green-400">"usd"</span>,
    <span className="text-blue-300">description</span>=<span className="text-green-400">"Group vacation booking"</span>,
    <span className="text-blue-300">success_url</span>=<span className="text-green-400">"https://yoursite.com/success"</span>,
    <span className="text-blue-300">cancel_url</span>=<span className="text-green-400">"https://yoursite.com/cancel"</span>,
    <span className="text-blue-300">metadata</span>={"{"}
        <span className="text-green-400">"order_id"</span>: <span className="text-green-400">"ord_123"</span>
    {"}"}
)

<span className="text-blue-400">print</span>(session.url)  <span className="text-muted-foreground"># Redirect user to this URL</span>
</pre>
                 </div>
              </div>
           </section>

           {/* React SDK */}
           <section id="react-sdk" className="space-y-6 pt-8 border-t border-white/5">
              <h2 className="text-3xl font-display font-bold">React SDK</h2>
              <p className="text-muted-foreground">Client-side components for React applications.</p>
              
              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">Installation</span>
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">npm</span> install <span className="text-blue-400">@chipin/react</span>
</pre>
                 </div>
              </div>

              <div className="bg-[#0D1117] rounded-xl border border-white/10 overflow-hidden font-mono text-sm">
                 <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-muted-foreground">Checkout.tsx</span>
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                 </div>
                 <div className="p-6 overflow-x-auto">
<pre className="text-gray-300">
<span className="text-purple-400">import</span> {"{ ChipInProvider, SplitPayButton, useChipIn }"} <span className="text-purple-400">from</span> <span className="text-green-400">'@chipin/react'</span>;

<span className="text-purple-400">function</span> <span className="text-blue-400">App</span>() {"{"}
  <span className="text-purple-400">return</span> (
    <span className="text-gray-500">&lt;</span><span className="text-yellow-400">ChipInProvider</span> <span className="text-blue-300">publishableKey</span>=<span className="text-green-400">"pk_live_..."</span><span className="text-gray-500">&gt;</span>
      <span className="text-gray-500">&lt;</span><span className="text-yellow-400">Checkout</span> <span className="text-gray-500">/&gt;</span>
    <span className="text-gray-500">&lt;/</span><span className="text-yellow-400">ChipInProvider</span><span className="text-gray-500">&gt;</span>
  );
{"}"}

<span className="text-purple-400">function</span> <span className="text-blue-400">Checkout</span>() {"{"}
  <span className="text-purple-400">const</span> {"{ createSession }"} = <span className="text-blue-400">useChipIn</span>();
  
  <span className="text-purple-400">const</span> handleSplit = <span className="text-purple-400">async</span> () =&gt; {"{"}
    <span className="text-purple-400">const</span> session = <span className="text-purple-400">await</span> <span className="text-blue-400">createSession</span>({"{"}
      <span className="text-blue-300">amount</span>: <span className="text-yellow-400">49900</span>,
      <span className="text-blue-300">currency</span>: <span className="text-green-400">'usd'</span>,
      <span className="text-blue-300">productName</span>: <span className="text-green-400">'Group vacation booking'</span>,
    {"}"});
    window.location.href = session.url;
  {"}"};

  <span className="text-purple-400">return</span> (
    <span className="text-gray-500">&lt;</span><span className="text-yellow-400">div</span><span className="text-gray-500">&gt;</span>
      <span className="text-gray-500">&lt;</span><span className="text-yellow-400">h1</span><span className="text-gray-500">&gt;</span>Total: $499.00<span className="text-gray-500">&lt;/</span><span className="text-yellow-400">h1</span><span className="text-gray-500">&gt;</span>
      
      <span className="text-gray-500">{/* One-click split button */}</span>
      <span className="text-gray-500">&lt;</span><span className="text-yellow-400">SplitPayButton</span>
        <span className="text-blue-300">amount</span>={"{49900}"}
        <span className="text-blue-300">currency</span>=<span className="text-green-400">"usd"</span>
        <span className="text-blue-300">onSuccess</span>={"{(session) => console.log('Session:', session)}"}
      <span className="text-gray-500">/&gt;</span>
      
      <span className="text-gray-500">{/* Or custom button */}</span>
      <span className="text-gray-500">&lt;</span><span className="text-yellow-400">button</span> <span className="text-blue-300">onClick</span>={"{"}<span className="text-blue-400">handleSplit</span>{"}"}<span className="text-gray-500">&gt;</span>
        Split with Friends
      <span className="text-gray-500">&lt;/</span><span className="text-yellow-400">button</span><span className="text-gray-500">&gt;</span>
    <span className="text-gray-500">&lt;/</span><span className="text-yellow-400">div</span><span className="text-gray-500">&gt;</span>
  );
{"}"}
</pre>
                 </div>
              </div>

              <div className="p-6 rounded-xl bg-card border border-white/5">
                <h3 className="font-bold mb-3">Component Props</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Prop</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-white/5">
                        <td className="py-2 px-3 font-mono text-xs text-primary">amount</td>
                        <td className="py-2 px-3 font-mono text-xs">number</td>
                        <td className="py-2 px-3">Amount in cents (e.g., 4999 for $49.99)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2 px-3 font-mono text-xs text-primary">currency</td>
                        <td className="py-2 px-3 font-mono text-xs">string</td>
                        <td className="py-2 px-3">Three-letter currency code (usd, eur, gbp)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2 px-3 font-mono text-xs text-primary">onSuccess</td>
                        <td className="py-2 px-3 font-mono text-xs">function</td>
                        <td className="py-2 px-3">Callback when session is created</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2 px-3 font-mono text-xs text-primary">onError</td>
                        <td className="py-2 px-3 font-mono text-xs">function</td>
                        <td className="py-2 px-3">Callback when an error occurs</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono text-xs text-primary">metadata</td>
                        <td className="py-2 px-3 font-mono text-xs">object</td>
                        <td className="py-2 px-3">Custom key-value pairs for your reference</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
           </section>
        </div>
      </div>
    </Layout>
  );
}
