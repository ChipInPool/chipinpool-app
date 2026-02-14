import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { checkBiometricCapability, authenticateWithBiometrics, getBiometricLabel, getBiometricIcon, BiometricCapability } from '@/services/biometricAuth';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/theme/ThemeContext';

function MenuItem({ icon, label, onPress, rightElement, colors }: { icon: string; label: string; onPress?: () => void; rightElement?: React.ReactNode; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.inputBg }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons name={icon as any} size={22} color={colors.slate} />
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.slate} />}
    </TouchableOpacity>
  );
}

function getKycIcon(status: string, colors: any): { name: string; color: string } {
  switch (status) {
    case 'verified':
      return { name: 'checkmark-circle', color: colors.mint };
    case 'pending':
      return { name: 'time', color: colors.yellow };
    default:
      return { name: 'shield', color: colors.slate };
  }
}

function getKycLabel(status: string): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending Review';
    default:
      return 'Not Started';
  }
}

export default function SecurityScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const kycStatus = user?.kycStatus || 'not_started';
  const kycIcon = getKycIcon(kycStatus, colors);

  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    checkBiometricCapability().then(setBiometricCapability);
    SecureStore.getItemAsync('biometric_enabled').then(val => setBiometricEnabled(val === 'true'));
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await authenticateWithBiometrics('Enable biometric authentication');
      if (success) {
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        setBiometricEnabled(true);
        Alert.alert('Enabled', `${getBiometricLabel(biometricCapability?.biometricType || 'none')} authentication enabled`);
      }
    } else {
      await SecureStore.setItemAsync('biometric_enabled', 'false');
      setBiometricEnabled(false);
    }
  };

  const securityQuery = useQuery({
    queryKey: ['security-status'],
    queryFn: api.security.getStatus,
  });

  const kycMutation = useMutation({
    mutationFn: api.security.startKYC,
    onSuccess: (data: any) => {
      if (data?.url) {
        Linking.openURL(data.url);
      } else {
        Alert.alert('KYC Verification', 'Verification process has been initiated. Please check your email for further instructions.');
      }
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to start KYC verification');
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.slate }]}>KYC Verification</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.statusRow}>
              <Ionicons name={kycIcon.name as any} size={32} color={kycIcon.color} />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: colors.text }]}>Identity Verification</Text>
                <Text style={[styles.statusValue, { color: kycIcon.color }]}>{getKycLabel(kycStatus)}</Text>
              </View>
            </View>
            {kycStatus !== 'verified' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.mint }]}
                onPress={() => kycMutation.mutate()}
                disabled={kycMutation.isPending}
              >
                {kycMutation.isPending ? (
                  <ActivityIndicator color={isDark ? '#001F3F' : '#FFFFFF'} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color={isDark ? '#001F3F' : '#FFFFFF'} />
                    <Text style={[styles.actionButtonText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>Start Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {biometricCapability?.isAvailable && biometricCapability.isEnrolled && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.slate }]}>Biometric Authentication</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={getBiometricIcon(biometricCapability.biometricType) as any} size={24} color={colors.mint} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                    {getBiometricLabel(biometricCapability.biometricType)}
                  </Text>
                  <Text style={{ color: colors.slate, fontSize: 13, marginTop: 2 }}>
                    Use {getBiometricLabel(biometricCapability.biometricType).toLowerCase()} to unlock the app
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: colors.cardBorder, true: 'rgba(127, 255, 212, 0.4)' }}
                  thumbColor={biometricEnabled ? colors.mint : colors.slate}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.slate }]}>Password</Text>
          <MenuItem
            icon="key-outline"
            label="Change Password"
            onPress={() => Alert.alert('Change Password', 'Use the web app to change your password.')}
            colors={colors}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.slate }]}>Active Sessions</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.statusRow}>
              <Ionicons name="desktop-outline" size={28} color={colors.slate} />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: colors.text }]}>Session Management</Text>
                <Text style={[styles.infoText, { color: colors.slate }]}>Manage active sessions from the web app</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '600' },
  statusValue: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  infoText: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  menuLabel: { flex: 1, marginLeft: 12, fontSize: 16 },
});
