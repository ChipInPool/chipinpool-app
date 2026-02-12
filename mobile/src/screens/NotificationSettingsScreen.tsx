import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

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

function ToggleRow({ label, value, onValueChange, icon }: { label: string; value: boolean; onValueChange: (val: boolean) => void; icon?: string }) {
  return (
    <View style={styles.toggleRow}>
      {icon && <Ionicons name={icon as any} size={20} color="#708090" style={{ marginRight: 12 }} />}
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(127, 255, 212, 0.4)' }}
        thumbColor={value ? '#7FFFD4' : '#708090'}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color="#7FFFD4" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Notification Settings</Text>
        <Text style={styles.subtitle}>Choose how you want to be notified about activity on your account.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <ToggleRow
            label="Enable Push Notifications"
            value={pushEnabled}
            onValueChange={togglePush}
            icon="notifications-outline"
          />
          <Text style={styles.sectionNote}>Push notifications are sent to your device for real-time alerts.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={20} color="#7FFFD4" />
            <Text style={styles.sectionTitle}>Email Notifications</Text>
          </View>
          <ToggleRow label="Contributions" value={prefs.emailContributions} onValueChange={(v) => updatePref('emailContributions', v)} />
          <ToggleRow label="Pool Updates" value={prefs.emailPoolUpdates} onValueChange={(v) => updatePref('emailPoolUpdates', v)} />
          <ToggleRow label="Pool Complete" value={prefs.emailPoolComplete} onValueChange={(v) => updatePref('emailPoolComplete', v)} />
          <ToggleRow label="Invitations" value={prefs.emailInvites} onValueChange={(v) => updatePref('emailInvites', v)} />
          <ToggleRow label="Security Alerts" value={prefs.emailSecurityAlerts} onValueChange={(v) => updatePref('emailSecurityAlerts', v)} />
          <ToggleRow label="KYC Updates" value={prefs.emailKycUpdates} onValueChange={(v) => updatePref('emailKycUpdates', v)} />
          <ToggleRow label="Card Activity" value={prefs.emailCardActivity} onValueChange={(v) => updatePref('emailCardActivity', v)} />
          <ToggleRow label="Wallet Activity" value={prefs.emailWalletActivity} onValueChange={(v) => updatePref('emailWalletActivity', v)} />
          <ToggleRow label="Account Changes" value={prefs.emailAccountChanges} onValueChange={(v) => updatePref('emailAccountChanges', v)} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={20} color="#7FFFD4" />
            <Text style={styles.sectionTitle}>SMS Notifications</Text>
          </View>
          <ToggleRow label="Contributions" value={prefs.smsContributions} onValueChange={(v) => updatePref('smsContributions', v)} />
          <ToggleRow label="Pool Complete" value={prefs.smsPoolComplete} onValueChange={(v) => updatePref('smsPoolComplete', v)} />
          <ToggleRow label="Invitations" value={prefs.smsInvites} onValueChange={(v) => updatePref('smsInvites', v)} />
          <ToggleRow label="Security Alerts" value={prefs.smsSecurityAlerts} onValueChange={(v) => updatePref('smsSecurityAlerts', v)} />
          <ToggleRow label="KYC Updates" value={prefs.smsKycUpdates} onValueChange={(v) => updatePref('smsKycUpdates', v)} />
          <ToggleRow label="Card Activity" value={prefs.smsCardActivity} onValueChange={(v) => updatePref('smsCardActivity', v)} />
          <ToggleRow label="Wallet Activity" value={prefs.smsWalletActivity} onValueChange={(v) => updatePref('smsWalletActivity', v)} />
          <ToggleRow label="Account Changes" value={prefs.smsAccountChanges} onValueChange={(v) => updatePref('smsAccountChanges', v)} />
        </View>

        <Text style={styles.footer}>Standard messaging and data rates may apply for SMS notifications.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#708090', marginBottom: 24, lineHeight: 20 },
  section: { marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sectionNote: { fontSize: 12, color: '#708090', marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  toggleLabel: { flex: 1, fontSize: 15, color: '#fff' },
  footer: { fontSize: 12, color: '#708090', textAlign: 'center', marginTop: 8 },
});
