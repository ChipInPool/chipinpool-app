import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Copy, Loader2, Share2, XCircle, DollarSign, AtSign } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";

interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

function PaymentForm({ 
  username, 
  user, 
  prefillAmount 
}: { 
  username: string;
  user: UserProfile;
  prefillAmount: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [amount, setAmount] = useState(prefillAmount || "");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/pay/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          message: message || undefined,
          guestEmail: email || undefined,
          senderName: senderName || undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create payment");
      }
      return res.json();
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const res = await fetch(`/api/pay/${username}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to confirm payment");
      }
      return res.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast({ description: "Payment system not ready", variant: "destructive" });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast({ description: "Card element not found", variant: "destructive" });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      toast({ description: "Please enter a valid amount (min $1)", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const { clientSecret, paymentIntentId } = await createPaymentMutation.mutateAsync();
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: email || undefined,
            name: senderName || undefined,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Payment failed");
      }

      if (paymentIntent?.status === "succeeded") {
        await confirmPaymentMutation.mutateAsync(paymentIntentId);
        setPaymentSuccess(true);
        toast({ description: `Successfully sent $${parsedAmount.toFixed(2)} to @${user.username}` });
      }
    } catch (err: any) {
      toast({ description: err.message || "Payment failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ description: "Link copied to clipboard" });
  };

  if (paymentSuccess) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Payment Sent!</h2>
          <p className="text-muted-foreground mb-4">
            You successfully sent ${parseFloat(amount).toFixed(2)} to @{user.username}
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={copyShareLink} data-testid="button-share">
              <Share2 className="w-4 h-4 mr-2" /> Share this link
            </Button>
            <Link href="/">
              <Button className="w-full" data-testid="button-home">Go to ChipInPool</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                max="10000"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isProcessing}
                data-testid="input-amount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              disabled={isProcessing}
              data-testid="input-message"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              disabled={isProcessing}
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Your Email (for receipt)</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isProcessing}
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label>Card Details</Label>
            <div className="border rounded-md p-3 bg-background">
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: 'inherit',
                      '::placeholder': {
                        color: '#a0aec0',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isProcessing || !stripe}
        data-testid="button-pay"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
          </>
        ) : (
          <>
            Pay ${amount || '0.00'}
          </>
        )}
      </Button>
    </form>
  );
}

export default function PayMe() {
  const [, params] = useRoute("/@:username/:amount?");
  const { toast } = useToast();
  
  const username = params?.username?.toLowerCase().replace(/^@/, '') || '';
  const prefillAmount = params?.amount || null;

  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["payMeUser", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/username/${username}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "User not found");
      }
      return res.json();
    },
    enabled: !!username,
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

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {(error as Error)?.message || `@${username} doesn't exist`}
            </p>
            <Link href="/">
              <Button data-testid="button-home">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <DollarSign className="w-4 h-4" /> Pay Me Back
          </div>
          
          <Avatar className="w-20 h-20 mx-auto mb-4 border-2 border-primary/20">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="text-2xl">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-display font-bold mb-1" data-testid="text-recipient-name">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-1" data-testid="text-recipient-username">
            <AtSign className="w-4 h-4" />{user.username}
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Share this link</span>
              <Button variant="ghost" size="sm" onClick={copyShareLink} data-testid="button-copy-link">
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Elements stripe={getStripePromise()}>
          <PaymentForm 
            username={username} 
            user={user}
            prefillAmount={prefillAmount}
          />
        </Elements>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <p className="mb-2">Secure payment powered by ChipInPool</p>
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
