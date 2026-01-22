import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Zap, Crown, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Layout } from "@/components/layout";

interface Plan {
  id: string;
  tier: 'free' | 'plus' | 'pro';
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxPools: number;
  maxPoolAmount: string;
  maxMonthlyContributions: number;
  virtualCardLimit: number;
  prioritySupport: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
}

export default function PricingPage() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  const { data: currentData, isLoading: currentLoading } = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/current", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, billingCycle }: { tier: 'plus' | 'pro'; billingCycle: 'monthly' | 'yearly' }) => {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier, billingCycle }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start checkout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to start checkout", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to cancel subscription");
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Your subscription will be cancelled at the end of the billing period" });
    },
    onError: () => {
      toast({ description: "Failed to cancel subscription", variant: "destructive" });
    },
  });

  const plans: Plan[] = plansData?.plans || [];
  const currentTier = currentData?.subscription?.tier || 'free';

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'pro':
        return <Crown className="w-6 h-6 text-purple-500" />;
      case 'plus':
        return <Zap className="w-6 h-6 text-blue-500" />;
      default:
        return <Star className="w-6 h-6 text-gray-500" />;
    }
  };

  const getPrice = (plan: Plan) => {
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    return parseFloat(price);
  };

  const formatPrice = (plan: Plan) => {
    const price = getPrice(plan);
    if (price === 0) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const getPeriodLabel = () => {
    return billingCycle === 'monthly' ? '/month' : '/year';
  };

  if (plansLoading || currentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">Unlock more features with a premium subscription</p>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('monthly')}
              data-testid="button-billing-monthly"
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('yearly')}
              data-testid="button-billing-yearly"
            >
              Yearly
              <Badge className="ml-2 bg-green-500">Save 17%</Badge>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.sort((a, b) => parseFloat(a.monthlyPrice) - parseFloat(b.monthlyPrice)).map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.tier === 'plus' ? 'border-primary shadow-lg scale-105' : ''}`}
              data-testid={`plan-${plan.tier}`}
            >
              {plan.tier === 'plus' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.tier)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{formatPrice(plan)}</span>
                  {getPrice(plan) > 0 && <span className="text-muted-foreground">{getPeriodLabel()}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{plan.maxPools} pools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Up to ${parseFloat(plan.maxPoolAmount).toLocaleString()} per pool</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{plan.maxMonthlyContributions} contributions/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{plan.virtualCardLimit} virtual card{plan.virtualCardLimit > 1 ? 's' : ''}</span>
                  </li>
                  {plan.prioritySupport && (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Priority support</span>
                    </li>
                  )}
                  {plan.advancedAnalytics && (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Advanced analytics</span>
                    </li>
                  )}
                  {plan.customBranding && (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Custom branding</span>
                    </li>
                  )}
                  {plan.apiAccess && (
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>API access</span>
                    </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                {currentTier === plan.tier ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.tier === 'free' ? (
                  <Button className="w-full" variant="outline" disabled>
                    {currentTier !== 'free' ? 'Downgrade' : 'Free Forever'}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => checkoutMutation.mutate({ tier: plan.tier as 'plus' | 'pro', billingCycle })}
                    disabled={checkoutMutation.isPending}
                    data-testid={`button-subscribe-${plan.tier}`}
                  >
                    {checkoutMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {currentTier !== 'free' ? 'Switch Plan' : 'Subscribe'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {currentData?.subscription?.stripeSubscriptionId && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || currentData.subscription.cancelAtPeriodEnd}
              data-testid="button-cancel-subscription"
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {currentData.subscription.cancelAtPeriodEnd ? 'Cancellation Pending' : 'Cancel Subscription'}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
