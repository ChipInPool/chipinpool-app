import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

export default function PaymentMethodsScreen() {
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();

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
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.mint} />}
    >
      <View style={[styles.withdrawalStatusCard, { backgroundColor: 'rgba(96, 165, 250, 0.08)', borderColor: 'rgba(96, 165, 250, 0.2)' }]}>
        <View style={styles.statusHeader}>
          <Ionicons name="shield-checkmark" size={22} color={colors.blue} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>Withdrawal Status</Text>
            <Text style={[styles.statusSubtitle, { color: colors.slate }]}>Link a bank account to receive funds</Text>
          </View>
        </View>
        {canReceivePayouts ? (
          <View style={[styles.statusReady, { backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.2)' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.statusReadyTitle, { color: colors.green }]}>Ready to Receive Payouts</Text>
              <Text style={[styles.statusReadySubtitle, { color: colors.slate }]}>You can withdraw funds to your linked accounts</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statusPending, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.2)' }]}>
            <Ionicons name="time" size={20} color={colors.yellow} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.statusPendingTitle, { color: colors.yellow }]}>Link a Payment Method</Text>
              <Text style={[styles.statusPendingSubtitle, { color: colors.slate }]}>Add a bank account for free ACH transfers</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={20} color={colors.blue} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ACH Bank Accounts</Text>
          {bankAccountsList.length > 0 && (
            <View style={[styles.linkedBadge, { backgroundColor: 'rgba(74, 222, 128, 0.15)', borderColor: 'rgba(74, 222, 128, 0.25)' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.green} />
              <Text style={[styles.linkedBadgeText, { color: colors.green }]}>Linked</Text>
            </View>
          )}
        </View>
        <View style={[styles.achInfo, { backgroundColor: 'rgba(96, 165, 250, 0.1)', borderColor: 'rgba(96, 165, 250, 0.2)' }]}>
          <Ionicons name="time-outline" size={18} color={colors.blue} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.achInfoTitle, { color: colors.text }]}>Standard ACH Transfer</Text>
            <Text style={[styles.achInfoSubtitle, { color: colors.slate }]}>1-3 business days, no fees</Text>
          </View>
        </View>

        {bankAccountsList.map((account: any) => (
          <View key={account.id} style={[styles.paymentMethod, { backgroundColor: colors.card }]}>
            <View style={styles.pmIcon}>
              <Ionicons name="business" size={20} color={colors.blue} />
            </View>
            <View style={styles.pmInfo}>
              <Text style={[styles.pmName, { color: colors.text }]}>{account.institutionName}</Text>
              <Text style={[styles.pmDetails, { color: colors.slate }]}>
                {account.accountType} ••••{account.accountMask}
                {account.isDefault && <Text style={{ color: colors.blue }}> (Default)</Text>}
              </Text>
            </View>
            {!account.isDefault && (
              <TouchableOpacity
                onPress={() => setDefaultMutation.mutate(account.id)}
                style={styles.actionButton}
                data-testid={`button-set-default-${account.id}`}
              >
                <Ionicons name="star-outline" size={18} color={colors.mint} />
              </TouchableOpacity>
            )}
            {account.isDefault && (
              <View style={styles.actionButton}>
                <Ionicons name="star" size={18} color={colors.mint} />
              </View>
            )}
            <TouchableOpacity onPress={() => handleDelete(account.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity
          style={[styles.addButton, { borderColor: `${colors.mint}4D` }]}
          onPress={handleLinkBank}
          data-testid="button-link-bank"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.mint} />
          <Text style={[styles.addButtonText, { color: colors.mint }]}>
            {bankAccountsList.length > 0 ? 'Add Another Account' : 'Link Bank Account'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  withdrawalStatusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusTitle: { fontSize: 16, fontWeight: '600' },
  statusSubtitle: { fontSize: 13, marginTop: 2 },
  statusReady: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusReadyTitle: { fontSize: 14, fontWeight: '500' },
  statusReadySubtitle: { fontSize: 12, marginTop: 2 },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPendingTitle: { fontSize: 14, fontWeight: '500' },
  statusPendingSubtitle: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkedBadgeText: { fontSize: 11, fontWeight: '600' },
  achInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  achInfoTitle: { fontSize: 14, fontWeight: '500' },
  achInfoSubtitle: { fontSize: 12, marginTop: 2 },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
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
  pmName: { fontSize: 15, fontWeight: '500' },
  pmDetails: { fontSize: 13, marginTop: 2 },
  actionButton: { padding: 8 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addButtonText: { fontWeight: '500' },
});
