import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, Linking, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

export default function WalletScreen() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshUser();
        queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    }, [])
  );

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: api.wallet.getTransactions,
  });

  const balance = parseFloat(user?.balance ?? user?.walletBalance ?? '0') || 0;

  const handleRefresh = async () => {
    await refreshUser();
    await refetch();
  };

  const depositMutation = useMutation({
    mutationFn: (depositAmount: string) => api.wallet.depositCheckout(depositAmount),
    onSuccess: (response) => {
      setShowDepositModal(false);
      setAmount('');
      const checkoutUrl = response?.url || response?.checkoutUrl;
      if (checkoutUrl) {
        Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Success', 'Deposit initiated successfully');
        refreshUser();
        queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to process deposit');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (withdrawAmount: string) => {
      const bankAccountsData = await api.bankAccounts.list();
      const accounts = bankAccountsData?.accounts || [];
      if (accounts.length === 0) {
        throw new Error('No bank account linked. Please go to Profile > Payment Methods to link a bank account first.');
      }
      const defaultAccount = accounts.find((a: any) => a.isDefault) || accounts[0];
      return api.wallet.withdraw(withdrawAmount, defaultAccount.id.toString());
    },
    onSuccess: () => {
      setShowWithdrawModal(false);
      setAmount('');
      Alert.alert('Success', 'Withdrawal initiated successfully');
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to process withdrawal');
    },
  });

  const handleDeposit = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than $0');
      return;
    }
    depositMutation.mutate(parsedAmount.toString());
  };

  const handleWithdraw = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than $0');
      return;
    }
    if (parsedAmount > balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance');
      return;
    }
    withdrawMutation.mutate(parsedAmount.toString());
  };

  const handleComingSoon = () => {
    Alert.alert('Coming Soon', 'This feature will be available soon');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr || Date.now());
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderAmountModal = (visible: boolean, onClose: () => void, onSubmit: () => void, title: string, isPending: boolean) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#0D2B4E' : colors.navyLight, borderColor: `${colors.mint}33` }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {title === 'Add Funds' ? 'Enter the amount to deposit' : 'Enter the amount to withdraw'}
          </Text>
          <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBg, borderColor: `${colors.mint}33` }]}>
            <Text style={[styles.dollarSign, { color: colors.mint }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>
          {title === 'Withdraw' && (
            <Text style={[styles.balanceHint, { color: colors.textSecondary }]}>Available: ${balance.toFixed(2)}</Text>
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.cardBorder }]}
              onPress={() => { onClose(); setAmount(''); }}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, { backgroundColor: colors.mint }, isPending && styles.modalButtonDisabled]}
              onPress={onSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={isDark ? '#001F3F' : '#FFFFFF'} />
              ) : (
                <Text style={[styles.modalSubmitText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>{title === 'Add Funds' ? 'Continue' : 'Withdraw'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.mint} />}
      >
        <LinearGradient
          colors={isDark ? ['#0D2B4E', '#1A3A5C'] : [colors.navyLight, colors.navyLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, !isDark && { borderWidth: 1, borderColor: colors.cardBorder }]}
        >
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />
          <Text style={[styles.balanceLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>Available Balance</Text>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </LinearGradient>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowDepositModal(true)} data-testid="button-add-funds">
            <View style={[styles.actionIcon, { backgroundColor: `${colors.mint}26` }]}>
              <Ionicons name="add" size={26} color={colors.mint} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowWithdrawModal(true)} data-testid="button-withdraw">
            <View style={[styles.actionIcon, { backgroundColor: `${colors.blue}26` }]}>
              <Ionicons name="arrow-up" size={26} color={colors.blue} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleComingSoon} data-testid="button-transfer">
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 114, 182, 0.15)' }]}>
              <Ionicons name="swap-horizontal" size={26} color="#F472B6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Transfer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <View style={[styles.sectionDivider, { backgroundColor: colors.cardBorder }]} />
          </View>

          <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {(Array.isArray(transactions) ? transactions : []).slice(0, 5).map((tx: any) => {
              const isDeposit = tx?.type === 'deposit';
              const status = tx?.status || 'completed';
              const statusColor = status === 'completed' ? colors.green : status === 'pending' ? colors.yellow : status === 'failed' ? colors.red : colors.textSecondary;
              return (
                <View key={tx?.id ?? Math.random()} style={[styles.transactionRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`row-transaction-${tx?.id}`}>
                  <View style={[styles.txIcon, { backgroundColor: isDeposit ? 'rgba(76, 175, 80, 0.15)' : 'rgba(239, 83, 80, 0.15)' }]}>
                    <Ionicons
                      name={isDeposit ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color={isDeposit ? '#4CAF50' : '#EF5350'}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txDescription, { color: colors.text }]}>{tx?.description || tx?.type || 'Transaction'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>{formatDate(tx?.createdAt ?? '')}</Text>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textSecondary }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor, textTransform: 'capitalize' }}>{status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: isDeposit ? '#4CAF50' : colors.text }]}>
                    {isDeposit ? '+' : '-'}${parseFloat(tx?.amount ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              );
            })}

            {(!transactions || transactions.length === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Your transaction history will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {renderAmountModal(showDepositModal, () => setShowDepositModal(false), handleDeposit, 'Add Funds', depositMutation.isPending)}
      {renderAmountModal(showWithdrawModal, () => setShowWithdrawModal(false), handleWithdraw, 'Withdraw', withdrawMutation.isPending)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
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
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
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
    fontWeight: '500',
    fontSize: 15,
    textTransform: 'capitalize',
  },
  txDate: {
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
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 12,
  },
  balanceHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    fontSize: 16,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
