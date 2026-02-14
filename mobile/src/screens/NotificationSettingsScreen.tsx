import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface NotificationPrefs {
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

function ToggleRow({ label, value, onValueChange, icon, colors }: { label: string; value: boolean; onValueChange: (val: boolean) => void; icon?: string; colors: any }) {
  return (
    <View style={[styles.toggleRow, { borderBottomColor: colors.card }]}>
      {icon && <Ionicons name={icon as any} size={20} color={colors.slate} style={{ marginRight: 12 }} />}
      <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.cardBorder, true: 'rgba(127, 255, 212, 0.4)' }}
        thumbColor={value ? colors.mint : colors.slate}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (user?.notifyPush !== undefined) {
      setPushEnabled(user.notifyPush);
    }
  }, [user]);

  const togglePush = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await api.user.updateProfile({ notifyPush: value });
    } catch (err) {
      console.log('[NotifSettings] Failed to update push preference:', err);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: api.user.getNotificationPreferences,
  });

  useEffect(() => {
    if (data?.preferences) {
      setPrefs(data.preferences);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (updatedPrefs: Partial<NotificationPrefs>) =>
      api.user.updateNotificationPreferences(updatedPrefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      Alert.alert('Saved', 'Notification preferences updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to save preferences');
    },
  });

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveMutation.mutate({ [key]: value });
  };

  if (isLoading || !prefs) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <ActivityIndicator color={colors.mint} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors.slate }]}>Choose how you want to be notified about activity on your account.</Text>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Push Notifications</Text>
          <ToggleRow
            label="Enable Push Notifications"
            value={pushEnabled}
            onValueChange={togglePush}
            icon="notifications-outline"
            colors={colors}
          />
          <Text style={[styles.sectionNote, { color: colors.slate }]}>Push notifications are sent to your device for real-time alerts.</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={20} color={colors.mint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Email Notifications</Text>
          </View>
          <ToggleRow label="Contributions" value={prefs.emailContributions} onValueChange={(v) => updatePref('emailContributions', v)} colors={colors} />
          <ToggleRow label="Pool Updates" value={prefs.emailPoolUpdates} onValueChange={(v) => updatePref('emailPoolUpdates', v)} colors={colors} />
          <ToggleRow label="Pool Complete" value={prefs.emailPoolComplete} onValueChange={(v) => updatePref('emailPoolComplete', v)} colors={colors} />
          <ToggleRow label="Invitations" value={prefs.emailInvites} onValueChange={(v) => updatePref('emailInvites', v)} colors={colors} />
          <ToggleRow label="Security Alerts" value={prefs.emailSecurityAlerts} onValueChange={(v) => updatePref('emailSecurityAlerts', v)} colors={colors} />
          <ToggleRow label="KYC Updates" value={prefs.emailKycUpdates} onValueChange={(v) => updatePref('emailKycUpdates', v)} colors={colors} />
          <ToggleRow label="Card Activity" value={prefs.emailCardActivity} onValueChange={(v) => updatePref('emailCardActivity', v)} colors={colors} />
          <ToggleRow label="Wallet Activity" value={prefs.emailWalletActivity} onValueChange={(v) => updatePref('emailWalletActivity', v)} colors={colors} />
          <ToggleRow label="Account Changes" value={prefs.emailAccountChanges} onValueChange={(v) => updatePref('emailAccountChanges', v)} colors={colors} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.mint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>SMS Notifications</Text>
          </View>
          <ToggleRow label="Contributions" value={prefs.smsContributions} onValueChange={(v) => updatePref('smsContributions', v)} colors={colors} />
          <ToggleRow label="Pool Complete" value={prefs.smsPoolComplete} onValueChange={(v) => updatePref('smsPoolComplete', v)} colors={colors} />
          <ToggleRow label="Invitations" value={prefs.smsInvites} onValueChange={(v) => updatePref('smsInvites', v)} colors={colors} />
          <ToggleRow label="Security Alerts" value={prefs.smsSecurityAlerts} onValueChange={(v) => updatePref('smsSecurityAlerts', v)} colors={colors} />
          <ToggleRow label="KYC Updates" value={prefs.smsKycUpdates} onValueChange={(v) => updatePref('smsKycUpdates', v)} colors={colors} />
          <ToggleRow label="Card Activity" value={prefs.smsCardActivity} onValueChange={(v) => updatePref('smsCardActivity', v)} colors={colors} />
          <ToggleRow label="Wallet Activity" value={prefs.smsWalletActivity} onValueChange={(v) => updatePref('smsWalletActivity', v)} colors={colors} />
          <ToggleRow label="Account Changes" value={prefs.smsAccountChanges} onValueChange={(v) => updatePref('smsAccountChanges', v)} colors={colors} />
        </View>

        <Text style={[styles.footer, { color: colors.slate }]}>Standard messaging and data rates may apply for SMS notifications.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  section: { marginBottom: 24, borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionNote: { fontSize: 12, marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  toggleLabel: { flex: 1, fontSize: 15 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
