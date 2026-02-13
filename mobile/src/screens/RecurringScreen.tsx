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
import { useTheme } from '@/theme/ThemeContext';

interface RecurringContribution {
  id: string;
  poolId: string;
  userId: string;
  amount: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  paymentMethod?: string;
  bankAccountId?: string;
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
  const { colors, isDark } = useTheme();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<RecurringContribution | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  const walletBalance = parseFloat(user?.walletBalance || user?.balance || '0');

  const frequencyColors: Record<string, { bg: string; text: string }> = {
    weekly: { bg: 'rgba(74,144,217,0.15)', text: colors.blue },
    monthly: { bg: 'rgba(52,211,153,0.15)', text: colors.green },
    quarterly: { bg: 'rgba(167,139,250,0.15)', text: colors.purple },
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'rgba(52,211,153,0.15)', text: colors.green },
    paused: { bg: 'rgba(251,191,36,0.15)', text: colors.yellow },
    cancelled: { bg: 'rgba(248,113,113,0.15)', text: colors.red },
  };

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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.mint} />
          <Text style={[styles.loadingText, { color: colors.slate }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recurring Contributions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.mint} />}
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-wallet-balance">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(74,144,217,0.15)' }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.blue} />
            </View>
            <Text style={[styles.statLabel, { color: colors.slate }]}>Wallet Balance</Text>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="text-wallet-balance">
              ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-active-count">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
              <Ionicons name="play-outline" size={20} color={colors.green} />
            </View>
            <Text style={[styles.statLabel, { color: colors.slate }]}>Active</Text>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="text-active-count">{activeContributions.length}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-monthly-total">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(127,255,212,0.15)' }]}>
              <Ionicons name="trending-up-outline" size={20} color={colors.mint} />
            </View>
            <Text style={[styles.statLabel, { color: colors.slate }]}>Monthly Total</Text>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="text-monthly-total">
              ${totalMonthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-total-setups">
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
              <Ionicons name="repeat-outline" size={20} color={colors.purple} />
            </View>
            <Text style={[styles.statLabel, { color: colors.slate }]}>Total Setups</Text>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="text-total-setups">{contributions.length}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Recurring Payments</Text>
        </View>

        {contributions.length === 0 ? (
          <View style={styles.emptyState} data-testid="text-empty-state">
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
              <Ionicons name="repeat-outline" size={40} color={colors.slate} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recurring Contributions</Text>
            <Text style={[styles.emptyDescription, { color: colors.slate }]}>
              Set up automatic contributions to pools you care about. Visit any pool to enable recurring payments.
            </Text>
          </View>
        ) : (
          contributions.map((contribution) => (
            <View
              key={contribution.id}
              style={[styles.contributionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              data-testid={`card-recurring-${contribution.id}`}
            >
              <View style={styles.contributionTop}>
                <LinearGradient
                  colors={[colors.mint + '33', colors.mint + '1A']}
                  style={styles.contributionIcon}
                >
                  <Ionicons name="repeat-outline" size={20} color={colors.mint} />
                </LinearGradient>
                <View style={styles.contributionInfo}>
                  <Text style={[styles.poolTitle, { color: colors.text }]} data-testid={`text-pool-title-${contribution.id}`} numberOfLines={1}>
                    {contribution.pool?.title || 'Pool'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: frequencyColors[contribution.frequency]?.bg || colors.card }]}>
                      <Text style={[styles.badgeText, { color: frequencyColors[contribution.frequency]?.text || colors.slate }]}>
                        {contribution.frequency === 'weekly' ? 'Weekly' : contribution.frequency === 'monthly' ? 'Monthly' : 'Quarterly'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColors[contribution.status]?.bg || colors.card }]}>
                      <Text style={[styles.badgeText, { color: statusColors[contribution.status]?.text || colors.slate }]}>
                        {contribution.status}
                      </Text>
                    </View>
                    {contribution.paymentMethod && contribution.paymentMethod !== 'wallet' && (
                      <View style={[styles.badge, { backgroundColor: 'rgba(74,144,217,0.15)' }]}>
                        <Ionicons name="business-outline" size={10} color={colors.blue} style={{ marginRight: 3 }} />
                        <Text style={[styles.badgeText, { color: colors.blue }]}>Bank</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.amountSection}>
                  <Text style={[styles.amount, { color: colors.text }]} data-testid={`text-amount-${contribution.id}`}>
                    ${parseFloat(contribution.amount).toFixed(2)}
                  </Text>
                  {contribution.status === 'active' && contribution.nextPaymentDate && (
                    <View style={styles.nextPayment}>
                      <Ionicons name="time-outline" size={12} color={colors.slate} />
                      <Text style={[styles.nextPaymentText, { color: colors.slate }]} data-testid={`text-next-payment-${contribution.id}`}>
                        Next: {formatDate(contribution.nextPaymentDate)}
                      </Text>
                    </View>
                  )}
                  {contribution.status === 'paused' && (
                    <View style={styles.nextPayment}>
                      <Ionicons name="pause" size={12} color={colors.yellow} />
                      <Text style={[styles.nextPaymentText, { color: colors.yellow }]}>Paused</Text>
                    </View>
                  )}
                </View>
              </View>

              {contribution.status !== 'cancelled' && (
                <View style={[styles.actionRow, { borderTopColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleStatus(contribution)}
                    disabled={updateMutation.isPending}
                    data-testid={`button-toggle-${contribution.id}`}
                  >
                    <Ionicons
                      name={contribution.status === 'active' ? 'pause' : 'play'}
                      size={18}
                      color={colors.mint}
                    />
                    <Text style={[styles.actionText, { color: colors.mint }]}>
                      {contribution.status === 'active' ? 'Pause' : 'Resume'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPress(contribution)}
                    data-testid={`button-edit-${contribution.id}`}
                  >
                    <Ionicons name="pencil" size={18} color={colors.blue} />
                    <Text style={[styles.actionText, { color: colors.blue }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCancelPress(contribution.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-cancel-${contribution.id}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                    <Text style={[styles.actionText, { color: colors.red }]}>Cancel</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.navyLight }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Recurring Contribution</Text>
            <Text style={[styles.modalDescription, { color: colors.slate }]}>
              Update the amount or frequency of this recurring contribution.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.slate }]}>Amount ($)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="0.00"
              placeholderTextColor={colors.slate}
              keyboardType="decimal-pad"
              data-testid="input-edit-amount"
            />

            <Text style={[styles.inputLabel, { color: colors.slate }]}>Frequency</Text>
            <View style={styles.frequencyPicker}>
              {(['weekly', 'monthly', 'quarterly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    editFrequency === freq && { backgroundColor: 'rgba(127,255,212,0.15)', borderColor: colors.mint },
                  ]}
                  onPress={() => setEditFrequency(freq)}
                  data-testid={`button-frequency-${freq}`}
                >
                  <Text
                    style={[
                      styles.frequencyOptionText,
                      { color: colors.slate },
                      editFrequency === freq && { color: colors.mint },
                    ]}
                  >
                    {freq === 'weekly' ? 'Weekly' : freq === 'monthly' ? 'Monthly' : 'Quarterly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => setEditModalVisible(false)}
                data-testid="button-cancel-edit"
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  { backgroundColor: colors.mint },
                  (!editAmount || parseFloat(editAmount) <= 0 || updateMutation.isPending) && styles.modalSaveButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={!editAmount || parseFloat(editAmount) <= 0 || updateMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color={isDark ? '#001F3F' : '#FFFFFF'} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>Save Changes</Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
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
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  contributionCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  nextPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextPaymentText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
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
    borderWidth: 1,
  },
  frequencyOptionText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
