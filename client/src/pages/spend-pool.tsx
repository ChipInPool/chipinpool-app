import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MOCK_POOLS } from "@/lib/mock-data";
import { VirtualCard } from "@/components/virtual-card";
import { ArrowLeft, Copy, Eye, EyeOff, ShoppingBag, ExternalLink, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function SpendPool() {
  const [, params] = useRoute("/pool/:id/spend");
  const { toast } = useToast();
  const pool = MOCK_POOLS.find(p => p.id === params?.id);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'virtual' | 'transfer'>('virtual');

  if (!pool) return <Layout><div className="text-center py-20">Pool not found</div></Layout>;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Link href={`/pool/${pool.id}`}>
           <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pool
           </a>
        </Link>

        <div className="mb-8">
           <h1 className="text-3xl font-display font-bold mb-2">Spend Pool Funds</h1>
           <p className="text-muted-foreground">Use the collected funds securely online or transfer to a merchant.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           {/* Left: Card Visualization */}
           <div className="md:col-span-7 space-y-6">
              <div className="p-1 rounded-3xl bg-linear-to-b from-white/10 to-transparent">
                  <div className="bg-card/50 backdrop-blur-xl rounded-[22px] p-6 border border-white/5">
                      <div className="flex items-center justify-between mb-6">
                          <div>
                              <h2 className="text-lg font-semibold">Virtual Pool Card</h2>
                              <p className="text-xs text-muted-foreground">Generated for "{pool.title}"</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-white/10"
                            onClick={() => setShowCardDetails(!showCardDetails)}
                          >
                             {showCardDetails ? <EyeOff className="w-3.5 h-3.5 mr-2" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
                             {showCardDetails ? "Hide Numbers" : "Show Numbers"}
                          </Button>
                      </div>

                      <div className="mb-8">
                         <VirtualCard 
                            balance={pool.currentAmount} 
                            poolName={pool.title}
                            cardNumber={showCardDetails ? "4922 8301 2944 8592" : "•••• •••• •••• 8592"}
                            cvc={showCardDetails ? "492" : "•••"}
                            expiry="05/28"
                         />
                      </div>

                      <AnimatePresence>
                        {showCardDetails && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center group cursor-pointer" onClick={() => handleCopy("4922830129448592", "Card number")}>
                                   <div>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Number</div>
                                      <div className="font-mono text-sm font-medium text-foreground">4922 8301 2944 8592</div>
                                   </div>
                                   <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="p-3 rounded-lg bg-white/5 border border-white/5 group cursor-pointer" onClick={() => handleCopy("05/28", "Expiry")}>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expiry</div>
                                      <div className="font-mono text-sm font-medium text-foreground">05/28</div>
                                   </div>
                                   <div className="p-3 rounded-lg bg-white/5 border border-white/5 group cursor-pointer" onClick={() => handleCopy("492", "CVC")}>
                                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CVC</div>
                                      <div className="font-mono text-sm font-medium text-foreground">492</div>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs flex items-start gap-2">
                                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>This is a single-use virtual card. It will lock automatically after the full balance is spent.</p>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
              </div>
           </div>

           {/* Right: Actions & Integration */}
           <div className="md:col-span-5 space-y-6">
              <div className="rounded-2xl bg-card border border-white/10 overflow-hidden">
                 <div className="flex border-b border-white/10">
                    <button 
                       onClick={() => setActiveTab('virtual')}
                       className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'virtual' ? 'bg-white/5 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                    >
                       Online Checkout
                    </button>
                    <button 
                       onClick={() => setActiveTab('transfer')}
                       className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'transfer' ? 'bg-white/5 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                    >
                       Direct Transfer
                    </button>
                 </div>

                 <div className="p-6">
                    {activeTab === 'virtual' ? (
                       <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                             Use the virtual card details to pay on any website that accepts Visa. Perfect for booking flights or buying gifts.
                          </p>
                          <div className="space-y-2">
                             <h4 className="text-xs font-semibold uppercase text-muted-foreground">Supported Merchants</h4>
                             <div className="flex gap-2">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" className="w-full" /></div>
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2"><img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Airbnb_Logo_B%C3%A9lo.svg" className="w-full" /></div>
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="w-full" /></div>
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-muted-foreground">+500</div>
                             </div>
                          </div>
                          <Button className="w-full mt-2 group" variant="secondary">
                             Open Merchant Site <ExternalLink className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                             Transfer funds directly to a connected bank account or merchant ID.
                          </p>
                          <div className="p-4 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-center gap-2 py-8 hover:bg-white/5 cursor-pointer transition-colors">
                             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <ExternalLink className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className="font-medium">Connect Bank Account</h4>
                                <p className="text-xs text-muted-foreground">Via Plaid or Stripe Connect</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              {/* Transaction History Placeholder */}
              <div className="rounded-2xl bg-card border border-white/10 p-6">
                 <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                 <div className="text-center py-8 text-sm text-muted-foreground">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No transactions yet.
                 </div>
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
}
