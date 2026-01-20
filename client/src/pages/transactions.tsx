import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Receipt, Search, Filter, Calendar, CreditCard, Store, ExternalLink, Download, ChevronDown, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  merchant: string;
  amount: string;
  status: string;
  createdAt: string;
  poolId?: string;
  poolTitle?: string;
}

export default function Transactions() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.transactionHistory,
    queryFn: api.users.getTransactionHistory,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const transactions: Transaction[] = data?.transactions || [];

  const filteredTransactions = transactions
    .filter((t) => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          t.merchant.toLowerCase().includes(search) ||
          t.poolTitle?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .filter((t) => {
      if (statusFilter === "all") return true;
      return t.status === statusFilter;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "highest":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "lowest":
          return parseFloat(a.amount) - parseFloat(b.amount);
        default:
          return 0;
      }
    });

  const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-white/5 text-muted-foreground border-white/10";
    }
  };

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-32 rounded-xl mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/profile">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-display font-bold">Transaction History</h1>
          </div>
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Failed to Load Transactions</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {(error as Error)?.message || "Something went wrong. Please try again later."}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/profile">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Transaction History</h1>
              <p className="text-sm text-muted-foreground">View all your card spending</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-white/10" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Transactions</span>
            </div>
            <div className="text-3xl font-display font-bold">{transactions.length}</div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/20">
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Total Spent</span>
            </div>
            <div className="text-3xl font-display font-bold">${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Store className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-muted-foreground">Unique Merchants</span>
            </div>
            <div className="text-3xl font-display font-bold">
              {new Set(transactions.map(t => t.merchant)).size}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by merchant or pool..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="select-status"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="select-sort"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Transactions Yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No transactions match your filters."
                  : "When you spend from your pool virtual cards, your transactions will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 hover:bg-white/[0.02] transition-colors"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl">
                        <Store className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold">{transaction.merchant}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {transaction.poolTitle && (
                            <>
                              <Link
                                href={`/pool/${transaction.poolId}`}
                                className="text-primary hover:underline flex items-center gap-1"
                                data-testid={`link-pool-${transaction.id}`}
                              >
                                {transaction.poolTitle}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                              <span>•</span>
                            </>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-lg">
                        -${parseFloat(transaction.amount).toFixed(2)}
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
