import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function WalletScreen() {
  const { user, refreshUser } = useAuth();

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: api.wallet.getTransactions,
  });

  const balance = parseFloat(user?.balance || '0');

  const handleRefresh = async () => {
    await refreshUser();
    await refetch();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#7FFFD4" />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(127, 255, 212, 0.2)' }]}>
              <Ionicons name="add" size={24} color="#7FFFD4" />
            </View>
            <Text style={styles.actionLabel}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
              <Ionicons name="arrow-up" size={24} color="#60A5FA" />
            </View>
            <Text style={styles.actionLabel}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 114, 182, 0.2)' }]}>
              <Ionicons name="swap-horizontal" size={24} color="#F472B6" />
            </View>
            <Text style={styles.actionLabel}>Transfer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {transactions?.slice(0, 10).map((tx: any) => (
            <View key={tx.id} style={styles.transactionRow}>
              <View style={[styles.txIcon, { backgroundColor: tx.type === 'deposit' ? 'rgba(127, 255, 212, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]}>
                <Ionicons 
                  name={tx.type === 'deposit' ? 'arrow-down' : 'arrow-up'} 
                  size={20} 
                  color={tx.type === 'deposit' ? '#7FFFD4' : '#708090'} 
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDescription}>{tx.description || tx.type}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'deposit' ? '#7FFFD4' : '#fff' }]}>
                {tx.type === 'deposit' ? '+' : '-'}${parseFloat(tx.amount).toLocaleString()}
              </Text>
            </View>
          ))}
          {(!transactions || transactions.length === 0) && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={40} color="#708090" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  balanceCard: { backgroundColor: 'rgba(127, 255, 212, 0.1)', borderRadius: 20, padding: 28, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.2)' },
  balanceLabel: { fontSize: 14, color: '#708090' },
  balanceAmount: { fontSize: 44, fontWeight: 'bold', color: '#7FFFD4', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
  actionButton: { alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '500' },
  section: {},
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, marginBottom: 8 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, marginLeft: 12 },
  txDescription: { color: '#fff', fontWeight: '500', textTransform: 'capitalize' },
  txDate: { color: '#708090', fontSize: 12, marginTop: 2 },
  txAmount: { fontWeight: '600', fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#708090', marginTop: 12 },
});
