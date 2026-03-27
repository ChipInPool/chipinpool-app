import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Mail, Copy, Check, Clock, Users, Key, CheckCircle2, XCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface BetaInvite {
  id: string;
  code: string;
  email: string | null;
  createdBy: string;
  usedBy: string | null;
  maxUses: number;
  useCount: number;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  invitedAt: string | null;
  inviteCode: string | null;
  createdAt: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      data-testid="button-copy-code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function CreateInviteDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", maxUses: 1, note: "", expiresInDays: 30 });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await fetchApi("/api/admin/beta/invites", {
        method: "POST",
        body: JSON.stringify({
          email: form.email || undefined,
          maxUses: form.maxUses,
          note: form.note || undefined,
          expiresInDays: form.expiresInDays || undefined,
        }),
      });
      toast({ description: "Invite code created successfully." });
      setOpen(false);
      setForm({ email: "", maxUses: 1, note: "", expiresInDays: 30 });
      onCreated();
    } catch (e: any) {
      toast({ description: e.message || "Failed to create invite", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-create-invite">
          <Plus className="w-4 h-4 mr-1.5" /> New Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Beta Invite</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Email (optional — for a specific person)</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="input-invite-email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Uses</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                data-testid="input-invite-max-uses"
              />
            </div>
            <div className="space-y-2">
              <Label>Expires in (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.expiresInDays}
                onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}
                data-testid="input-invite-expires"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. Friend of team"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              data-testid="input-invite-note"
            />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={loading} data-testid="button-confirm-create-invite">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBeta() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: invites = [], isLoading: invitesLoading } = useQuery<BetaInvite[]>({
    queryKey: ["/api/admin/beta/invites"],
    queryFn: () => fetchApi("/api/admin/beta/invites"),
  });

  const { data: waitlistEntries = [], isLoading: waitlistLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/admin/beta/waitlist"],
    queryFn: () => fetchApi("/api/admin/beta/waitlist"),
  });

  const deleteInvite = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/admin/beta/invites/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/beta/invites"] }); toast({ description: "Invite deleted." }); },
    onError: (e: any) => toast({ description: e.message, variant: "destructive" }),
  });

  const removeWaitlist = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/admin/beta/waitlist/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/beta/waitlist"] }); toast({ description: "Entry removed." }); },
    onError: (e: any) => toast({ description: e.message, variant: "destructive" }),
  });

  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const sendWaitlistInvite = async (id: string, email: string) => {
    setSendingInvite(id);
    try {
      await fetchApi(`/api/admin/beta/waitlist/${id}/invite`, { method: "POST" });
      toast({ description: `Invite sent to ${email}` });
      qc.invalidateQueries({ queryKey: ["/api/admin/beta/waitlist"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/beta/invites"] });
    } catch (e: any) {
      toast({ description: e.message || "Failed to send invite", variant: "destructive" });
    } finally {
      setSendingInvite(null);
    }
  };

  const usedCount = invites.filter((i) => i.useCount >= i.maxUses).length;
  const activeCount = invites.filter((i) => i.useCount < i.maxUses).length;
  const waitlistInvitedCount = waitlistEntries.filter((e) => e.invitedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Beta Access</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage invite codes and the waitlist for ChipIn Beta.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Invites", value: invites.length, icon: Key },
          { label: "Active", value: activeCount, icon: CheckCircle2, color: "text-green-500" },
          { label: "Used", value: usedCount, icon: XCircle, color: "text-muted-foreground" },
          { label: "Waitlist", value: waitlistEntries.length, icon: Users },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-white/10 bg-card/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className={`w-5 h-5 ${color || "text-primary"}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites" data-testid="tab-invites">Invite Codes</TabsTrigger>
          <TabsTrigger value="waitlist" data-testid="tab-waitlist">Waitlist ({waitlistEntries.length})</TabsTrigger>
        </TabsList>

        {/* Invite Codes Tab */}
        <TabsContent value="invites" className="mt-4">
          <Card className="border-white/10 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">All Invite Codes</CardTitle>
              <CreateInviteDialog onCreated={() => qc.invalidateQueries({ queryKey: ["/api/admin/beta/invites"] })} />
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No invite codes yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((invite) => {
                    const isExpired = invite.expiresAt && new Date() > new Date(invite.expiresAt);
                    const isUsedUp = invite.useCount >= invite.maxUses;
                    const status = isExpired ? "expired" : isUsedUp ? "used" : "active";
                    return (
                      <div
                        key={invite.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-background/50 hover:bg-background/80 transition-colors"
                        data-testid={`invite-row-${invite.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono font-bold text-sm tracking-widest">{invite.code}</code>
                            <CopyButton text={invite.code} />
                            <Badge variant={status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {invite.useCount}/{invite.maxUses} uses
                            </span>
                            {invite.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />{invite.email}
                              </span>
                            )}
                            {invite.expiresAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {isExpired ? "Expired" : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                              </span>
                            )}
                            {invite.note && (
                              <span className="text-xs text-muted-foreground italic">{invite.note}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          onClick={() => deleteInvite.mutate(invite.id)}
                          disabled={deleteInvite.isPending}
                          data-testid={`button-delete-invite-${invite.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="mt-4">
          <Card className="border-white/10 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Waitlist Signups</CardTitle>
              <span className="text-sm text-muted-foreground">{waitlistInvitedCount} invited</span>
            </CardHeader>
            <CardContent>
              {waitlistLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : waitlistEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No waitlist signups yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {waitlistEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-background/50 hover:bg-background/80 transition-colors"
                      data-testid={`waitlist-row-${entry.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{entry.firstName} {entry.lastName}</span>
                          {entry.invitedAt ? (
                            <Badge className="text-[10px] bg-green-500/20 text-green-600 border-0">Invited</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />{entry.email}
                          </span>
                          {entry.phone && (
                            <span className="text-xs text-muted-foreground">{entry.phone}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                          {entry.inviteCode && (
                            <span className="text-xs font-mono text-primary">Code: {entry.inviteCode}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!entry.invitedAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => sendWaitlistInvite(entry.id, entry.email)}
                            disabled={sendingInvite === entry.id}
                            data-testid={`button-invite-waitlist-${entry.id}`}
                          >
                            {sendingInvite === entry.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <><Mail className="w-3 h-3 mr-1" /> Invite</>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeWaitlist.mutate(entry.id)}
                          disabled={removeWaitlist.isPending}
                          data-testid={`button-remove-waitlist-${entry.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
