import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";

interface AdminTransaction {
  id: string;
  cardId: string;
  amount: string;
  merchant: string;
  category: string;
  status: string;
  notes: string;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: AdminTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchTransactions(page: number): Promise<TransactionsResponse> {
  const params = new URLSearchParams({ page: page.toString(), limit: "20" });
  const response = await fetch(`/api/admin/transactions?${params}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch transactions");
  return response.json();
}

export default function AdminTransactions() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transactions", page],
    queryFn: () => fetchTransactions(page),
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      completed: { className: "bg-green-500/10 text-green-500 border-green-500/30", label: "Completed" },
      pending: { className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", label: "Pending" },
      declined: { className: "bg-red-500/10 text-red-500 border-red-500/30", label: "Declined" },
    };
    const variant = variants[status] || variants.completed;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Transaction Monitoring</h1>
        <p className="text-muted-foreground">View all card transactions across the platform</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data?.transactions.map((tx) => (
              <Card key={tx.id} className="bg-card/50 border-white/10" data-testid={`tx-row-${tx.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tx.merchant || "Unknown Merchant"}</span>
                          {getStatusBadge(tx.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tx.category || "Uncategorized"} • {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-red-400 flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4" />
                        ${parseFloat(tx.amount).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Card: •••• {tx.cardId.slice(-4)}
                      </div>
                    </div>
                  </div>
                  {tx.notes && (
                    <div className="mt-3 pt-3 border-t border-white/5 text-sm text-muted-foreground">
                      Note: {tx.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}

          {data?.transactions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
