import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface Transaction {
  id: string;
  merchant: string;
  amount: string;
  status: string;
  createdAt: string;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
}

interface MonthlySpending {
  month: string;
  amount: number;
}

export default function CardAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["card-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/card-analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const {
    totalSpent = 0,
    transactionCount = 0,
    avgTransaction = 0,
    cardCount = 0,
    categoryBreakdown = [],
    monthlySpending = [],
    recentTransactions = [],
  } = data || {};

  return (
    <Layout>
      <div className="relative max-w-4xl mx-auto px-1 sm:px-0">
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl" data-testid="overlay-coming-soon">
          <CreditCard className="w-16 h-16 text-primary mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Virtual Cards - Coming Soon</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">We're building virtual Visa cards for your pools. Stay tuned!</p>
          <Link href="/">
            <Button data-testid="button-back-dashboard">Back to Dashboard</Button>
          </Link>
        </div>
        <div className="opacity-30 blur-[2px] pointer-events-none select-none">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Virtual Card Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track your spending and card usage</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold truncate">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                <div>
                  <p className="text-lg md:text-2xl font-bold">{transactionCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold truncate">${avgTransaction.toFixed(2)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Avg Transaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-cyan-500" />
                <div>
                  <p className="text-lg md:text-2xl font-bold">{cardCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Active Cards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No spending data yet</p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map((cat: CategoryBreakdown) => {
                    const maxAmount = Math.max(...categoryBreakdown.map((c: CategoryBreakdown) => c.amount));
                    const percentage = (cat.amount / maxAmount) * 100;
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{cat.category}</span>
                          <span className="font-medium">${cat.amount.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Spending</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlySpending.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No spending data yet</p>
              ) : (
                <div className="space-y-3">
                  {monthlySpending.map((month: MonthlySpending) => {
                    const maxAmount = Math.max(...monthlySpending.map((m: MonthlySpending) => m.amount));
                    const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                    const [year, monthNum] = month.month.split('-');
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    return (
                      <div key={month.month}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{monthName}</span>
                          <span className="font-medium">${month.amount.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx: Transaction) => (
                  <div key={tx.id} className="flex items-center justify-between p-2.5 md:p-3 bg-muted/50 rounded-lg gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{tx.merchant}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">-${parseFloat(tx.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </Layout>
  );
}
