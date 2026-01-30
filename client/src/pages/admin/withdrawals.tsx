import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, User, Building, MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Copy } from "lucide-react";
import { format } from "date-fns";

interface WithdrawalUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  kycStatus: string;
  verifiedLegalName: string | null;
  verifiedAddress: string | null;
  verifiedCity: string | null;
  verifiedState: string | null;
  verifiedPostalCode: string | null;
  verifiedCountry: string | null;
}

interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  status: string;
  accountHolderName: string | null;
  routingNumber: string | null;
  accountNumberLast4: string | null;
  accountType: string | null;
  adminNotes: string | null;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  user: WithdrawalUser | null;
}

async function fetchPendingWithdrawals(): Promise<{ withdrawals: Withdrawal[] }> {
  const response = await fetch("/api/admin/withdrawals/pending", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch withdrawals");
  return response.json();
}

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [mercuryTransferId, setMercuryTransferId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "withdrawals", "pending"],
    queryFn: fetchPendingWithdrawals,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, mercuryTransferId, notes }: { id: string; mercuryTransferId: string; notes: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mercuryTransferId, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete withdrawal");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Withdrawal marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
      setProcessDialogOpen(false);
      setSelectedWithdrawal(null);
      setMercuryTransferId("");
      setAdminNotes("");
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject withdrawal");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Withdrawal rejected and funds returned to user" });
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
      setRejectDialogOpen(false);
      setSelectedWithdrawal(null);
      setAdminNotes("");
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

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
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </AdminLayout>
    );
  }

  const withdrawals = data?.withdrawals || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pending Withdrawals</h1>
            <p className="text-muted-foreground">Review and process withdrawal requests via Mercury</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {withdrawals.length} Pending
          </Badge>
        </div>

        {withdrawals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending withdrawal requests.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className="border-yellow-500/30" data-testid={`withdrawal-${withdrawal.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      ${parseFloat(withdrawal.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                        Pending Review
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(withdrawal.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <User className="w-4 h-4" /> User Identity (from KYC)
                        </h4>
                        <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                          {withdrawal.user?.verifiedLegalName ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Legal Name:</span>
                                <span className="font-medium">{withdrawal.user.verifiedLegalName}</span>
                              </div>
                              {withdrawal.user.verifiedAddress && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Address:</span>
                                  <span className="font-medium text-right">
                                    {withdrawal.user.verifiedAddress}
                                    {withdrawal.user.verifiedCity && `, ${withdrawal.user.verifiedCity}`}
                                    {withdrawal.user.verifiedState && `, ${withdrawal.user.verifiedState}`}
                                    {withdrawal.user.verifiedPostalCode && ` ${withdrawal.user.verifiedPostalCode}`}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-yellow-500 text-sm">
                              No verified identity data - KYC may not have captured address
                            </p>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Name:</span>
                            <span>{withdrawal.user?.firstName} {withdrawal.user?.lastName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{withdrawal.user?.email}</span>
                          </div>
                          {withdrawal.user?.phone && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone:</span>
                              <span>{withdrawal.user.phone}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">KYC Status:</span>
                            <Badge variant={withdrawal.user?.kycStatus === 'verified' ? 'default' : 'destructive'} className="text-xs">
                              {withdrawal.user?.kycStatus || 'unknown'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Building className="w-4 h-4" /> Bank Details (for Mercury)
                        </h4>
                        <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Account Holder:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{withdrawal.accountHolderName || 'N/A'}</span>
                              {withdrawal.accountHolderName && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(withdrawal.accountHolderName!, "Account holder")}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Routing Number:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium">{withdrawal.routingNumber || 'N/A'}</span>
                              {withdrawal.routingNumber && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(withdrawal.routingNumber!, "Routing number")}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Account Number:</span>
                            <span className="font-mono">••••{withdrawal.accountNumberLast4 || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Type:</span>
                            <span className="capitalize">{withdrawal.accountType || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => { setSelectedWithdrawal(withdrawal); setProcessDialogOpen(true); }}
                          data-testid={`complete-${withdrawal.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Completed
                        </Button>
                        <Button 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => { setSelectedWithdrawal(withdrawal); setRejectDialogOpen(true); }}
                          data-testid={`reject-${withdrawal.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Withdrawal</DialogTitle>
            <DialogDescription>
              Confirm that you've processed this withdrawal via Mercury
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-lg font-bold text-green-400">
                ${selectedWithdrawal ? parseFloat(selectedWithdrawal.amount).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-muted-foreground">
                to {selectedWithdrawal?.accountHolderName}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mercury Transfer ID (optional)</label>
              <Input
                placeholder="e.g., xfer_abc123..."
                value={mercuryTransferId}
                onChange={(e) => setMercuryTransferId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                placeholder="Any notes about this transfer..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedWithdrawal && completeMutation.mutate({ 
                id: selectedWithdrawal.id, 
                mercuryTransferId, 
                notes: adminNotes 
              })}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Processing..." : "Confirm Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              This will return the funds to the user's wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-lg font-bold text-red-400">
                ${selectedWithdrawal ? parseFloat(selectedWithdrawal.amount).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-muted-foreground">
                Will be returned to {selectedWithdrawal?.user?.firstName}'s wallet
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection</label>
              <Textarea
                placeholder="e.g., Invalid bank details, suspected fraud..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedWithdrawal && rejectMutation.mutate({ 
                id: selectedWithdrawal.id, 
                notes: adminNotes 
              })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Processing..." : "Reject & Return Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
