import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, ArrowRight, CheckCircle, Share2, Copy, Mail, Phone, AlertCircle, XCircle } from "lucide-react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "@/components/theme-provider";

interface CheckoutSession {
  sessionId: string;
  status: string;
  merchant: {
    name: string;
    logo: string | null;
  };
  product: {
    title: string;
    description: string | null;
    image: string | null;
  };
  amount: string;
  collectedAmount: string;
  percentComplete: number;
  collectionDeadline: string;
  poolId: string | null;
  contributorCount: number;
}

export default function ChipInPayCheckout() {
  const [, params] = useRoute("/chipinpay/checkout/:sessionId");
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [myContribution, setMyContribution] = useState("");

  const sessionId = params?.sessionId;

  const { data: session, isLoading, error } = useQuery<CheckoutSession>({
    queryKey: ["chipinpaySession", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/chipinpay/checkout/${sessionId}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load checkout session");
      }
      return res.json();
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'collecting' ? 5000 : false;
    },
  });

  const startCheckoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chipinpay/checkout/${sessionId}/start`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start checkout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chipinpaySession", sessionId] });
      toast({ description: "Pool created! Now invite friends to contribute." });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to start checkout", variant: "destructive" });
    },
  });

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ description: "Link copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const timeRemaining = formatDistanceToNow(new Date(session.collectionDeadline), { addSuffix: true });
  const isExpired = new Date(session.collectionDeadline) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
            <Users className="w-4 h-4" /> ChipInPay
          </div>
          <h1 className="text-2xl font-display font-bold">Split This Purchase</h1>
          <p className="text-muted-foreground">Powered by ChipInPool</p>
        </div>

        <Card className="mb-6 overflow-hidden">
          {session.product.image && (
            <div className="aspect-video bg-muted">
              <img 
                src={session.product.image} 
                alt={session.product.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {session.merchant.logo && (
                <img src={session.merchant.logo} alt={session.merchant.name} className="w-5 h-5 rounded" />
              )}
              <span>{session.merchant.name}</span>
            </div>
            <CardTitle>{session.product.title}</CardTitle>
            {session.product.description && (
              <CardDescription>{session.product.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">${parseFloat(session.amount).toFixed(2)}</span>
              </div>

              {session.status !== 'pending' && (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Collected</span>
                      <span className="font-medium">${parseFloat(session.collectedAmount).toFixed(2)} ({session.percentComplete}%)</span>
                    </div>
                    <Progress value={session.percentComplete} className="h-3" />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{session.contributorCount} contributors</span>
                    </div>
                    <div className={`flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                      <Clock className="w-4 h-4" />
                      <span>{isExpired ? 'Expired' : timeRemaining}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {session.status === 'pending' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {!isAuthenticated ? (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Sign in to start splitting this purchase with friends</p>
                  <Link href={`/login?redirect=/chipinpay/checkout/${sessionId}`}>
                    <Button className="w-full" data-testid="button-login">
                      Sign In to Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    Start a pool to split this purchase with friends. Everyone chips in, and once fully funded, the payment goes through!
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => startCheckoutMutation.mutate()}
                    disabled={startCheckoutMutation.isPending}
                    data-testid="button-start-pool"
                  >
                    {startCheckoutMutation.isPending ? "Creating Pool..." : "Start Pool & Invite Friends"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {session.status === 'collecting' && session.poolId && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Contribute</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Your Contribution</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      className="pl-7"
                      value={myContribution}
                      onChange={(e) => setMyContribution(e.target.value)}
                      data-testid="input-contribution"
                    />
                  </div>
                </div>
                <Link href={`/pool/${session.poolId}`}>
                  <Button className="w-full" data-testid="button-contribute">
                    Go to Pool <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Invite Friends</CardTitle>
                <CardDescription>Share this link to invite friends to chip in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={copyShareLink} data-testid="button-copy-link">
                  <Copy className="w-4 h-4 mr-2" /> Copy Share Link
                </Button>
                <Link href={`/pool/${session.poolId}`}>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-pool">
                    <Users className="w-4 h-4 mr-2" /> View Pool & Invite from There
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {session.status === 'completed' && (
          <Card className="mb-6 border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Payment Complete!</h2>
              <p className="text-muted-foreground">
                The pool was fully funded and the merchant has been paid.
              </p>
            </CardContent>
          </Card>
        )}

        {(session.status === 'expired' || session.status === 'cancelled') && (
          <Card className="mb-6 border-red-500/50 bg-red-500/5">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {session.status === 'expired' ? 'Session Expired' : 'Session Cancelled'}
              </h2>
              <p className="text-muted-foreground">
                {session.status === 'expired' 
                  ? "The collection deadline passed before the pool was fully funded. Any contributions will be refunded."
                  : "This checkout session was cancelled."
                }
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-2">Secure payment processing by ChipInPool</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/faq" className="hover:underline">FAQ</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
