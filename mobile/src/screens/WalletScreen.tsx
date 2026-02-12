import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

  const handleComingSoon = () => {
    Alert.alert('Coming Soon', 'This feature will be available soon');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#7FFFD4" />}
      >
        <LinearGradient
          colors={['#0D2B4E', '#1A3A5C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </LinearGradient>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleComingSoon} data-testid="button-add-funds">
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(127, 255, 212, 0.15)' }]}>
              <Ionicons name="add" size={26} color="#7FFFD4" />
            </View>
            <Text style={styles.actionLabel}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleComingSoon} data-testid="button-withdraw">
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <Ionicons name="arrow-up" size={26} color="#60A5FA" />
            </View>
            <Text style={styles.actionLabel}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleComingSoon} data-testid="button-transfer">
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 114, 182, 0.15)' }]}>
              <Ionicons name="swap-horizontal" size={26} color="#F472B6" />
            </View>
            <Text style={styles.actionLabel}>Transfer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.sectionDivider} />
          </View>

          {transactions?.slice(0, 10).map((tx: any) => {
            const isDeposit = tx.type === 'deposit';
            return (
              <View key={tx.id} style={styles.transactionRow} data-testid={`row-transaction-${tx.id}`}>
                <View style={[styles.txIcon, { backgroundColor: isDeposit ? 'rgba(76, 175, 80, 0.15)' : 'rgba(239, 83, 80, 0.15)' }]}>
                  <Ionicons
                    name={isDeposit ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={isDeposit ? '#4CAF50' : '#EF5350'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDescription}>{tx.description || tx.type}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: isDeposit ? '#4CAF50' : '#fff' }]}>
                  {isDeposit ? '+' : '-'}${parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}

          {(!transactions || transactions.length === 0) && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#708090" />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Your transaction history will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    top: -30,
    right: -20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -20,
    left: 20,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(127, 255, 212, 0.05)',
    top: 20,
    left: -10,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {},
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    marginLeft: 14,
  },
  txDescription: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 15,
    textTransform: 'capitalize',
  },
  txDate: {
    color: '#708090',
    fontSize: 12,
    marginTop: 3,
  },
  txAmount: {
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#708090',
    fontSize: 14,
    marginTop: 6,
  },
});
