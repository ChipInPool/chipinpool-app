import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, Clock, XCircle, ExternalLink, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Merchant {
  id: string;
  userId: string;
  companyName: string;
  website: string;
  businessType: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'suspended';
  feePercent: string;
  totalVolume: string;
  totalFees: string;
  pendingBalance: string;
  createdAt: string;
}

export default function AdminMerchants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: merchants = [], isLoading, error } = useQuery<Merchant[]>({
    queryKey: ["admin", "merchants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/merchants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch merchants");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/merchants/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update merchant status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      toast({ description: "Merchant status updated" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredMerchants = merchants.filter((merchant) => {
    const matchesSearch = 
      merchant.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Merchants</h2>
          <p className="text-muted-foreground">Failed to load merchant data.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Merchants</h1>
        <p className="text-muted-foreground">Manage ChipInPay merchant accounts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{merchants.length}</p>
                <p className="text-sm text-muted-foreground">Total Merchants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{merchants.filter(m => m.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{merchants.filter(m => m.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{merchants.filter(m => m.status === 'suspended').length}</p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle>All Merchants</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-merchants"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMerchants.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No merchants found</p>
          ) : (
            <div className="space-y-4">
              {filteredMerchants.map((merchant) => (
                <div
                  key={merchant.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`merchant-${merchant.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{merchant.companyName}</p>
                      {getStatusBadge(merchant.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{merchant.contactEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {merchant.businessType} • Fee: {merchant.feePercent}% • Registered {format(new Date(merchant.createdAt), "MMM d, yyyy")}
                    </p>
                    <a
                      href={merchant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      {merchant.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">${parseFloat(merchant.totalVolume).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Volume</p>
                    </div>
                    <div className="flex gap-2">
                      {merchant.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: 'approved' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-approve-${merchant.id}`}
                        >
                          Approve
                        </Button>
                      )}
                      {merchant.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: 'suspended' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-suspend-${merchant.id}`}
                        >
                          Suspend
                        </Button>
                      )}
                      {merchant.status === 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: 'approved' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-unsuspend-${merchant.id}`}
                        >
                          Unsuspend
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
