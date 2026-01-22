import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Plus, ShoppingCart, Package, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("storefront");

  const { data: myAccount, isLoading: accountLoading } = useQuery({
    queryKey: ["myConnectAccount"],
    queryFn: async () => {
      const res = await fetch('/api/connect/my-account', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch account');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: storefront, isLoading: storefrontLoading } = useQuery({
    queryKey: ["storefront"],
    queryFn: async () => {
      const res = await fetch('/api/connect/storefront');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  const { data: myProducts } = useQuery({
    queryKey: ["myProducts"],
    queryFn: async () => {
      const res = await fetch('/api/connect/my-products', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: isAuthenticated && myAccount?.hasAccount,
  });

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [accountForm, setAccountForm] = useState({ displayName: '', contactEmail: '' });
  const [productForm, setProductForm] = useState({ 
    name: '', 
    description: '', 
    priceInCents: 1000, 
    imageUrl: '' 
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: typeof accountForm) => {
      const res = await fetch('/api/connect/accounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create account');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myConnectAccount"] });
      setShowCreateAccount(false);
      toast({ description: "Connected account created! Now complete onboarding." });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const startOnboardingMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/connect/accounts/${accountId}/onboarding-link`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start onboarding');
      }
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const res = await fetch('/api/connect/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create product');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProducts"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      setShowAddProduct(false);
      setProductForm({ name: '', description: '', priceInCents: 1000, imageUrl: '' });
      toast({ description: "Product created successfully!" });
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch('/api/connect/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start checkout');
      }
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (error: any) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Store className="w-8 h-8 text-cyan-400" />
              Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">
              Buy from connected merchants or become a seller
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="storefront" data-testid="tab-storefront">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Storefront
            </TabsTrigger>
            {isAuthenticated && (
              <TabsTrigger value="seller" data-testid="tab-seller">
                <Package className="w-4 h-4 mr-2" />
                Seller Dashboard
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="storefront" className="space-y-6">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>
                  Browse products from all connected merchants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {storefrontLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : storefront?.products?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No products available yet</p>
                    <p className="text-sm mt-2">Be the first to add a product!</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {storefront?.products?.map(({ product, merchant }: any) => (
                      <Card key={product.id} className="bg-white/5 border-white/10 overflow-hidden">
                        {product.imageUrl && (
                          <div className="aspect-video bg-gradient-to-br from-cyan-500/20 to-blue-500/20 overflow-hidden">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {!product.imageUrl && (
                          <div className="aspect-video bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <Package className="w-12 h-12 text-cyan-400/50" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <span className="text-lg font-bold text-cyan-400">
                              ${(product.priceInCents / 100).toFixed(2)}
                            </span>
                          </div>
                          {product.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              <Store className="w-3 h-3 mr-1" />
                              {merchant.companyName}
                            </Badge>
                            <Button 
                              size="sm"
                              onClick={() => checkoutMutation.mutate(product.id)}
                              disabled={checkoutMutation.isPending}
                              className="bg-gradient-to-r from-cyan-500 to-blue-500"
                              data-testid={`button-buy-${product.id}`}
                            >
                              {checkoutMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-1" />
                                  Buy
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seller" className="space-y-6">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Connected Account</CardTitle>
                    <CardDescription>
                      Your Stripe Connect account for receiving payments
                    </CardDescription>
                  </div>
                  {myAccount?.hasAccount && (
                    <div className="flex items-center gap-2">
                      {myAccount.readyToReceivePayments ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      ) : myAccount.onboardingComplete ? (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          <AlertCircle className="w-3 h-3 mr-1" /> Pending Verification
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          <AlertCircle className="w-3 h-3 mr-1" /> Onboarding Required
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {accountLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !myAccount?.hasAccount ? (
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Create a connected account to start selling
                    </p>
                    <Button 
                      onClick={() => {
                        setAccountForm({
                          displayName: user ? `${user.firstName} ${user.lastName}` : '',
                          contactEmail: user?.email || '',
                        });
                        setShowCreateAccount(true);
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500"
                      data-testid="button-create-connect-account"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Connected Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-muted-foreground">Business Name</p>
                        <p className="font-medium">{myAccount.companyName}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-muted-foreground">Account ID</p>
                        <p className="font-mono text-sm">{myAccount.accountId}</p>
                      </div>
                    </div>
                    
                    {!myAccount.onboardingComplete && (
                      <Button
                        onClick={() => startOnboardingMutation.mutate(myAccount.accountId)}
                        disabled={startOnboardingMutation.isPending}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500"
                        data-testid="button-complete-onboarding"
                      >
                        {startOnboardingMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        Complete Onboarding
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {myAccount?.hasAccount && (
              <Card className="bg-white/[0.02] border-white/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Products</CardTitle>
                      <CardDescription>
                        Products you're selling on the marketplace
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setShowAddProduct(true)}
                      size="sm"
                      data-testid="button-add-product"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {myProducts?.products?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No products yet</p>
                      <p className="text-sm mt-2">Add your first product to start selling</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {myProducts?.products?.map((product: any) => (
                        <div 
                          key={product.id} 
                          className="p-4 bg-white/5 rounded-lg flex items-center gap-4"
                        >
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-16 h-16 rounded object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                              <Package className="w-6 h-6 text-cyan-400/50" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${(product.priceInCents / 100).toFixed(2)}
                            </p>
                          </div>
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Create Connected Account</DialogTitle>
            <DialogDescription>
              Set up your Stripe Connect account to receive payments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Business Name</Label>
              <Input
                id="displayName"
                placeholder="Your Business Name"
                value={accountForm.displayName}
                onChange={(e) => setAccountForm(prev => ({ ...prev, displayName: e.target.value }))}
                data-testid="input-display-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="email@example.com"
                value={accountForm.contactEmail}
                onChange={(e) => setAccountForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                data-testid="input-contact-email"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowCreateAccount(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createAccountMutation.mutate(accountForm)}
                disabled={!accountForm.displayName || !accountForm.contactEmail || createAccountMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
                data-testid="button-confirm-create-account"
              >
                {createAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Create a new product to sell on the marketplace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                placeholder="Product Name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-product-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDescription">Description (optional)</Label>
              <Input
                id="productDescription"
                placeholder="A brief description..."
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-product-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productPrice">Price (USD)</Label>
              <Input
                id="productPrice"
                type="number"
                step="0.01"
                min="1"
                placeholder="10.00"
                value={(productForm.priceInCents / 100).toFixed(2)}
                onChange={(e) => setProductForm(prev => ({ 
                  ...prev, 
                  priceInCents: Math.round(parseFloat(e.target.value || '0') * 100)
                }))}
                data-testid="input-product-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productImage">Image URL (optional)</Label>
              <Input
                id="productImage"
                placeholder="https://..."
                value={productForm.imageUrl}
                onChange={(e) => setProductForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                data-testid="input-product-image"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createProductMutation.mutate(productForm)}
                disabled={!productForm.name || productForm.priceInCents < 100 || createProductMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
                data-testid="button-confirm-add-product"
              >
                {createProductMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
