import { useEffect, useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Bell, Mail, Phone, Moon, Sun, Shield, Save, AlertCircle, User, MapPin, Loader2, Camera, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
}

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

  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
  });
  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
      });
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Profile updated successfully" });
      setHasProfileChanges(false);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to update profile", variant: "destructive" });
    },
  });

  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasProfileChanges(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned upload URL
      const urlRes = await fetch("/api/user/avatar/upload-url", {
        method: "POST",
        credentials: "include",
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2: Upload file directly to presigned URL
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image");

      // Step 3: Update user avatar
      const updateRes = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      if (!updateRes.ok) {
        const error = await updateRes.json();
        throw new Error(error.error || "Failed to save avatar");
      }
      return updateRes.json();
    },
    onSuccess: () => {
      toast({ description: "Profile picture updated" });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to update picture", variant: "destructive" });
    },
    onSettled: () => {
      setIsUploadingAvatar(false);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ description: "Image must be under 5MB", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ description: "Please select an image file", variant: "destructive" });
        return;
      }
      setIsUploadingAvatar(true);
      avatarMutation.mutate(file);
    }
  };

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" /> Profile Information
              </h3>
              {hasProfileChanges && (
                <Button 
                  size="sm"
                  onClick={() => profileMutation.mutate(profile)} 
                  disabled={profileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {profileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-white/10">
                    <AvatarImage src={user?.avatar || undefined} alt={user?.firstName || 'User'} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                    data-testid="button-change-avatar"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    data-testid="input-avatar"
                  />
                </div>
                <div>
                  <p className="font-medium">Profile Picture</p>
                  <p className="text-sm text-muted-foreground">Click the photo to change it</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-white/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    data-testid="button-upload-photo"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    placeholder="John"
                    className="mt-1.5 bg-background/50 border-white/10"
                    data-testid="input-firstName"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className="mt-1.5 bg-background/50 border-white/10"
                    data-testid="input-lastName"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => handleProfileChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="johndoe"
                    className="pl-8 bg-background/50 border-white/10"
                    data-testid="input-username"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1.5 bg-background/50 border-white/10"
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1.5 bg-background/50 border-white/10"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Location
                </Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => handleProfileChange('location', e.target.value)}
                  placeholder="San Francisco, CA"
                  className="mt-1.5 bg-background/50 border-white/10"
                  data-testid="input-location"
                />
              </div>
              <div>
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="mt-1.5 bg-background/50 border-white/10 resize-none"
                  data-testid="input-bio"
                />
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
            <div className="space-y-3">
              <Button variant="outline" className="w-full border-white/10" asChild>
                <Link href="/security">
                  Manage Security Settings
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-white/10 text-yellow-500 hover:text-yellow-400"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/user/reset-verification', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    if (res.ok) {
                      toast({ description: "Verification reset. You can now start fresh." });
                    } else {
                      const err = await res.json();
                      toast({ description: err.error || "Failed to reset verification", variant: "destructive" });
                    }
                  } catch (err) {
                    toast({ description: "Failed to reset verification", variant: "destructive" });
                  }
                }}
                data-testid="button-reset-verification"
              >
                Reset Payout Verification
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
