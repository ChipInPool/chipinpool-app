import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MOCK_POOLS } from "@/lib/mock-data";
import { VirtualCard } from "@/components/virtual-card";
import { ArrowLeft, Copy, Eye, EyeOff, ShoppingBag, ExternalLink, ShieldCheck, Plus, Store } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
  icon?: string;
}

export default function SpendPool() {
  const [, params] = useRoute("/pool/:id/spend");
  const { toast } = useToast();
  const pool = MOCK_POOLS.find(p => p.id === params?.id);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'virtual' | 'transfer'>('virtual');
  
  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(pool?.currentAmount || 0);
  const [isSimulating, setIsSimulating] = useState(false);

  if (!pool) return <Layout><div className="text-center py-20">Pool not found</div></Layout>;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

  const simulateTransaction = (merchant: string, amount: number) => {
    setIsSimulating(true);
    setTimeout(() => {
        const newTx: Transaction = {
            id: `tx_${Math.random().toString(36).substr(2, 9)}`,
            merchant,
            amount,
            date: 'Just now',
            status: 'completed'
        };
        setTransactions([newTx, ...transactions]);
        setCurrentBalance(prev => Math.max(0, prev - amount));
        setIsSimulating(false);
        toast({
            title: `Payment Successful: ${merchant}`,
            description: `You spent $${amount.toFixed(2)}. Remaining: $${(currentBalance - amount).toFixed(2)}`
        });
    }, 1500);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Link href={`/pool/${pool.id}`}>
           <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pool
           </a>
        </Link>

        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <h1 className="text-3xl font-display font-bold mb-2">Spend Pool Funds</h1>
              <p className="text-muted-foreground">Use the collected funds securely online or transfer to a merchant.</p>
           </div>
           <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Available to Spend</p>
              <p className="text-3xl font-mono font-bold text-primary">${currentBalance.toFixed(2)}</p>
           </div>
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
                            balance={currentBalance} 
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
                          
                          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                             <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Simulate Purchase</span>
                                {isSimulating && <span className="text-xs text-primary animate-pulse">Processing...</span>}
                             </div>
                             <div className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-between border-white/10 hover:bg-white/5"
                                    onClick={() => simulateTransaction('Amazon.com', 124.50)}
                                    disabled={isSimulating || currentBalance < 124.50}
                                >
                                    <span className="flex items-center"><Store className="w-4 h-4 mr-2" /> Amazon</span>
                                    <span>$124.50</span>
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-between border-white/10 hover:bg-white/5"
                                    onClick={() => simulateTransaction('Airbnb Inc.', 450.00)}
                                    disabled={isSimulating || currentBalance < 450}
                                >
                                    <span className="flex items-center"><Store className="w-4 h-4 mr-2" /> Airbnb</span>
                                    <span>$450.00</span>
                                </Button>
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

              {/* Transaction History */}
              <div className="rounded-2xl bg-card border border-white/10 p-6">
                 <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                 {transactions.length > 0 ? (
                     <div className="space-y-3">
                        {transactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                        <ShoppingBag className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{tx.merchant}</p>
                                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                                    </div>
                                </div>
                                <span className="font-mono text-sm">-${tx.amount.toFixed(2)}</span>
                            </div>
                        ))}
                     </div>
                 ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No transactions yet.
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
}
