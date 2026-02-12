import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';

const COLORS = {
  navy: '#001F3F',
  navyLight: '#002A54',
  mint: '#7FFFD4',
  mintDark: '#5ECFA0',
  slate: '#708090',
  white: '#FFFFFF',
  blue: '#4A90D9',
  green: '#34D399',
  yellow: '#FBBF24',
  purple: '#A78BFA',
  red: '#f87171',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',
};

interface RecurringContribution {
  id: string;
  poolId: string;
  userId: string;
  amount: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  status: string;
  nextPaymentDate: string;
  createdAt: string;
  pool?: {
    id: string;
    title: string;
    targetAmount: string;
    currentAmount: string;
  };
}

const frequencyColors: Record<string, { bg: string; text: string }> = {
  weekly: { bg: 'rgba(74,144,217,0.15)', text: COLORS.blue },
  monthly: { bg: 'rgba(52,211,153,0.15)', text: COLORS.green },
  quarterly: { bg: 'rgba(167,139,250,0.15)', text: COLORS.purple },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(52,211,153,0.15)', text: COLORS.green },
  paused: { bg: 'rgba(251,191,36,0.15)', text: COLORS.yellow },
  cancelled: { bg: 'rgba(248,113,113,0.15)', text: COLORS.red },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return '';
  }
}

