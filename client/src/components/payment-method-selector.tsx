import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Apple, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface PaymentMethodSelectorProps {
  onMethodChange: (method: string) => void;
}

export function PaymentMethodSelector({ onMethodChange }: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState("card");

  const handleChange = (val: string) => {
    setSelected(val);
    onMethodChange(val);
  };

  return (
    <div className="space-y-4">
      <RadioGroup defaultValue="card" onValueChange={handleChange} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <RadioGroupItem value="card" id="card" className="peer sr-only" />
          <Label
            htmlFor="card"
            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all h-24"
          >
            <CreditCard className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">Card</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem value="apple" id="apple" className="peer sr-only" />
          <Label
            htmlFor="apple"
            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all h-24"
          >
            <Apple className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">Apple Pay</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
          <Label
            htmlFor="bank"
            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all h-24"
          >
            <Building2 className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">Bank</span>
          </Label>
        </div>
      </RadioGroup>

      {/* Mock Form Fields based on selection */}
      <div className="p-4 rounded-xl bg-muted/30 border border-white/5 animate-in fade-in slide-in-from-top-2">
        {selected === 'card' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Card Information</Label>
              <div className="relative">
                 <CreditCard className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                 <Input placeholder="0000 0000 0000 0000" className="pl-9 bg-background border-white/10 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Expiry</Label>
                  <Input placeholder="MM/YY" className="bg-background border-white/10 font-mono" />
               </div>
               <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CVC</Label>
                  <Input placeholder="123" className="bg-background border-white/10 font-mono" />
               </div>
            </div>
          </div>
        )}
        
        {selected === 'apple' && (
           <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <p>Apple Pay sheet will open on confirmation.</p>
           </div>
        )}

        {selected === 'bank' && (
           <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Select Account</Label>
              <select className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                 <option>Chase Checking (**** 4421)</option>
                 <option>Chase Savings (**** 9921)</option>
                 <option>Add New Account...</option>
              </select>
           </div>
        )}
      </div>
    </div>
  );
}
