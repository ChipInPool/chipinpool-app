import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { checkBiometricCapability, authenticateWithBiometrics, getBiometricLabel, getBiometricIcon, BiometricCapability } from '@/services/biometricAuth';
import * as SecureStore from 'expo-secure-store';

function MenuItem({ icon, label, onPress, rightElement }: { icon: string; label: string; onPress?: () => void; rightElement?: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon as any} size={22} color="#708090" />
      <Text style={styles.menuLabel}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#708090" />}
    </TouchableOpacity>
  );
}

function getKycIcon(status: string): { name: string; color: string } {
  switch (status) {
    case 'verified':
      return { name: 'checkmark-circle', color: '#7FFFD4' };
    case 'pending':
      return { name: 'time', color: '#FBBF24' };
    default:
      return { name: 'shield', color: '#708090' };
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
  const kycStatus = user?.kycStatus || 'not_started';
  const kycIcon = getKycIcon(kycStatus);

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

  const twoFAEnabled = securityQuery.data?.twoFactorEnabled || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Verification</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Ionicons name={kycIcon.name as any} size={32} color={kycIcon.color} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Identity Verification</Text>
                <Text style={[styles.statusValue, { color: kycIcon.color }]}>{getKycLabel(kycStatus)}</Text>
              </View>
            </View>
            {kycStatus !== 'verified' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => kycMutation.mutate()}
                disabled={kycMutation.isPending}
              >
                {kycMutation.isPending ? (
                  <ActivityIndicator color="#001F3F" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#001F3F" />
                    <Text style={styles.actionButtonText}>Start Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {biometricCapability?.isAvailable && biometricCapability.isEnrolled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biometric Authentication</Text>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={getBiometricIcon(biometricCapability.biometricType) as any} size={24} color="#7FFFD4" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    {getBiometricLabel(biometricCapability.biometricType)}
                  </Text>
                  <Text style={{ color: '#708090', fontSize: 13, marginTop: 2 }}>
                    Use {getBiometricLabel(biometricCapability.biometricType).toLowerCase()} to unlock the app
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(127, 255, 212, 0.4)' }}
                  thumbColor={biometricEnabled ? '#7FFFD4' : '#708090'}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Ionicons
                name={twoFAEnabled ? 'lock-closed' : 'lock-open-outline'}
                size={32}
                color={twoFAEnabled ? '#7FFFD4' : '#708090'}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>2FA Status</Text>
                <Text style={[styles.statusValue, { color: twoFAEnabled ? '#7FFFD4' : '#708090' }]}>
                  {twoFAEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Text style={styles.infoText}>
              Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.
            </Text>
            {securityQuery.isLoading && (
              <ActivityIndicator color="#7FFFD4" style={{ marginTop: 12 }} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password</Text>
          <MenuItem
            icon="key-outline"
            label="Change Password"
            onPress={() => Alert.alert('Change Password', 'Use the web app to change your password.')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Ionicons name="desktop-outline" size={28} color="#708090" />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Session Management</Text>
                <Text style={styles.infoText}>Manage active sessions from the web app</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: '#708090', textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  statusValue: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  infoText: { fontSize: 14, color: '#708090', marginTop: 12, lineHeight: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  actionButtonText: { color: '#001F3F', fontSize: 16, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 8 },
  menuLabel: { flex: 1, marginLeft: 12, fontSize: 16, color: '#fff' },
});