export default function RecurringScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<RecurringContribution | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  const walletBalance = parseFloat(user?.walletBalance || user?.balance || '0');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['userRecurring'],
    queryFn: api.recurring.list,
  });

  const contributions: RecurringContribution[] = data?.contributions || [];
  const activeContributions = contributions.filter((c) => c.status === 'active');

  const totalMonthlyAmount = activeContributions.reduce((sum, c) => {
    const amount = parseFloat(c.amount);
    switch (c.frequency) {
      case 'weekly': return sum + amount * 4.33;
      case 'monthly': return sum + amount;
      case 'quarterly': return sum + amount / 3;
      default: return sum;
    }
  }, 0);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.recurring.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRecurring'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.recurring.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRecurring'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to cancel');
    },
  });

  const handleToggleStatus = (contribution: RecurringContribution) => {
    const newStatus = contribution.status === 'active' ? 'paused' : 'active';
    updateMutation.mutate({ id: contribution.id, data: { status: newStatus } });
  };

  const handleEditPress = (contribution: RecurringContribution) => {
    setSelectedContribution(contribution);
    setEditAmount(contribution.amount);
    setEditFrequency(contribution.frequency);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!selectedContribution || !editAmount || parseFloat(editAmount) <= 0) return;
    updateMutation.mutate(
      { id: selectedContribution.id, data: { amount: editAmount, frequency: editFrequency } },
      {
        onSuccess: () => {
          setEditModalVisible(false);
          setSelectedContribution(null);
          setEditAmount('');
        },
      }
    );
  };

  const handleCancelPress = (id: string) => {
    Alert.alert(
      'Cancel Recurring Contribution',
      'Are you sure you want to cancel this recurring contribution? This action cannot be undone.',
      [
        { text: 'Keep Active', style: 'cancel' },
        { text: 'Cancel Contribution', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mint} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recurring Contributions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.mint} />}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard} data-testid="card-wallet-balance">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(74,144,217,0.15)' }]}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.blue} />
            </View>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <Text style={styles.statValue} data-testid="text-wallet-balance">
              ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.statCard} data-testid="card-active-count">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
              <Ionicons name="play-outline" size={20} color={COLORS.green} />
            </View>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue} data-testid="text-active-count">{activeContributions.length}</Text>
          </View>

          <View style={styles.statCard} data-testid="card-monthly-total">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(127,255,212,0.15)' }]}>
              <Ionicons name="trending-up-outline" size={20} color={COLORS.mint} />
            </View>
            <Text style={styles.statLabel}>Monthly Total</Text>
            <Text style={styles.statValue} data-testid="text-monthly-total">
              ${totalMonthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.statCard} data-testid="card-total-setups">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
              <Ionicons name="repeat-outline" size={20} color={COLORS.purple} />
            </View>
            <Text style={styles.statLabel}>Total Setups</Text>
            <Text style={styles.statValue} data-testid="text-total-setups">{contributions.length}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Recurring Payments</Text>
        </View>

        {contributions.length === 0 ? (
          <View style={styles.emptyState} data-testid="text-empty-state">
            <View style={styles.emptyIconWrap}>
              <Ionicons name="repeat-outline" size={40} color={COLORS.slate} />
            </View>
            <Text style={styles.emptyTitle}>No Recurring Contributions</Text>
            <Text style={styles.emptyDescription}>
              Set up automatic contributions to pools you care about. Visit any pool to enable recurring payments.
            </Text>
          </View>
        ) : (
          contributions.map((contribution) => (
            <View
              key={contribution.id}
              style={styles.contributionCard}
              data-testid={`card-recurring-${contribution.id}`}
            >
              <View style={styles.contributionTop}>
                <LinearGradient
                  colors={[COLORS.mint + '33', COLORS.mint + '1A']}
                  style={styles.contributionIcon}
                >
                  <Ionicons name="repeat-outline" size={20} color={COLORS.mint} />
                </LinearGradient>
                <View style={styles.contributionInfo}>
                  <Text style={styles.poolTitle} data-testid={`text-pool-title-${contribution.id}`} numberOfLines={1}>
                    {contribution.pool?.title || 'Pool'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: frequencyColors[contribution.frequency]?.bg || COLORS.cardBg }]}>
                      <Text style={[styles.badgeText, { color: frequencyColors[contribution.frequency]?.text || COLORS.slate }]}>
                        {contribution.frequency === 'weekly' ? 'Weekly' : contribution.frequency === 'monthly' ? 'Monthly' : 'Quarterly'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColors[contribution.status]?.bg || COLORS.cardBg }]}>
                      <Text style={[styles.badgeText, { color: statusColors[contribution.status]?.text || COLORS.slate }]}>
                        {contribution.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.amountSection}>
                  <Text style={styles.amount} data-testid={`text-amount-${contribution.id}`}>
                    ${parseFloat(contribution.amount).toFixed(2)}
                  </Text>
                  {contribution.status === 'active' && contribution.nextPaymentDate && (
                    <View style={styles.nextPayment}>
                      <Ionicons name="time-outline" size={12} color={COLORS.slate} />
                      <Text style={styles.nextPaymentText} data-testid={`text-next-payment-${contribution.id}`}>
                        Next: {formatDate(contribution.nextPaymentDate)}
                      </Text>
                    </View>
                  )}
                  {contribution.status === 'paused' && (
                    <View style={styles.nextPayment}>
                      <Ionicons name="pause" size={12} color={COLORS.yellow} />
                      <Text style={[styles.nextPaymentText, { color: COLORS.yellow }]}>Paused</Text>
                    </View>
                  )}
                </View>
              </View>

              {contribution.status !== 'cancelled' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleStatus(contribution)}
                    disabled={updateMutation.isPending}
                    data-testid={`button-toggle-${contribution.id}`}
                  >
                    <Ionicons
                      name={contribution.status === 'active' ? 'pause' : 'play'}
                      size={18}
                      color={COLORS.mint}
                    />
                    <Text style={styles.actionText}>
                      {contribution.status === 'active' ? 'Pause' : 'Resume'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPress(contribution)}
                    data-testid={`button-edit-${contribution.id}`}
                  >
                    <Ionicons name="pencil" size={18} color={COLORS.blue} />
                    <Text style={[styles.actionText, { color: COLORS.blue }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCancelPress(contribution.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-cancel-${contribution.id}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                    <Text style={[styles.actionText, { color: COLORS.red }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Recurring Contribution</Text>
            <Text style={styles.modalDescription}>
              Update the amount or frequency of this recurring contribution.
            </Text>

            <Text style={styles.inputLabel}>Amount ($)</Text>
            <TextInput
              style={styles.textInput}
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.slate}
              keyboardType="decimal-pad"
              data-testid="input-edit-amount"
            />

            <Text style={styles.inputLabel}>Frequency</Text>
            <View style={styles.frequencyPicker}>
              {(['weekly', 'monthly', 'quarterly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    editFrequency === freq && styles.frequencyOptionActive,
                  ]}
                  onPress={() => setEditFrequency(freq)}
                  data-testid={`button-frequency-${freq}`}
                >
                  <Text
                    style={[
                      styles.frequencyOptionText,
                      editFrequency === freq && styles.frequencyOptionTextActive,
                    ]}
                  >
                    {freq === 'weekly' ? 'Weekly' : freq === 'monthly' ? 'Monthly' : 'Quarterly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
                data-testid="button-cancel-edit"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  (!editAmount || parseFloat(editAmount) <= 0 || updateMutation.isPending) && styles.modalSaveButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={!editAmount || parseFloat(editAmount) <= 0 || updateMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color={COLORS.navy} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.slate,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%' as any,
    flexBasis: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.slate,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
  contributionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  contributionTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contributionInfo: {
    flex: 1,
    marginRight: 10,
  },
  poolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  nextPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextPaymentText: {
    fontSize: 11,
    color: COLORS.slate,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mint,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.navyLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.slate,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 18,
  },
  frequencyPicker: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  frequencyOptionActive: {
    backgroundColor: 'rgba(127,255,212,0.15)',
    borderColor: COLORS.mint,
  },
  frequencyOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate,
  },
  frequencyOptionTextActive: {
    color: COLORS.mint,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.mint,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
});
