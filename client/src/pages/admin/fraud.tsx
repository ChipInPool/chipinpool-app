import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, Shield, ShieldAlert, ShieldCheck, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FraudAlert {
  id: string;
  userId: string | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  alertType: string;
  description: string;
  indicators: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed';
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; username: string; email: string; firstName: string; lastName: string } | null;
}

export default function AdminFraud() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["admin", "fraud", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/fraud/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fraud dashboard");
      return res.json();
    },
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["admin", "fraud", "alerts", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/fraud/alerts?status=${statusFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/admin/fraud/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to review alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "fraud"] });
      toast({ description: "Alert updated" });
      setSelectedAlert(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({ description: "Failed to update alert", variant: "destructive" });
    },
  });

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge className="bg-red-600"><ShieldAlert className="w-3 h-3 mr-1" /> Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" /> High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-black"><Shield className="w-3 h-3 mr-1" /> Medium</Badge>;
      default:
        return <Badge variant="outline"><ShieldCheck className="w-3 h-3 mr-1" /> Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Reviewed</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="border-gray-500 text-gray-600">Dismissed</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-red-500 text-red-600">Confirmed Fraud</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const alerts: FraudAlert[] = alertsData?.alerts || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fraud Detection</h1>
          <p className="text-muted-foreground">Monitor and review suspicious activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{dashboardData?.totalAlerts || 0}</p>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-yellow-600">{dashboardData?.pendingAlerts || 0}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-red-600">{dashboardData?.criticalAlerts || 0}</p>
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{dashboardData?.alertsLast24h || 0}</p>
              <p className="text-sm text-muted-foreground">Last 24 Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-orange-500">{dashboardData?.highRiskUsers || 0}</p>
              <p className="text-sm text-muted-foreground">High Risk Users</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fraud Alerts</CardTitle>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
                data-testid="select-status-filter"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="dismissed">Dismissed</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No alerts found</p>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                    data-testid={`alert-${alert.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getRiskBadge(alert.riskLevel)}
                          {getStatusBadge(alert.status)}
                          <span className="text-sm text-muted-foreground">Score: {alert.riskScore}</span>
                        </div>
                        <p className="font-medium">{alert.alertType.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        {alert.user && (
                          <p className="text-sm">
                            User: {alert.user.firstName} {alert.user.lastName} (@{alert.user.username})
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{format(new Date(alert.createdAt), "MMM d, yyyy")}</p>
                        <p>{format(new Date(alert.createdAt), "h:mm a")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Alert</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {getRiskBadge(selectedAlert.riskLevel)}
                {getStatusBadge(selectedAlert.status)}
              </div>
              <div>
                <Label>Alert Type</Label>
                <p className="font-medium">{selectedAlert.alertType.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <div>
                <Label>Description</Label>
                <p>{selectedAlert.description}</p>
              </div>
              <div>
                <Label>Risk Score</Label>
                <p className="font-bold text-lg">{selectedAlert.riskScore}/100</p>
              </div>
              <div>
                <Label>Indicators</Label>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {JSON.parse(selectedAlert.indicators).map((indicator: string, i: number) => (
                    <li key={i}>{indicator}</li>
                  ))}
                </ul>
              </div>
              {selectedAlert.user && (
                <div>
                  <Label>User</Label>
                  <p>{selectedAlert.user.firstName} {selectedAlert.user.lastName} (@{selectedAlert.user.username})</p>
                  <p className="text-sm text-muted-foreground">{selectedAlert.user.email}</p>
                </div>
              )}
              {selectedAlert.ipAddress && (
                <div>
                  <Label>IP Address</Label>
                  <p className="font-mono text-sm">{selectedAlert.ipAddress}</p>
                </div>
              )}
              <div>
                <Label htmlFor="notes">Review Notes</Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your review..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ id: selectedAlert.id, status: 'dismissed', notes: reviewNotes })}
                  disabled={reviewMutation.isPending}
                >
                  Dismiss
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ id: selectedAlert.id, status: 'reviewed', notes: reviewNotes })}
                  disabled={reviewMutation.isPending}
                >
                  Mark Reviewed
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ id: selectedAlert.id, status: 'confirmed', notes: reviewNotes })}
                  disabled={reviewMutation.isPending}
                >
                  Confirm Fraud
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
