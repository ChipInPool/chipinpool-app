import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentMethodsScreen() {
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading, refetch } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: api.bankAccounts.list,
  });

  const deleteMutation = useMutation({
    mutationFn: api.bankAccounts.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to remove payment method');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: api.bankAccounts.setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      Alert.alert('Success', 'Default payment method updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to set default payment method');
    },
  });

  const accounts = bankAccounts?.accounts || [];
  const bankAccountsList = accounts.filter((a: any) => a.accountType === 'checking' || a.accountType === 'savings');
  const canReceivePayouts = bankAccountsList.length > 0;

  const handleDelete = (id: string) => {
    Alert.alert('Remove Payment Method', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const handleLinkBank = () => {
    Alert.alert(
      'Link Bank Account',
      'To link a bank account, please use the web app. Bank linking uses Stripe Financial Connections for secure verification.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />}
    >
      <Text style={styles.pageTitle}>Payment Methods</Text>
      <Text style={styles.pageSubtitle}>Manage your payment methods for deposits and withdrawals</Text>

      <View style={styles.withdrawalStatusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name="shield-checkmark" size={22} color="#60A5FA" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusTitle}>Withdrawal Status</Text>
            <Text style={styles.statusSubtitle}>Link a bank account to receive funds</Text>
          </View>
        </View>
        {canReceivePayouts ? (
          <View style={styles.statusReady}>
            <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.statusReadyTitle}>Ready to Receive Payouts</Text>
              <Text style={styles.statusReadySubtitle}>You can withdraw funds to your linked accounts</Text>
            </View>
          </View>
        ) : (
          <View style={styles.statusPending}>
            <Ionicons name="time" size={20} color="#FBBF24" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.statusPendingTitle}>Link a Payment Method</Text>
              <Text style={styles.statusPendingSubtitle}>Add a bank account for free ACH transfers</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={20} color="#60A5FA" />
          <Text style={styles.sectionTitle}>ACH Bank Accounts</Text>
          {bankAccountsList.length > 0 && (
            <View style={styles.linkedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
              <Text style={styles.linkedBadgeText}>Linked</Text>
            </View>
          )}
        </View>
        <View style={styles.achInfo}>
          <Ionicons name="time-outline" size={18} color="#60A5FA" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.achInfoTitle}>Standard ACH Transfer</Text>
            <Text style={styles.achInfoSubtitle}>1-3 business days, no fees</Text>
          </View>
        </View>

        {bankAccountsList.map((account: any) => (
          <View key={account.id} style={styles.paymentMethod}>
            <View style={styles.pmIcon}>
              <Ionicons name="business" size={20} color="#60A5FA" />
            </View>
            <View style={styles.pmInfo}>
              <Text style={styles.pmName}>{account.institutionName}</Text>
              <Text style={styles.pmDetails}>
                {account.accountType} ••••{account.accountMask}
                {account.isDefault && <Text style={styles.defaultBadge}> (Default)</Text>}
              </Text>
            </View>
            {!account.isDefault && (
              <TouchableOpacity
                onPress={() => setDefaultMutation.mutate(account.id)}
                style={styles.actionButton}
                data-testid={`button-set-default-${account.id}`}
              >
                <Ionicons name="star-outline" size={18} color="#7FFFD4" />
              </TouchableOpacity>
            )}
            {account.isDefault && (
              <View style={styles.actionButton}>
                <Ionicons name="star" size={18} color="#7FFFD4" />
              </View>
            )}
            <TouchableOpacity onPress={() => handleDelete(account.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity style={styles.addButton} onPress={handleLinkBank} data-testid="button-link-bank">
          <Ionicons name="add-circle-outline" size={20} color="#7FFFD4" />
          <Text style={styles.addButtonText}>
            {bankAccountsList.length > 0 ? 'Add Another Account' : 'Link Bank Account'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#708090', marginBottom: 20 },
  withdrawalStatusCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  statusSubtitle: { fontSize: 13, color: '#708090', marginTop: 2 },
  statusReady: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  statusReadyTitle: { fontSize: 14, fontWeight: '500', color: '#4ADE80' },
  statusReadySubtitle: { fontSize: 12, color: '#708090', marginTop: 2 },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  statusPendingTitle: { fontSize: 14, fontWeight: '500', color: '#FBBF24' },
  statusPendingSubtitle: { fontSize: 12, color: '#708090', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  linkedBadgeText: { fontSize: 11, color: '#4ADE80', fontWeight: '600' },
  achInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
    marginTop: 8,
    marginBottom: 12,
  },
  achInfoTitle: { fontSize: 14, fontWeight: '500', color: '#fff' },
  achInfoSubtitle: { fontSize: 12, color: '#708090', marginTop: 2 },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  pmIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmInfo: { flex: 1, marginLeft: 12 },
  pmName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  pmDetails: { fontSize: 13, color: '#708090', marginTop: 2 },
  defaultBadge: { color: '#60A5FA' },
  actionButton: { padding: 8 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(127, 255, 212, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addButtonText: { color: '#7FFFD4', fontWeight: '500' },
});
