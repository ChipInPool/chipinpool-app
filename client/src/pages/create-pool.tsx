import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gift, Plane, ShoppingBag, Calendar, ImagePlus, RefreshCw, Loader2, Sparkles, PartyPopper, Home, GraduationCap, Heart, Coffee } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function CreatePool() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");

  const createPoolMutation = useMutation({
    mutationFn: (data: any) => api.pools.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      toast({
        title: "Pool Created!",
        description: "Your pool is ready. Invite friends to chip in.",
      });
      setLocation(`/pool/${data.pool.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create pool",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryMap: Record<string, string> = {
      gift: "Gift",
      trip: "Trip",
      purchase: "Purchase",
      recurring: "Recurring",
      event: "Event",
      other: "Other",
    };

    createPoolMutation.mutate({
      title,
      category: categoryMap[category] || "Other",
      targetAmount,
      description,
      deadline: new Date(deadline).toISOString(),
      isRecurring,
      frequency: isRecurring ? frequency : null,
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Create a New Pool</h1>
          <p className="text-muted-foreground">Set up a pool to split costs for a gift, trip, or purchase.</p>
        </div>

        <div className="mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Quick Templates
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: PartyPopper, label: "Birthday Gift", category: "gift", amount: "100", desc: "Chip in for a birthday present" },
              { icon: Plane, label: "Group Trip", category: "trip", amount: "500", desc: "Pool funds for travel expenses" },
              { icon: Home, label: "Housewarming", category: "gift", amount: "200", desc: "Welcome gift for a new home" },
              { icon: GraduationCap, label: "Graduation", category: "gift", amount: "150", desc: "Celebrate a graduate" },
              { icon: Heart, label: "Wedding Gift", category: "gift", amount: "300", desc: "Gift for the newlyweds" },
              { icon: Coffee, label: "Office Fund", category: "recurring", amount: "50", desc: "Monthly office snacks/coffee" },
              { icon: RefreshCw, label: "Rent Split", category: "recurring", amount: "1000", desc: "Monthly rent contributions" },
              { icon: RefreshCw, label: "Utilities", category: "recurring", amount: "150", desc: "Monthly utility bills" },
              { icon: RefreshCw, label: "Subscription", category: "recurring", amount: "30", desc: "Shared streaming/service" },
            ].map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => {
                  setCategory(template.category);
                  setTargetAmount(template.amount);
                  setDescription(template.desc);
                  setIsRecurring(template.category === "recurring");
                }}
                className="p-4 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                data-testid={`template-${template.label.toLowerCase().replace(' ', '-')}`}
              >
                <template.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                <div className="font-medium text-sm">{template.label}</div>
                <div className="text-xs text-muted-foreground">${template.amount}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="title" className="text-base">What are you pooling for?</Label>
              <Input 
                id="title" 
                placeholder="e.g. Sarah's Birthday, Bali Trip, Office Coffee Machine" 
                className="h-12 text-lg bg-white/5 border-white/10 focus:border-primary/50" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required 
                data-testid="input-pool-title"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select required onValueChange={(val) => { setCategory(val); setIsRecurring(val === 'recurring'); }}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gift"><div className="flex items-center gap-2"><Gift className="w-4 h-4" /> Gift</div></SelectItem>
                    <SelectItem value="trip"><div className="flex items-center gap-2"><Plane className="w-4 h-4" /> Trip</div></SelectItem>
                    <SelectItem value="purchase"><div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Purchase</div></SelectItem>
                    <SelectItem value="recurring"><div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Recurring / Bill</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Target Amount ($)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 bg-white/5 border-white/10 font-mono" 
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required 
                  data-testid="input-target-amount"
                />
              </div>
            </div>

            {isRecurring && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                <h3 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Recurring Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select defaultValue="monthly" onValueChange={setFrequency}>
                      <SelectTrigger className="bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Repeat Until</Label>
                    <Select defaultValue="cancel">
                      <SelectTrigger className="bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cancel">I cancel it</SelectItem>
                        <SelectItem value="date">Specific Date</SelectItem>
                        <SelectItem value="amount">Target Reached</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Tell people what this is for..." 
                className="min-h-[100px] bg-white/5 border-white/10 resize-none" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-description"
              />
            </div>
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <div className="relative">
                  <Input 
                    type="date" 
                    className="h-12 bg-white/5 border-white/10 pl-10" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required 
                    data-testid="input-deadline"
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="h-12 border border-dashed border-white/20 rounded-md flex items-center justify-center text-sm text-muted-foreground hover:bg-white/5 cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4 mr-2" /> Upload or Generate
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setLocation("/")}>Cancel</Button>
            <Button 
              type="submit" 
              size="lg" 
              className="w-full md:w-auto font-semibold shadow-lg shadow-primary/20" 
              disabled={createPoolMutation.isPending}
              data-testid="button-create-pool"
            >
              {createPoolMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Pool...</> : "Create Pool"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
