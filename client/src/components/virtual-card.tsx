import { motion } from "framer-motion";
import { Wifi, CreditCard } from "lucide-react";

interface VirtualCardProps {
  balance: number;
  poolName: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  cardHolder?: string;
}

export function VirtualCard({ 
  balance, 
  poolName, 
  cardNumber = "4922 8301 2944 8592", 
  expiry = "05/28", 
  cvc = "492",
  cardHolder = "CHIPIN VIRTUAL"
}: VirtualCardProps) {
  return (
    <motion.div 
      initial={{ rotateY: 0 }}
      whileHover={{ rotateY: 5, rotateX: 5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative w-full aspect-[1.586] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/10 group perspective-1000"
    >
      {/* Background with iridescent effect */}
      <div className="absolute inset-0 bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] z-0" />
      
      {/* Dynamic Sheen */}
      <div className="absolute inset-0 bg-linear-to-tr from-primary/20 via-transparent to-accent/20 opacity-50 z-10" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-10 mix-blend-overlay" />
      
      {/* Holographic Element */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl mix-blend-screen animate-pulse-slow" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/30 rounded-full blur-3xl mix-blend-screen animate-pulse-slow delay-75" />

      {/* Card Content */}
      <div className="relative z-20 p-6 md:p-8 flex flex-col justify-between h-full text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
               <span className="font-bold text-lg italic">C</span>
            </div>
            <span className="font-display font-bold tracking-wider text-sm opacity-80">CHIPIN</span>
          </div>
          <Wifi className="w-6 h-6 opacity-60 rotate-90" />
        </div>

        <div className="space-y-6">
           {/* Chip */}
           <div className="w-12 h-9 rounded-md bg-linear-to-br from-yellow-200 to-yellow-500 shadow-inner border border-yellow-600/50 relative overflow-hidden">
              <div className="absolute inset-0 border border-black/10 rounded-md" />
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20" />
              <div className="absolute top-0 left-1/2 h-full w-[1px] bg-black/20" />
           </div>

           <div className="space-y-1">
             <div className="font-mono text-xl md:text-2xl tracking-[0.15em] drop-shadow-md">
                {cardNumber}
             </div>
             <div className="flex items-center gap-4 text-xs md:text-sm font-mono opacity-80">
                <div className="flex flex-col">
                   <span className="text-[8px] uppercase tracking-widest opacity-60">Valid Thru</span>
                   <span>{expiry}</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[8px] uppercase tracking-widest opacity-60">CVC</span>
                   <span>{cvc}</span>
                </div>
             </div>
           </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
             <div className="text-[10px] uppercase tracking-widest opacity-60">Card Holder</div>
             <div className="font-display font-medium tracking-wide uppercase">{cardHolder}</div>
          </div>
          <div className="text-right">
             <div className="text-[10px] uppercase tracking-widest opacity-60">Balance</div>
             <div className="font-mono font-bold text-xl">${balance.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
