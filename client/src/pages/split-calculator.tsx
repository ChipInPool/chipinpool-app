import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calculator, Plus, Trash2, Users, DollarSign, Percent, Copy, Check, Wallet } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  name: string;
  amount: number;
}

export default function SplitCalculator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [totalAmount, setTotalAmount] = useState("");
  const [people, setPeople] = useState<Person[]>([
    { id: "1", name: "", amount: 0 },
    { id: "2", name: "", amount: 0 },
  ]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [tipPercent, setTipPercent] = useState(0);
  const [copied, setCopied] = useState(false);

  const total = parseFloat(totalAmount) || 0;
  const tipAmount = total * (tipPercent / 100);
  const totalWithTip = total + tipAmount;
  const equalSplit = people.length > 0 ? totalWithTip / people.length : 0;

  const addPerson = () => {
    setPeople([...people, { id: Date.now().toString(), name: "", amount: 0 }]);
  };

  const removePerson = (id: string) => {
    if (people.length > 2) {
      setPeople(people.filter(p => p.id !== id));
    }
  };

  const updatePersonName = (id: string, name: string) => {
    setPeople(people.map(p => p.id === id ? { ...p, name } : p));
  };

  const updatePersonAmount = (id: string, amount: string) => {
    setPeople(people.map(p => p.id === id ? { ...p, amount: parseFloat(amount) || 0 } : p));
  };

  const customTotal = people.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalWithTip - customTotal;

  const copySummary = () => {
    const lines = people.map(p => {
      const amount = splitType === 'equal' ? equalSplit : p.amount;
      return `${p.name || 'Person'}: $${amount.toFixed(2)}`;
    });
    const summary = `Bill Split Summary\n${'─'.repeat(20)}\nTotal: $${total.toFixed(2)}\nTip (${tipPercent}%): $${tipAmount.toFixed(2)}\nGrand Total: $${totalWithTip.toFixed(2)}\n${'─'.repeat(20)}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ description: "Summary copied to clipboard" });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Split Calculator</h1>
            <p className="text-sm text-muted-foreground">Easily split bills with friends</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-green-400" /> Bill Amount
            </h3>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="pl-8 text-2xl h-14 bg-white/5 border-white/10"
                data-testid="input-total"
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Percent className="w-4 h-4 text-blue-400" /> Add Tip
            </h3>
            <div className="flex gap-2 flex-wrap">
              {[0, 15, 18, 20, 25].map(percent => (
                <Button
                  key={percent}
                  variant={tipPercent === percent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipPercent(percent)}
                  className={tipPercent !== percent ? 'border-white/10' : ''}
                  data-testid={`tip-${percent}`}
                >
                  {percent}%
                </Button>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Custom"
                  value={tipPercent > 0 && ![0, 15, 18, 20, 25].includes(tipPercent) ? tipPercent : ''}
                  onChange={(e) => setTipPercent(parseFloat(e.target.value) || 0)}
                  className="w-20 h-9 bg-white/5 border-white/10"
                  data-testid="input-custom-tip"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            {tipPercent > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                Tip: <span className="text-green-400 font-semibold">${tipAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Split Between
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={splitType === 'equal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSplitType('equal')}
                  className={splitType !== 'equal' ? 'border-white/10' : ''}
                  data-testid="split-equal"
                >
                  Equal Split
                </Button>
                <Button
                  variant={splitType === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSplitType('custom')}
                  className={splitType !== 'custom' ? 'border-white/10' : ''}
                  data-testid="split-custom"
                >
                  Custom
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {people.map((person, i) => (
                <div key={person.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <Input
                    placeholder={`Person ${i + 1}`}
                    value={person.name}
                    onChange={(e) => updatePersonName(person.id, e.target.value)}
                    className="flex-1 bg-white/5 border-white/10"
                    data-testid={`input-person-${i}`}
                  />
                  {splitType === 'equal' ? (
                    <div className="w-24 text-right font-display font-bold text-primary">
                      ${equalSplit.toFixed(2)}
                    </div>
                  ) : (
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={person.amount || ''}
                        onChange={(e) => updatePersonAmount(person.id, e.target.value)}
                        className="pl-6 bg-white/5 border-white/10"
                        data-testid={`input-amount-${i}`}
                      />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePerson(person.id)}
                    disabled={people.length <= 2}
                    className="text-muted-foreground hover:text-red-400"
                    data-testid={`remove-person-${i}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 border-white/10 border-dashed"
              onClick={addPerson}
              data-testid="button-add-person"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Person
            </Button>

            {splitType === 'custom' && (
              <div className={`mt-4 p-3 rounded-lg ${Math.abs(remaining) < 0.01 ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                <div className="flex justify-between text-sm">
                  <span>Remaining to assign:</span>
                  <span className={`font-semibold ${Math.abs(remaining) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                    ${remaining.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" /> Summary
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySummary}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-copy"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip ({tipPercent}%)</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${totalWithTip.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Per person ({people.length})</span>
                <span>${equalSplit.toFixed(2)}</span>
              </div>
            </div>

            {total > 0 && (
              <>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium mb-2">Individual Amounts</h4>
                  <div className="space-y-1">
                    {people.map((person, i) => {
                      const amount = splitType === 'equal' ? equalSplit : person.amount;
                      return (
                        <div key={person.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{person.name || `Person ${i + 1}`}</span>
                          <span className="font-semibold text-primary">${amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => {
                    const breakdown = people.map((p, i) => {
                      const amt = splitType === 'equal' ? equalSplit : p.amount;
                      return `${p.name || `Person ${i + 1}`}: $${amt.toFixed(2)}`;
                    }).join('\n');
                    
                    const params = new URLSearchParams({
                      title: `Split: $${totalWithTip.toFixed(2)}`,
                      amount: totalWithTip.toFixed(2),
                      participants: people.length.toString(),
                      description: `Bill split breakdown:\n${breakdown}`,
                    });
                    setLocation(`/create?${params.toString()}`);
                  }}
                  data-testid="button-create-pool"
                >
                  <Wallet className="w-4 h-4 mr-2" /> Create Pool from Split
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
