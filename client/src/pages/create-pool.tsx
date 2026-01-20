import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gift, Plane, ShoppingBag, Calendar, ImagePlus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CreatePool() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Pool Created!",
        description: "Your pool is ready. Invite friends to chip in.",
      });
      setLocation("/");
    }, 1500);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link href="/">
           <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
           </a>
        </Link>
        
        <div className="mb-8">
           <h1 className="text-3xl font-display font-bold mb-2">Create a New Pool</h1>
           <p className="text-muted-foreground">Set up a pool to split costs for a gift, trip, or purchase.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Basics */}
          <div className="space-y-6">
             <div className="space-y-4">
                <Label htmlFor="title" className="text-base">What are you pooling for?</Label>
                <Input id="title" placeholder="e.g. Sarah's Birthday, Bali Trip, Office Coffee Machine" className="h-12 text-lg bg-white/5 border-white/10 focus:border-primary/50" required />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <Label>Category</Label>
                   <Select required>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10">
                         <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="gift"><div className="flex items-center gap-2"><Gift className="w-4 h-4" /> Gift</div></SelectItem>
                         <SelectItem value="trip"><div className="flex items-center gap-2"><Plane className="w-4 h-4" /> Trip</div></SelectItem>
                         <SelectItem value="purchase"><div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Purchase</div></SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label htmlFor="amount">Target Amount ($)</Label>
                   <Input id="amount" type="number" placeholder="0.00" className="h-12 bg-white/5 border-white/10 font-mono" required />
                </div>
             </div>

             <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" placeholder="Tell people what this is for..." className="min-h-[100px] bg-white/5 border-white/10 resize-none" />
             </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Step 2: Details */}
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <Label>Deadline</Label>
                   <div className="relative">
                      <Input type="date" className="h-12 bg-white/5 border-white/10 pl-10" required />
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
             <Button type="submit" size="lg" className="w-full md:w-auto font-semibold shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? "Creating Pool..." : "Create Pool"}
             </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
