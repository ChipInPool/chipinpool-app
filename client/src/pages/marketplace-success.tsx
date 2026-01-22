import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link, useSearch } from "wouter";

export default function MarketplaceSuccess() {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="bg-white/[0.02] border-white/5 text-center">
          <CardHeader className="pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Thank you for your purchase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Your order has been confirmed and the merchant has been notified.
              You should receive a confirmation email shortly.
            </p>
            
            {sessionId && (
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-xs text-muted-foreground">Order Reference</p>
                <p className="font-mono text-sm break-all">{sessionId}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link href="/marketplace">
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
