import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Key, Plus, Trash2, Copy, Eye, EyeOff, ExternalLink, CheckCircle, Clock, XCircle, DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Merchant {
  id: string;
  companyName: string;
  website: string;
  businessType: string;
  status: 'pending' | 'approved' | 'suspended';
  feePercent: string;
  totalVolume: string;
  totalFees: string;
  pendingBalance: string;
  webhookUrl: string | null;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CheckoutSession {
  id: string;
  externalOrderId: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  collectedAmount: string;
  productTitle: string;
  status: string;
  collectionDeadline: string;
  createdAt: string;
}

export default function MerchantDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  const { data: merchant, isLoading: merchantLoading } = useQuery<Merchant>({
    queryKey: ["merchant"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/account", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load merchant account");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["merchantApiKeys"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/api-keys", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load API keys");
      return res.json();
    },
    enabled: isAuthenticated && !!merchant,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<CheckoutSession[]>({
    queryKey: ["merchantSessions"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
    enabled: isAuthenticated && !!merchant,
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/merchant/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to request payout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["merchant"] });
      queryClient.invalidateQueries({ queryKey: ["merchantPayouts"] });
      toast({ description: data.message });
    },
    onError: (err: any) => {
      toast({ description: err.message, variant: "destructive" });
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/merchant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      return res.json();
    },
    onSuccess: (data) => {
      setShowNewKey(data.key);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["merchantApiKeys"] });
      toast({ description: "API key created successfully" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to create API key", variant: "destructive" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/merchant/api-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantApiKeys"] });
      toast({ description: "API key revoked" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to revoke API key", variant: "destructive" });
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/merchant/webhook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ webhookUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to update webhook URL");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant"] });
      toast({ description: "Webhook URL updated" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to update webhook", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied to clipboard" });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || merchantLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!merchant) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Link href="/api-docs">
            <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to API Docs
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Become a ChipInPay Merchant</CardTitle>
              <CardDescription>
                Integrate group payments into your checkout flow and let customers split purchases with friends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterMerchantForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["merchant"] })} />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'collecting':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><TrendingUp className="w-3 h-3 mr-1" /> Collecting</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-gray-600 border-gray-600"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 md:mb-6">
          <div>
            <Link href="/api-docs">
              <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to API Docs
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Merchant Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">{merchant.companyName}</p>
          </div>
          {getStatusBadge(merchant.status)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-lg md:text-xl font-bold truncate">${parseFloat(merchant.totalVolume).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">Fees Paid</p>
                  <p className="text-lg md:text-xl font-bold truncate">${parseFloat(merchant.totalFees).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground">Pending Balance</p>
                    <p className="text-lg md:text-xl font-bold truncate">${parseFloat(merchant.pendingBalance).toLocaleString()}</p>
                  </div>
                </div>
                {parseFloat(merchant.pendingBalance) >= 10 && merchant.status === 'approved' && (
                  <Button 
                    size="sm"
                    onClick={() => requestPayoutMutation.mutate()}
                    disabled={requestPayoutMutation.isPending}
                    data-testid="button-request-payout"
                  >
                    {requestPayoutMutation.isPending ? "Processing..." : "Request Payout"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {merchant.status === 'pending' && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">Account Pending Approval</p>
                  <p className="text-sm text-muted-foreground">Your merchant account is under review. You'll be able to create API keys and process payments once approved.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList>
            <TabsTrigger value="keys" data-testid="tab-keys">API Keys</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Checkout Sessions</TabsTrigger>
            <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="keys">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API keys for accessing the ChipInPay API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {showNewKey && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-2">New API Key Created</p>
                    <p className="text-xs text-muted-foreground mb-2">Copy this key now. You won't be able to see it again.</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-sm font-mono">{showNewKey}</code>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(showNewKey)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {merchant.status === 'approved' && (
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Production Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        data-testid="input-key-name"
                      />
                    </div>
                    <Button
                      onClick={() => createKeyMutation.mutate(newKeyName)}
                      disabled={!newKeyName || createKeyMutation.isPending}
                      data-testid="button-create-key"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Key
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {keysLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : apiKeys.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No API keys yet</p>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border rounded-lg gap-2" data-testid={`api-key-${key.id}`}>
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{key.prefix}_••••••••</p>
                          <p className="text-xs text-muted-foreground">
                            Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                            {key.lastUsedAt && ` • Last used ${format(new Date(key.lastUsedAt), "MMM d, yyyy")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!key.isActive && <Badge variant="secondary">Revoked</Badge>}
                          {key.isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => revokeKeyMutation.mutate(key.id)}
                              data-testid={`button-revoke-${key.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Checkout Sessions</CardTitle>
                <CardDescription>View and manage your ChipInPay checkout sessions.</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : sessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No checkout sessions yet</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border rounded-lg gap-2" data-testid={`session-${session.id}`}>
                        <div>
                          <p className="font-medium">{session.productTitle}</p>
                          <p className="text-sm text-muted-foreground">Order: {session.externalOrderId}</p>
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(session.collectedAmount).toFixed(2)} / ${parseFloat(session.amount).toFixed(2)} collected
                            • Fee: ${parseFloat(session.feeAmount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Deadline: {format(new Date(session.collectionDeadline), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getSessionStatusBadge(session.status)}
                          <p className="text-sm font-medium">${parseFloat(session.netAmount).toFixed(2)} net</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>Configure webhooks to receive real-time updates about your checkout sessions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhookUrl"
                      placeholder="https://your-server.com/webhooks/chipinpay"
                      value={webhookUrl || merchant.webhookUrl || ""}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      data-testid="input-webhook-url"
                    />
                    <Button
                      onClick={() => updateWebhookMutation.mutate(webhookUrl)}
                      disabled={!webhookUrl || updateWebhookMutation.isPending}
                      data-testid="button-update-webhook"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium mb-2">Webhook Events</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><code className="text-xs">session.collecting</code> - Customer started the pool</li>
                    <li><code className="text-xs">contribution.received</code> - New contribution to the pool</li>
                    <li><code className="text-xs">session.completed</code> - Pool fully funded, payment complete</li>
                    <li><code className="text-xs">session.expired</code> - Collection deadline passed without full funding</li>
                    <li><code className="text-xs">session.cancelled</code> - Session was cancelled</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium mb-2">Webhook Signature Verification</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Each webhook includes a signature header for verification:
                  </p>
                  <code className="text-xs block p-2 bg-background rounded">
                    X-ChipInPay-Signature: t=timestamp,v1=signature
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Verify by computing HMAC-SHA256 of "timestamp.payload" with your webhook secret.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function RegisterMerchantForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    businessType: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    webhookUrl: "",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/merchant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Merchant account created! Pending approval." });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to register", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            data-testid="input-company-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website *</Label>
          <Input
            id="website"
            type="url"
            required
            placeholder="https://your-site.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            data-testid="input-website"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type *</Label>
          <Input
            id="businessType"
            required
            placeholder="e.g., E-commerce, SaaS, Retail"
            value={formData.businessType}
            onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
            data-testid="input-business-type"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            required
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            data-testid="input-contact-email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Business Description</Label>
        <Input
          id="description"
          placeholder="Brief description of your business"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid="input-description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhookUrl">Webhook URL (optional)</Label>
        <Input
          id="webhookUrl"
          type="url"
          placeholder="https://your-site.com/webhooks/chipinpay"
          value={formData.webhookUrl}
          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
          data-testid="input-webhook"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register">
          {registerMutation.isPending ? "Creating Account..." : "Create Merchant Account"}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          5% fee on all transactions. No monthly fees.
        </p>
      </div>
    </form>
  );
}
