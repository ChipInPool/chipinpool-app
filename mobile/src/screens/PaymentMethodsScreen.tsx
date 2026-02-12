import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentMethodsScreen() {
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading, refetch } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: api.bankAccounts.list,
  });

  const { data: connectStatus } = useQuery({
    queryKey: ['stripeConnectStatus'],
    queryFn: api.stripe.getConnectStatus,
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

  const onboardingMutation = useMutation({
    mutationFn: api.stripe.createOnboardingLink,
    onSuccess: (result) => {
      if (result?.url) {
        Linking.openURL(result.url);
      } else {
        Alert.alert('Error', 'Could not get verification link. Please try again.');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to start verification');
    },
  });

  const accounts = bankAccounts?.accounts || [];
  const bankAccountsList = accounts.filter((a: any) => a.accountType === 'checking' || a.accountType === 'savings');
  const debitCardsList = accounts.filter((a: any) => a.accountType === 'debit');

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

  const handleAddDebitCard = () => {
    Alert.alert(
      'Add Debit Card',
      'To add a debit card, please use the web app. Card linking uses Stripe Financial Connections for secure verification.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />}
    >
      <View style={styles.verificationCard}>
        <View style={styles.verificationHeader}>
          <Ionicons name="shield-checkmark" size={24} color={connectStatus?.payoutsEnabled ? '#7FFFD4' : '#FBBF24'} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.verificationTitle}>Payout Verification</Text>
            <Text style={styles.verificationSubtitle}>
              {connectStatus?.payoutsEnabled ? 'Verified - Ready for payouts' : 'Required to receive withdrawals'}
            </Text>
          </View>
        </View>
        {!connectStatus?.payoutsEnabled && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => onboardingMutation.mutate()}
            disabled={onboardingMutation.isPending}
          >
            <Text style={styles.verifyButtonText}>
              {onboardingMutation.isPending ? 'Loading...' : 'Complete Verification'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#001F3F" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={20} color="#60A5FA" />
          <Text style={styles.sectionTitle}>Bank Accounts</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Standard withdrawals (1-3 days, free)</Text>
        
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
                style={styles.setDefaultButton}
                data-testid={`button-set-default-${account.id}`}
              >
                <Ionicons name="star-outline" size={18} color="#7FFFD4" />
              </TouchableOpacity>
            )}
            {account.isDefault && (
              <View style={styles.setDefaultButton}>
                <Ionicons name="star" size={18} color="#7FFFD4" />
              </View>
            )}
            <TouchableOpacity onPress={() => handleDelete(account.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity style={styles.addButton} onPress={handleLinkBank}>
          <Ionicons name="add-circle-outline" size={20} color="#7FFFD4" />
          <Text style={styles.addButtonText}>Link Bank Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={20} color="#F472B6" />
          <Text style={styles.sectionTitle}>Debit Cards</Text>
          <View style={styles.instantBadge}>
            <Ionicons name="flash" size={12} color="#7FFFD4" />
            <Text style={styles.instantBadgeText}>Instant</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>Instant withdrawals (~30 min, 1.5% fee)</Text>
        
        {debitCardsList.map((card: any) => (
          <View key={card.id} style={styles.paymentMethod}>
            <View style={[styles.pmIcon, { backgroundColor: 'rgba(244, 114, 182, 0.2)' }]}>
              <Ionicons name="card" size={20} color="#F472B6" />
            </View>
            <View style={styles.pmInfo}>
              <Text style={styles.pmName}>{card.institutionName}</Text>
              <Text style={styles.pmDetails}>
                ••••{card.accountMask}
                {card.isDefault && <Text style={styles.defaultBadge}> (Default)</Text>}
              </Text>
            </View>
            {!card.isDefault && (
              <TouchableOpacity
                onPress={() => setDefaultMutation.mutate(card.id)}
                style={styles.setDefaultButton}
                data-testid={`button-set-default-${card.id}`}
              >
                <Ionicons name="star-outline" size={18} color="#7FFFD4" />
              </TouchableOpacity>
            )}
            {card.isDefault && (
              <View style={styles.setDefaultButton}>
                <Ionicons name="star" size={18} color="#7FFFD4" />
              </View>
            )}
            <TouchableOpacity onPress={() => handleDelete(card.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity style={styles.addButton} onPress={handleAddDebitCard}>
          <Ionicons name="add-circle-outline" size={20} color="#7FFFD4" />
          <Text style={styles.addButtonText}>Add Debit Card</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 16 },
  verificationCard: { backgroundColor: 'rgba(127, 255, 212, 0.1)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.2)' },
  verificationHeader: { flexDirection: 'row', alignItems: 'center' },
  verificationTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  verificationSubtitle: { fontSize: 13, color: '#708090', marginTop: 2 },
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  verifyButtonText: { color: '#001F3F', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  sectionSubtitle: { fontSize: 13, color: '#708090', marginBottom: 12 },
  instantBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(127, 255, 212, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  instantBadgeText: { fontSize: 11, color: '#7FFFD4', fontWeight: '500' },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, marginBottom: 8 },
  pmIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(96, 165, 250, 0.2)', alignItems: 'center', justifyContent: 'center' },
  pmInfo: { flex: 1, marginLeft: 12 },
  pmName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  pmDetails: { fontSize: 13, color: '#708090', marginTop: 2 },
  defaultBadge: { color: '#7FFFD4' },
  setDefaultButton: { padding: 8 },
  deleteButton: { padding: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.3)', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addButtonText: { color: '#7FFFD4', fontWeight: '500' },
});
