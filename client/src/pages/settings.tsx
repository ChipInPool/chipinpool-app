import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, Mail, Phone, Moon, Sun, Shield, Save, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";

interface NotificationPreferences {
  emailContributions: boolean;
  emailPoolUpdates: boolean;
  emailPoolComplete: boolean;
  emailInvites: boolean;
  emailSecurityAlerts: boolean;
  emailKycUpdates: boolean;
  emailCardActivity: boolean;
  emailWalletActivity: boolean;
  emailAccountChanges: boolean;
  smsContributions: boolean;
  smsPoolComplete: boolean;
  smsInvites: boolean;
  smsSecurityAlerts: boolean;
  smsKycUpdates: boolean;
  smsCardActivity: boolean;
  smsWalletActivity: boolean;
  smsAccountChanges: boolean;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailContributions: true,
    emailPoolUpdates: true,
    emailPoolComplete: true,
    emailInvites: true,
    emailSecurityAlerts: true,
    emailKycUpdates: true,
    emailCardActivity: true,
    emailWalletActivity: true,
    emailAccountChanges: true,
    smsContributions: false,
    smsPoolComplete: true,
    smsInvites: true,
    smsSecurityAlerts: true,
    smsKycUpdates: true,
    smsCardActivity: false,
    smsWalletActivity: false,
    smsAccountChanges: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notificationPrefs"],
    queryFn: async () => {
      const res = await fetch("/api/user/notification-preferences", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load preferences");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (data?.preferences) {
      setPrefs(data.preferences);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      const res = await fetch("/api/user/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(preferences),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Notification preferences saved" });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["notificationPrefs"] });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 rounded-xl mb-6" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/profile">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your preferences</p>
            </div>
          </div>
          {hasChanges && (
            <Button onClick={() => saveMutation.mutate(prefs)} disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Sun className="w-4 h-4 text-yellow-400" /> Appearance
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-sm text-muted-foreground">Switch between dark and light mode</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className={theme !== 'light' ? 'border-white/10' : ''}
                  data-testid="button-theme-light"
                >
                  <Sun className="w-4 h-4" />
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className={theme !== 'dark' ? 'border-white/10' : ''}
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-blue-400" /> Email Notifications
            </h3>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2 px-3">Pool Activity</p>
              {[
                { key: 'emailContributions', label: 'Contributions', desc: 'When someone contributes to your pool' },
                { key: 'emailPoolUpdates', label: 'Pool Updates', desc: 'Progress updates on pools you contribute to' },
                { key: 'emailPoolComplete', label: 'Pool Complete', desc: 'When a pool reaches its goal' },
                { key: 'emailInvites', label: 'Invitations', desc: 'When someone invites you to a pool' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[item.key as keyof NotificationPreferences]}
                    onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground mb-2 px-3 pt-4">Account & Security</p>
              {[
                { key: 'emailSecurityAlerts', label: 'Security Alerts', desc: 'Login attempts, password changes, 2FA updates' },
                { key: 'emailKycUpdates', label: 'Verification Updates', desc: 'Identity verification status changes' },
                { key: 'emailAccountChanges', label: 'Account Changes', desc: 'Profile updates, email/phone changes' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[item.key as keyof NotificationPreferences]}
                    onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground mb-2 px-3 pt-4">Payments & Cards</p>
              {[
                { key: 'emailCardActivity', label: 'Card Activity', desc: 'Virtual card transactions and updates' },
                { key: 'emailWalletActivity', label: 'Wallet Activity', desc: 'Deposits, withdrawals, and transfers' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[item.key as keyof NotificationPreferences]}
                    onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4 text-green-400" /> SMS Notifications
            </h3>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2 px-3">Pool Activity</p>
              {[
                { key: 'smsContributions', label: 'Contributions', desc: 'When someone contributes to your pool' },
                { key: 'smsPoolComplete', label: 'Pool Complete', desc: 'When a pool reaches its goal' },
                { key: 'smsInvites', label: 'Invitations', desc: 'When someone invites you to a pool' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[item.key as keyof NotificationPreferences]}
                    onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground mb-2 px-3 pt-4">Account & Security</p>
              {[
                { key: 'smsSecurityAlerts', label: 'Security Alerts', desc: 'Login attempts, password changes, 2FA updates' },
                { key: 'smsKycUpdates', label: 'Verification Updates', desc: 'Identity verification status changes' },
                { key: 'smsAccountChanges', label: 'Account Changes', desc: 'Profile updates, email/phone changes' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[item.key as keyof NotificationPreferences]}
                    onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground mb-2 px-3 pt-4">Payments & Cards</p>
              {[
                { key: 'smsCardActivity', label: 'Card Activity', desc: 'Virtual card transactions' },
                { key: 'smsWalletActivity', label: 'Wallet Activity', desc: 'Deposits, withdrawals, and transfers' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[item.key as keyof NotificationPreferences]}
                    onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    data-testid={`switch-${item.key}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-red-400" /> Security & Privacy
            </h3>
            <Button variant="outline" className="w-full border-white/10" asChild>
              <Link href="/security">
                Manage Security Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
