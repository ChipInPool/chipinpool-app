import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, CheckCircle, Clock, XCircle, ExternalLink, Store, Plus, ArrowLeft, BarChart3, Key, DollarSign, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Merchant {
  id: string;
  userId: string;
  companyName: string;
  website: string;
  businessType: string;
  description: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: 'pending' | 'approved' | 'suspended';
  feePercent: string;
  totalVolume: string;
  totalFees: string;
  totalPayouts: string;
  pendingBalance: string;
  webhookUrl: string | null;
  createdAt: string;
}

interface MerchantDetails {
  merchant: Merchant;
  user: { id: string; username: string; email: string; firstName: string; lastName: string } | null;
  analytics: {
    totalSessions: number;
    completedSessions: number;
    pendingSessions: number;
    cancelledSessions: number;
    totalVolume: string;
    totalFees: string;
    totalPayouts: string;
    pendingBalance: string;
    conversionRate: string;
  };
  recentSessions: any[];
  apiKeys: { id: string; name: string; keyPrefix: string; isActive: boolean; createdAt: string; lastUsedAt: string | null }[];
  payouts: any[];
}

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function AdminMerchants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [createForm, setCreateForm] = useState({
    userId: "",
    companyName: "",
    website: "",
    businessType: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    webhookUrl: "",
    status: "approved" as "pending" | "approved" | "suspended",
  });
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

  const { data: merchantDetails, isLoading: isLoadingDetails } = useQuery<MerchantDetails>({
    queryKey: ["admin", "merchant", selectedMerchantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/merchants/${selectedMerchantId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch merchant details");
      return res.json();
    },
    enabled: !!selectedMerchantId,
  });

  // Query users for merchant assignment dropdown
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["admin", "users", userSearch],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: createDialogOpen,
  });

  // Filter out users that already have merchant accounts
  const availableUsers = (usersData?.users || []).filter(
    (user) => !merchants.some((m) => m.userId === user.id)
  );

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
      queryClient.invalidateQueries({ queryKey: ["admin", "merchant", selectedMerchantId] });
      toast({ description: "Merchant status updated" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  const createMerchantMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const res = await fetch("/api/admin/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create merchant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
      toast({ description: "Merchant created successfully" });
      setCreateDialogOpen(false);
      setUserSearch("");
      setCreateForm({
        userId: "",
        companyName: "",
        website: "",
        businessType: "",
        description: "",
        contactEmail: "",
        contactPhone: "",
        webhookUrl: "",
        status: "approved",
      });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to create merchant", variant: "destructive" });
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

  // Merchant Detail View
  if (selectedMerchantId) {
    if (isLoadingDetails) {
      return (
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      );
    }

    if (!merchantDetails) {
      return (
        <AdminLayout>
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Merchant Not Found</h2>
            <Button variant="outline" onClick={() => setSelectedMerchantId(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Merchants
            </Button>
          </div>
        </AdminLayout>
      );
    }

    const { merchant, user, analytics, recentSessions, apiKeys, payouts } = merchantDetails;

    return (
      <AdminLayout>
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setSelectedMerchantId(null)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Merchants
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                {merchant.companyName}
                {getStatusBadge(merchant.status)}
              </h1>
              <p className="text-muted-foreground">{merchant.businessType} • {merchant.contactEmail}</p>
              {user && (
                <p className="text-sm text-muted-foreground">
                  Owner: {user.firstName} {user.lastName} (@{user.username})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {merchant.status === 'pending' && (
                <Button
                  onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: 'approved' })}
                  disabled={updateStatusMutation.isPending}
                >
                  Approve
                </Button>
              )}
              {merchant.status === 'approved' && (
                <Button
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: 'suspended' })}
                  disabled={updateStatusMutation.isPending}
                >
                  Suspend
                </Button>
              )}
              {merchant.status === 'suspended' && (
                <Button
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: 'approved' })}
                  disabled={updateStatusMutation.isPending}
                >
                  Unsuspend
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">${parseFloat(analytics.totalVolume).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">${parseFloat(analytics.totalFees).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Fees ({merchant.feePercent}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.conversionRate}%</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Merchant Details */}
          <Card>
            <CardHeader>
              <CardTitle>Merchant Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Website</span>
                <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  {merchant.website} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact Email</span>
                <span>{merchant.contactEmail}</span>
              </div>
              {merchant.contactPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact Phone</span>
                  <span>{merchant.contactPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee Percentage</span>
                <span>{merchant.feePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Balance</span>
                <span>${parseFloat(analytics.pendingBalance).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Payouts</span>
                <span>${parseFloat(analytics.totalPayouts).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span>{format(new Date(merchant.createdAt), "MMM d, yyyy")}</span>
              </div>
              {merchant.description && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p className="text-sm">{merchant.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" /> API Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No API keys created</p>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}...</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {key.lastUsedAt ? `Last used ${format(new Date(key.lastUsedAt), "MMM d")}` : "Never used"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Statistics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Session Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-green-600">{analytics.completedSessions}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{analytics.pendingSessions}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-red-600">{analytics.cancelledSessions}</p>
                <p className="text-sm text-muted-foreground">Cancelled/Expired</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{analytics.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Checkout Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{session.description || session.externalOrderId}</p>
                      <p className="text-xs text-muted-foreground">
                        ${parseFloat(session.amount).toLocaleString()} • {format(new Date(session.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <Badge variant={session.status === 'completed' ? 'default' : session.status === 'pending' ? 'outline' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </AdminLayout>
    );
  }

  // Merchants List View
  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Merchants</h1>
          <p className="text-muted-foreground">Manage ChipInPay merchant accounts</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-merchant">
              <Plus className="w-4 h-4 mr-2" /> Create Merchant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Merchant Account</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!createForm.userId) {
                  toast({ description: "Please select a user to assign the merchant account", variant: "destructive" });
                  return;
                }
                createMerchantMutation.mutate(createForm);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="userId">Assign to User *</Label>
                <Input
                  placeholder="Search users by name, email, or username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="mb-2"
                  data-testid="input-user-search"
                />
                <select
                  id="userId"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  required
                  data-testid="select-user"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} (@{user.username}) - {user.email}
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && userSearch && (
                  <p className="text-xs text-muted-foreground mt-1">No users found or all users already have merchant accounts</p>
                )}
              </div>
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                  required
                  data-testid="input-company-name"
                />
              </div>
              <div>
                <Label htmlFor="website">Website URL *</Label>
                <Input
                  id="website"
                  type="url"
                  value={createForm.website}
                  onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                  placeholder="https://example.com"
                  required
                  data-testid="input-website"
                />
              </div>
              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <Input
                  id="businessType"
                  value={createForm.businessType}
                  onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })}
                  placeholder="e-commerce, SaaS, retail..."
                  required
                  data-testid="input-business-type"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={createForm.contactEmail}
                  onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                  required
                  data-testid="input-contact-email"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={createForm.contactPhone}
                  onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                  data-testid="input-contact-phone"
                />
              </div>
              <div>
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={createForm.webhookUrl}
                  onChange={(e) => setCreateForm({ ...createForm, webhookUrl: e.target.value })}
                  placeholder="https://example.com/webhooks/chipinpay"
                  data-testid="input-webhook-url"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={2}
                  data-testid="input-description"
                />
              </div>
              <div>
                <Label htmlFor="status">Initial Status</Label>
                <select
                  id="status"
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  data-testid="select-status"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMerchantMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMerchantMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Merchant
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMerchantId(merchant.id)}
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      {merchant.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">${parseFloat(merchant.totalVolume).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Volume</p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
