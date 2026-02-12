import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share, Modal, TextInput, Linking, Switch, RefreshControl } from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type PoolsStackParamList = {
  PoolsList: undefined;
  PoolDetails: { poolId: string };
  CreatePool: undefined;
};

type RouteProps = RouteProp<PoolsStackParamList, 'PoolDetails'>;

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'Gift': return 'gift-outline';
    case 'Trip': return 'airplane-outline';
    case 'Purchase': return 'cart-outline';
    case 'Event': return 'calendar-outline';
    case 'Recurring': return 'repeat-outline';
    default: return 'ellipsis-horizontal-outline';
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Gift': return '#F472B6';
    case 'Trip': return '#60A5FA';
    case 'Purchase': return '#FBBF24';
    case 'Event': return '#A78BFA';
    case 'Recurring': return '#34D399';
    default: return '#7FFFD4';
  }
};

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return `${diffMonth}mo ago`;
};

const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'contribution': return 'arrow-down' as keyof typeof Ionicons.glyphMap;
    case 'transfer': return 'arrow-up' as keyof typeof Ionicons.glyphMap;
    case 'withdrawal': return 'arrow-up' as keyof typeof Ionicons.glyphMap;
    case 'spend': return 'arrow-up' as keyof typeof Ionicons.glyphMap;
    default: return 'ellipse-outline';
  }
};

const getActivityColor = (type: string): string => {
  switch (type) {
    case 'contribution': return '#34D399';
    case 'transfer': return '#60A5FA';
    case 'withdrawal': return '#FBBF24';
    case 'spend': return '#f87171';
    default: return '#708090';
  }
};

export default function PoolDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { poolId } = route.params;

  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
  const [contributeStep, setContributeStep] = useState<1 | 2>(1);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBankId, setTransferBankId] = useState('');
  const [transferPayoutSpeed, setTransferPayoutSpeed] = useState<'standard' | 'instant'>('standard');

  const [showDistribute, setShowDistribute] = useState(false);
  const [distributions, setDistributions] = useState<{ userId: string; amount: string }[]>([]);
  const [closePoolAfterDistribute, setClosePoolAfterDistribute] = useState(false);
  const [showEditPool, setShowEditPool] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { refreshUser } = useAuth();

  const { data: pool, isLoading, isError } = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => api.pools.get(poolId),
  });

  const { data: contributions } = useQuery({
    queryKey: ['contributions', poolId],
    queryFn: () => api.pools.getContributions(poolId),
    enabled: !!pool,
  });

  const { data: walletData } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: () => api.wallet.getBalance(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.user.getProfile(),
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => api.bankAccounts.list(),
  });

  const { data: activityData } = useQuery({
    queryKey: ['poolActivity', poolId],
    queryFn: () => api.pools.getActivity(poolId),
    enabled: !!pool,
  });

  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData as any)?.accounts || [];
  const walletBalance = walletData?.balance || '0.00';

  const contributorsList = Array.isArray(contributions) && contributions.length > 0
    ? contributions
    : Array.isArray(pool?.contributors) ? pool.contributors : [];

  const activityList = activityData?.activities || [];
  const activitySummary = activityData?.summary || { raised: '0.00', spent: '0.00', remaining: '0.00' };

  const isCreator = pool?.creatorId === currentUser?.id;
  const distributeTotal = distributions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      invalidateAllQueries();
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      invalidateAllQueries();
      refreshUser();
    }, [poolId])
  );

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pool', poolId] });
    queryClient.invalidateQueries({ queryKey: ['contributions', poolId] });
    queryClient.invalidateQueries({ queryKey: ['poolActivity', poolId] });
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.invalidateQueries({ queryKey: ['pools'] });
  };

  const contributeMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (paymentMethod === 'stripe') {
        const result = await api.pools.checkout(poolId, amount);
        if (result?.url) {
          await Linking.openURL(result.url);
        }
        return result;
      } else if (paymentMethod.startsWith('bank_')) {
        const bankAccountId = paymentMethod.replace('bank_', '');
        return api.pools.contributeBank(poolId, amount, bankAccountId);
      } else {
        return api.pools.contribute(poolId, amount);
      }
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowContribute(false);
      setContributeAmount('');
      setContributeStep(1);
      setPaymentMethod('stripe');
      if (paymentMethod === 'stripe') {
        Alert.alert('Stripe Checkout', 'Complete your payment in the browser.');
      } else {
        Alert.alert('Success', 'Contribution added successfully!');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to contribute');
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const data: any = { toUserId: transferRecipient, amount: transferAmount };
      return api.pools.transfer(poolId, data);
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowTransfer(false);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferBankId('');
      setTransferPayoutSpeed('standard');
      Alert.alert('Success', 'Transfer completed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to transfer');
    },
  });

  const distributeMutation = useMutation({
    mutationFn: async () => {
      return api.pools.distribute(poolId, distributions, closePoolAfterDistribute);
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowDistribute(false);
      setDistributions([]);
      setClosePoolAfterDistribute(false);
      Alert.alert('Success', 'Distribution completed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to distribute');
    },
  });

  const editPoolMutation = useMutation({
    mutationFn: async () => {
      const data: any = {};
      if (editTitle.trim()) data.title = editTitle.trim();
      if (editDescription.trim()) data.description = editDescription.trim();
      if (editTargetAmount.trim()) data.targetAmount = editTargetAmount.trim();
      if (editDeadline.trim()) data.deadline = editDeadline.trim();
      data.status = editStatus;
      return api.pools.update(poolId, data);
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowEditPool(false);
      Alert.alert('Success', 'Pool updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update pool');
    },
  });

  const handleContribute = () => {
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }
    contributeMutation.mutate(contributeAmount);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this pool on ChipInPool: https://chipinpool.com/pool/${poolId}`,
        url: `https://chipinpool.com/pool/${poolId}`,
      });
    } catch (error) {}
  };

  const openContributeModal = () => {
    setContributeStep(1);
    setContributeAmount('');
    setPaymentMethod('stripe');
    setShowContribute(true);
  };

  const closeContributeModal = () => {
    setShowContribute(false);
    setContributeStep(1);
    setContributeAmount('');
    setPaymentMethod('stripe');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinnerWrap}>
          <ActivityIndicator size="large" color="#7FFFD4" />
          <Text style={styles.loadingText}>Loading pool details...</Text>
        </View>
      </View>
    );
  }

  if (isError || !pool) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
          <Text style={styles.errorTitle}>Pool Not Found</Text>
          <Text style={styles.errorSubtitle}>This pool may have been removed or is no longer available.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentAmount = parseFloat(pool?.currentAmount ?? '0') || 0;
  const targetAmount = parseFloat(pool?.targetAmount ?? '0') || 0;
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const categoryColor = getCategoryColor(pool?.category ?? '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7FFFD4" />}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={getCategoryIcon(pool.category)} size={36} color={categoryColor} />
        </View>
        <Text style={styles.title} data-testid="text-pool-title">{pool?.title ?? 'Untitled Pool'}</Text>
        {pool?.description ? (
          <Text style={styles.description} data-testid="text-pool-description">{pool.description}</Text>
        ) : null}
      </View>

      <View style={styles.infoCardsRow}>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(127,255,212,0.15)' }]}>
            <Ionicons name="pricetag-outline" size={16} color="#7FFFD4" />
          </View>
          <Text style={styles.infoCardLabel}>Category</Text>
          <Text style={styles.infoCardValue} data-testid="text-pool-category">{pool?.category || 'General'}</Text>
        </View>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
            <Ionicons name="calendar-outline" size={16} color="#60A5FA" />
          </View>
          <Text style={styles.infoCardLabel}>Deadline</Text>
          <Text style={styles.infoCardValue} data-testid="text-pool-deadline">
            {pool?.deadline ? new Date(pool.deadline).toLocaleDateString() : 'None'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: pool?.status === 'active' ? 'rgba(127,255,212,0.15)' : 'rgba(251,191,36,0.15)' }]}>
            <Ionicons name="flag-outline" size={16} color={pool?.status === 'active' ? '#7FFFD4' : '#FBBF24'} />
          </View>
          <Text style={styles.infoCardLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: pool?.status === 'active' ? 'rgba(127,255,212,0.15)' : 'rgba(251,191,36,0.15)' }]}>
            <Text style={[styles.statusText, { color: pool?.status === 'active' ? '#7FFFD4' : '#FBBF24' }]} data-testid="text-pool-status">
              {pool?.status || 'Active'}
            </Text>
          </View>
        </View>
      </View>

      <LinearGradient colors={['#0D2B4E', '#1A3A5C']} style={styles.progressCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.progressHeader}>
          <Ionicons name="wallet-outline" size={20} color="#7FFFD4" />
          <Text style={styles.progressLabel}>Pool Progress</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.currentAmount} data-testid="text-current-amount">${currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.targetAmount} data-testid="text-target-amount">of ${targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        </View>
        <Text style={styles.progressPercent} data-testid="text-progress-percent">{progress.toFixed(1)}% funded</Text>
      </LinearGradient>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('SpendNow')}
        activeOpacity={0.8}
        data-testid="button-spend-now"
      >
        <Ionicons name="bag-handle" size={22} color="#001F3F" />
        <Text style={styles.primaryButtonText}>Spend Now</Text>
      </TouchableOpacity>

      <View style={styles.secondaryButtonsRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={openContributeModal}
          activeOpacity={0.7}
          data-testid="button-contribute"
        >
          <Ionicons name="add-circle-outline" size={20} color="#7FFFD4" />
          <Text style={styles.secondaryButtonText}>Contribute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare} activeOpacity={0.7} data-testid="button-share">
          <Ionicons name="share-outline" size={20} color="#7FFFD4" />
          <Text style={styles.secondaryButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {isCreator && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color="#7FFFD4" />
            <Text style={styles.sectionTitle}>Pool Actions</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setTransferRecipient('');
                setTransferAmount('');
                setTransferBankId('');
                setTransferPayoutSpeed('standard');
                setShowTransfer(true);
              }}
              activeOpacity={0.7}
              data-testid="button-send-contributor"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
                <Ionicons name="send-outline" size={20} color="#60A5FA" />
              </View>
              <Text style={styles.actionButtonText}>Send to Contributor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setDistributions([]);
                setClosePoolAfterDistribute(false);
                setShowDistribute(true);
              }}
              activeOpacity={0.7}
              data-testid="button-distribute"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
                <Ionicons name="git-branch-outline" size={20} color="#A78BFA" />
              </View>
              <Text style={styles.actionButtonText}>Distribute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setEditTitle(pool?.title || '');
                setEditDescription(pool?.description || '');
                setEditTargetAmount(pool?.targetAmount || '');
                setEditDeadline(pool?.deadline ? new Date(pool.deadline).toISOString().split('T')[0] : '');
                setEditStatus(pool?.status || 'active');
                setShowEditPool(true);
              }}
              activeOpacity={0.7}
              data-testid="button-edit-pool"
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                <Ionicons name="create-outline" size={20} color="#FBBF24" />
              </View>
              <Text style={styles.actionButtonText}>Edit Pool</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={20} color="#7FFFD4" />
          <Text style={styles.sectionTitle}>Contributors</Text>
          {contributorsList.length > 0 && (
            <View style={styles.contributorCountBadge}>
              <Text style={styles.contributorCountText}>{contributorsList.length}</Text>
            </View>
          )}
        </View>
        {contributorsList.map((contribution: any, index: number) => (
          <View key={contribution?.id ?? `contrib-${index}`} style={styles.contributorRow} data-testid={`card-contributor-${contribution?.id}`}>
            <View style={styles.contributorAvatar}>
              <Text style={styles.contributorInitials}>
                {contribution?.firstName?.[0] ?? ''}{contribution?.lastName?.[0] ?? ''}
              </Text>
            </View>
            <View style={styles.contributorInfo}>
              <Text style={styles.contributorName}>{contribution?.firstName ?? ''} {contribution?.lastName ?? ''}</Text>
              <Text style={styles.contributorDate}>
                {new Date(contribution?.date ?? contribution?.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.contributorAmount}>${parseFloat(contribution?.totalContributed || contribution?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        ))}
        {contributorsList.length === 0 && (
          <View style={styles.emptyContributors}>
            <Ionicons name="people-outline" size={32} color="#708090" />
            <Text style={styles.emptyText}>No contributions yet</Text>
            <Text style={styles.emptySubtext}>Be the first to contribute!</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pulse-outline" size={20} color="#7FFFD4" />
          <Text style={styles.sectionTitle}>Activity</Text>
        </View>

        <View style={styles.activitySummaryRow}>
          <View style={[styles.activitySummaryCard, { borderColor: 'rgba(52,211,153,0.2)' }]}>
            <Text style={[styles.activitySummaryLabel, { color: '#34D399' }]}>Raised</Text>
            <Text style={[styles.activitySummaryValue, { color: '#34D399' }]}>${parseFloat(activitySummary.raised || '0').toFixed(2)}</Text>
          </View>
          <View style={[styles.activitySummaryCard, { borderColor: 'rgba(248,113,113,0.2)' }]}>
            <Text style={[styles.activitySummaryLabel, { color: '#f87171' }]}>Spent</Text>
            <Text style={[styles.activitySummaryValue, { color: '#f87171' }]}>${parseFloat(activitySummary.spent || '0').toFixed(2)}</Text>
          </View>
          <View style={[styles.activitySummaryCard, { borderColor: 'rgba(96,165,250,0.2)' }]}>
            <Text style={[styles.activitySummaryLabel, { color: '#60A5FA' }]}>Remaining</Text>
            <Text style={[styles.activitySummaryValue, { color: '#60A5FA' }]}>${parseFloat(activitySummary.remaining || '0').toFixed(2)}</Text>
          </View>
        </View>

        {activityList.length > 0 ? activityList.map((activity: any, index: number) => {
          const actColor = getActivityColor(activity.type);
          return (
            <View key={activity.id ?? `activity-${index}`} style={styles.activityRow} data-testid={`card-activity-${activity.id || index}`}>
              <View style={[styles.activityIconWrap, { backgroundColor: `${actColor}20` }]}>
                <Ionicons name={getActivityIcon(activity.type)} size={16} color={actColor} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityDesc} numberOfLines={2}>{activity.description}</Text>
                <Text style={styles.activityTime}>{formatTimeAgo(activity.createdAt || activity.date || new Date().toISOString())}</Text>
              </View>
              {activity.amount && (
                <Text style={[styles.activityAmount, { color: actColor }]}>
                  {activity.type === 'contribution' ? '+' : '-'}${parseFloat(activity.amount).toFixed(2)}
                </Text>
              )}
            </View>
          );
        }) : (
          <View style={styles.emptyContributors}>
            <Ionicons name="pulse-outline" size={32} color="#708090" />
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        )}
      </View>

      {/* Contribute Modal - Two Step Flow */}
      <Modal
        visible={showContribute}
        transparent
        animationType="slide"
        onRequestClose={closeContributeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeContributeModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {contributeStep === 1 ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalTitle}>Contribute to Pool</Text>
                    <Text style={styles.modalSubtitle}>{pool?.title ?? ''}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={closeContributeModal} data-testid="button-close-modal">
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.quickAmountsRow}>
                  {['25', '50', '100'].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickAmountBtn, contributeAmount === amt && styles.quickAmountBtnSelected]}
                      onPress={() => setContributeAmount(amt)}
                      activeOpacity={0.7}
                      data-testid={`button-quick-amount-${amt}`}
                    >
                      <Text style={[styles.quickAmountText, contributeAmount === amt && styles.quickAmountTextSelected]}>${amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.amountInputContainer}>
                  <Text style={styles.dollarPrefix}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#708090"
                    keyboardType="decimal-pad"
                    value={contributeAmount}
                    onChangeText={setContributeAmount}
                    data-testid="input-contribute-amount"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, { marginTop: 8 }, (!contributeAmount || parseFloat(contributeAmount) <= 0) && styles.confirmButtonDisabled]}
                  onPress={() => {
                    const amount = parseFloat(contributeAmount);
                    if (isNaN(amount) || amount <= 0) {
                      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
                      return;
                    }
                    setContributeStep(2);
                  }}
                  disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
                  activeOpacity={0.8}
                  data-testid="button-continue-step2"
                >
                  <Text style={styles.confirmButtonText}>Continue</Text>
                </TouchableOpacity>

                <View style={styles.walletBalanceRow}>
                  <Ionicons name="wallet-outline" size={16} color="#708090" />
                  <Text style={styles.walletBalanceText}>Wallet Balance: ${parseFloat(walletBalance).toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => setContributeStep(1)} data-testid="button-back-step1">
                      <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.modalTitle}>Payment Method</Text>
                      <Text style={styles.modalSubtitle}>Amount: ${parseFloat(contributeAmount).toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={closeContributeModal} data-testid="button-close-modal-step2">
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'stripe' && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setPaymentMethod('stripe')}
                  activeOpacity={0.7}
                  data-testid="button-payment-stripe"
                >
                  <View style={styles.paymentMethodIconWrap}>
                    <Ionicons name="card-outline" size={24} color={paymentMethod === 'stripe' ? '#7FFFD4' : '#708090'} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodName, paymentMethod === 'stripe' && styles.paymentMethodNameSelected]}>Pay with Card</Text>
                    <Text style={styles.paymentMethodDesc}>Secure checkout via Stripe</Text>
                  </View>
                  <View style={[styles.paymentMethodRadio, paymentMethod === 'stripe' && styles.paymentMethodRadioSelected]}>
                    {paymentMethod === 'stripe' && <View style={styles.paymentMethodRadioDot} />}
                  </View>
                </TouchableOpacity>

                {bankAccounts.length > 0 && (
                  <>
                    <Text style={styles.paymentMethodLabel}>Linked Bank Accounts</Text>
                    {bankAccounts.map((account: any) => {
                      const methodKey = `bank_${account.id}`;
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.paymentMethodCard,
                            paymentMethod === methodKey && styles.paymentMethodCardSelected,
                          ]}
                          onPress={() => setPaymentMethod(methodKey)}
                          activeOpacity={0.7}
                          data-testid={`button-payment-bank-${account.id}`}
                        >
                          <View style={styles.paymentMethodIconWrap}>
                            <Ionicons name="business-outline" size={24} color={paymentMethod === methodKey ? '#7FFFD4' : '#708090'} />
                          </View>
                          <View style={styles.paymentMethodInfo}>
                            <Text style={[styles.paymentMethodName, paymentMethod === methodKey && styles.paymentMethodNameSelected]}>
                              {account.bankName || account.institutionName || 'Bank Account'}
                            </Text>
                            <Text style={styles.paymentMethodDesc}>
                              ••••{account.last4 || account.mask || '****'}
                            </Text>
                          </View>
                          <View style={[styles.paymentMethodRadio, paymentMethod === methodKey && styles.paymentMethodRadioSelected]}>
                            {paymentMethod === methodKey && <View style={styles.paymentMethodRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'balance' && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setPaymentMethod('balance')}
                  activeOpacity={0.7}
                  data-testid="button-payment-balance"
                >
                  <View style={styles.paymentMethodIconWrap}>
                    <Ionicons name="wallet-outline" size={24} color={paymentMethod === 'balance' ? '#7FFFD4' : '#708090'} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodName, paymentMethod === 'balance' && styles.paymentMethodNameSelected]}>Wallet Balance</Text>
                    <Text style={styles.paymentMethodDesc}>${parseFloat(walletBalance).toFixed(2)} available</Text>
                  </View>
                  <View style={[styles.paymentMethodRadio, paymentMethod === 'balance' && styles.paymentMethodRadioSelected]}>
                    {paymentMethod === 'balance' && <View style={styles.paymentMethodRadioDot} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, { marginTop: 16 }, contributeMutation.isPending && styles.confirmButtonDisabled]}
                  onPress={handleContribute}
                  disabled={contributeMutation.isPending}
                  activeOpacity={0.8}
                  data-testid="button-confirm-contribute"
                >
                  {contributeMutation.isPending ? (
                    <ActivityIndicator color="#001F3F" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={showTransfer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransfer(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTransfer(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Send to Contributor</Text>
                <Text style={styles.modalSubtitle}>{pool?.title ?? ''}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTransfer(false)} data-testid="button-close-transfer">
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.paymentMethodLabel}>Select Recipient</Text>
            <Text style={{ color: '#708090', fontSize: 12, marginBottom: 8 }}>Funds will be sent to the recipient's wallet</Text>
            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
              {contributorsList.filter((c: any) => c?.userId !== currentUser?.id).map((c: any, i: number) => (
                <TouchableOpacity
                  key={c?.userId || i}
                  style={[styles.paymentMethodCard, transferRecipient === c?.userId && styles.paymentMethodCardSelected]}
                  onPress={() => setTransferRecipient(c?.userId)}
                  activeOpacity={0.7}
                  data-testid={`button-transfer-user-${c?.userId}`}
                >
                  <View style={styles.contributorAvatar}>
                    <Text style={styles.contributorInitials}>{c?.firstName?.[0]}{c?.lastName?.[0]}</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodName, transferRecipient === c?.userId && styles.paymentMethodNameSelected]}>
                      {c?.firstName} {c?.lastName}
                    </Text>
                    <Text style={styles.paymentMethodDesc}>Funds sent to wallet</Text>
                  </View>
                  <View style={[styles.paymentMethodRadio, transferRecipient === c?.userId && styles.paymentMethodRadioSelected]}>
                    {transferRecipient === c?.userId && <View style={styles.paymentMethodRadioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.amountInputContainer, { marginTop: 16 }]}>
              <Text style={styles.dollarPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#708090"
                keyboardType="decimal-pad"
                value={transferAmount}
                onChangeText={setTransferAmount}
                data-testid="input-transfer-amount"
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: 16 }, (transferMutation.isPending || !transferRecipient || !transferAmount) && styles.confirmButtonDisabled]}
              onPress={() => transferMutation.mutate()}
              disabled={transferMutation.isPending || !transferRecipient || !transferAmount}
              activeOpacity={0.8}
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? (
                <ActivityIndicator color="#001F3F" />
              ) : (
                <Text style={styles.confirmButtonText}>Send Transfer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Distribute Modal */}
      <Modal
        visible={showDistribute}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDistribute(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDistribute(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Distribute Funds</Text>
                <Text style={styles.modalSubtitle}>{pool?.title ?? ''}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDistribute(false)} data-testid="button-close-distribute">
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#708090', fontSize: 13 }}>Pool Balance</Text>
                <Text style={{ color: '#7FFFD4', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] as any }}>
                  ${parseFloat(pool?.currentAmount || '0').toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#708090', fontSize: 13 }}>Distributing</Text>
                <Text style={{ color: distributeTotal > parseFloat(pool?.currentAmount || '0') ? '#f87171' : '#FFFFFF', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] as any }}>
                  ${distributeTotal.toFixed(2)}
                </Text>
              </View>
              {distributeTotal > parseFloat(pool?.currentAmount || '0') && (
                <Text style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>
                  Total exceeds pool balance!
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(127,255,212,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(127,255,212,0.2)' }}
                onPress={() => {
                  const validContributors = contributorsList.filter((c: any) => c?.userId);
                  const allRecipients = [...validContributors];
                  if (currentUser && !validContributors.some((c: any) => c?.userId === currentUser.id)) {
                    allRecipients.push({ userId: currentUser.id, firstName: currentUser.firstName, lastName: currentUser.lastName });
                  }
                  if (allRecipients.length === 0) return;
                  const poolBalance = parseFloat(pool?.currentAmount || '0');
                  const perPerson = Math.floor((poolBalance / allRecipients.length) * 100) / 100;
                  const newDistributions = allRecipients.map((c: any) => ({
                    userId: c.userId || c.id,
                    amount: perPerson.toFixed(2),
                  }));
                  setDistributions(newDistributions);
                }}
                activeOpacity={0.7}
                data-testid="button-split-equally"
              >
                <Ionicons name="git-compare-outline" size={18} color="#7FFFD4" />
                <Text style={{ color: '#7FFFD4', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>Split Equally</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(248,113,113,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)' }}
                onPress={() => setDistributions([])}
                activeOpacity={0.7}
                data-testid="button-clear-distribute"
              >
                <Ionicons name="close-circle-outline" size={18} color="#f87171" />
                <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              {currentUser && !contributorsList.some((c: any) => c?.userId === currentUser.id) && (() => {
                const existing = distributions.find(d => d.userId === currentUser.id);
                return (
                  <View key={`owner-${currentUser.id}`} style={styles.distributeRow} data-testid={`distribute-row-owner`}>
                    <View style={[styles.contributorAvatar, { borderWidth: 1, borderColor: '#7FFFD4' }]}>
                      <Text style={styles.contributorInitials}>{currentUser.firstName?.[0]}{currentUser.lastName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.contributorName}>{currentUser.firstName} {currentUser.lastName}</Text>
                      <Text style={{ color: '#7FFFD4', fontSize: 11 }}>Pool Owner</Text>
                    </View>
                    <View style={styles.distributeAmountWrap}>
                      <Text style={styles.dollarPrefix}>$</Text>
                      <TextInput
                        style={styles.distributeAmountInput}
                        placeholder="0"
                        placeholderTextColor="#708090"
                        keyboardType="decimal-pad"
                        value={existing?.amount || ''}
                        onChangeText={(text) => {
                          setDistributions(prev => {
                            const filtered = prev.filter(d => d.userId !== currentUser.id);
                            if (text) {
                              filtered.push({ userId: currentUser.id, amount: text });
                            }
                            return filtered;
                          });
                        }}
                        data-testid={`input-distribute-owner`}
                      />
                    </View>
                  </View>
                );
              })()}
              {contributorsList.map((c: any, i: number) => {
                const existing = distributions.find(d => d.userId === c?.userId);
                return (
                  <View key={c?.userId || i} style={styles.distributeRow} data-testid={`distribute-row-${c?.userId || i}`}>
                    <View style={styles.contributorAvatar}>
                      <Text style={styles.contributorInitials}>{c?.firstName?.[0]}{c?.lastName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.contributorName}>{c?.firstName} {c?.lastName}</Text>
                    </View>
                    <View style={styles.distributeAmountWrap}>
                      <Text style={styles.dollarPrefix}>$</Text>
                      <TextInput
                        style={styles.distributeAmountInput}
                        placeholder="0"
                        placeholderTextColor="#708090"
                        keyboardType="decimal-pad"
                        value={existing?.amount || ''}
                        onChangeText={(text) => {
                          setDistributions(prev => {
                            const filtered = prev.filter(d => d.userId !== c?.userId);
                            if (text) {
                              filtered.push({ userId: c?.userId, amount: text });
                            }
                            return filtered;
                          });
                        }}
                        data-testid={`input-distribute-${c?.userId || i}`}
                      />
                    </View>
                  </View>
                );
              })}
              {contributorsList.length === 0 && (
                <View style={styles.emptyContributors}>
                  <Text style={styles.emptyText}>No contributors to distribute to</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.closePoolRow}>
              <Text style={styles.closePoolText}>Close pool after distribution</Text>
              <Switch
                value={closePoolAfterDistribute}
                onValueChange={setClosePoolAfterDistribute}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(127,255,212,0.3)' }}
                thumbColor={closePoolAfterDistribute ? '#7FFFD4' : '#708090'}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: 16 }, (distributeMutation.isPending || distributions.length === 0 || distributeTotal <= 0 || distributeTotal > parseFloat(pool?.currentAmount || '0')) && styles.confirmButtonDisabled]}
              onPress={() => distributeMutation.mutate()}
              disabled={distributeMutation.isPending || distributions.length === 0 || distributeTotal <= 0 || distributeTotal > parseFloat(pool?.currentAmount || '0')}
              activeOpacity={0.8}
              data-testid="button-confirm-distribute"
            >
              {distributeMutation.isPending ? (
                <ActivityIndicator color="#001F3F" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Distribution</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditPool}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPool(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEditPool(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Edit Pool</Text>
                <Text style={styles.modalSubtitle}>Update pool details</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowEditPool(false)} data-testid="button-close-edit">
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={styles.paymentMethodLabel}>Pool Name</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15 }]}
                placeholder="Pool name"
                placeholderTextColor="#708090"
                value={editTitle}
                onChangeText={setEditTitle}
                data-testid="input-edit-title"
              />

              <Text style={[styles.paymentMethodLabel, { marginTop: 16 }]}>Description</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15, minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Pool description"
                placeholderTextColor="#708090"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                data-testid="input-edit-description"
              />

              <Text style={[styles.paymentMethodLabel, { marginTop: 16 }]}>Target Amount ($)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.dollarPrefix}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#708090"
                  keyboardType="decimal-pad"
                  value={editTargetAmount}
                  onChangeText={setEditTargetAmount}
                  data-testid="input-edit-target"
                />
              </View>

              <Text style={[styles.paymentMethodLabel, { marginTop: 16 }]}>Deadline (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.amountInput, { paddingHorizontal: 16, fontSize: 15 }]}
                placeholder="2025-12-31"
                placeholderTextColor="#708090"
                value={editDeadline}
                onChangeText={setEditDeadline}
                data-testid="input-edit-deadline"
              />

              <Text style={{ fontSize: 14, fontWeight: '600', color: '#8E8E93', marginTop: 16, marginBottom: 8 }}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { value: 'active', label: 'Active', color: '#7FFFD4' },
                  { value: 'paused', label: 'Paused', color: '#FFD700' },
                  { value: 'closed', label: 'Closed', color: '#FF6B6B' },
                  { value: 'completed', label: 'Completed', color: '#4CAF50' },
                  { value: 'expired', label: 'Expired', color: '#999' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setEditStatus(option.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: editStatus === option.value ? option.color : 'rgba(255,255,255,0.1)',
                      backgroundColor: editStatus === option.value ? `${option.color}20` : 'rgba(255,255,255,0.05)',
                    }}
                    data-testid={`button-status-${option.value}`}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: editStatus === option.value ? '700' : '500',
                      color: editStatus === option.value ? option.color : '#8E8E93',
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
                {editStatus === 'paused' ? 'Contributions temporarily suspended' :
                 editStatus === 'closed' ? 'Pool closed. Can be reopened later.' :
                 editStatus === 'completed' ? 'Pool goal has been reached' :
                 editStatus === 'expired' ? 'Pool deadline has passed' :
                 'Pool is open for contributions'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: 16 }, editPoolMutation.isPending && styles.confirmButtonDisabled]}
              onPress={() => editPoolMutation.mutate()}
              disabled={editPoolMutation.isPending}
              activeOpacity={0.8}
              data-testid="button-confirm-edit"
            >
              {editPoolMutation.isPending ? (
                <ActivityIndicator color="#001F3F" />
              ) : (
                <Text style={styles.confirmButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001F3F',
  },
  loadingSpinnerWrap: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#708090',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001F3F',
    padding: 24,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  errorTitle: {
    color: '#f87171',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  errorSubtitle: {
    color: '#708090',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: 'rgba(248,113,113,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  errorButtonText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 15,
    color: '#708090',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoCardLabel: {
    color: '#708090',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.15)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressLabel: {
    color: '#708090',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currentAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#7FFFD4',
    letterSpacing: -0.5,
  },
  targetAmount: {
    fontSize: 16,
    color: '#708090',
    marginLeft: 8,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7FFFD4',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 14,
    color: '#7FFFD4',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#7FFFD4',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#001F3F',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(127,255,212,0.25)',
  },
  secondaryButtonText: {
    color: '#7FFFD4',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  contributorCountBadge: {
    backgroundColor: 'rgba(127,255,212,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  contributorCountText: {
    color: '#7FFFD4',
    fontSize: 13,
    fontWeight: '700',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  contributorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(127,255,212,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.25)',
  },
  contributorInitials: {
    color: '#7FFFD4',
    fontWeight: '700',
    fontSize: 15,
  },
  contributorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contributorName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  contributorDate: {
    color: '#708090',
    fontSize: 12,
    marginTop: 3,
  },
  contributorAmount: {
    color: '#7FFFD4',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyContributors: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyText: {
    color: '#708090',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#708090',
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#0A1929',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(127,255,212,0.1)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#708090',
    marginTop: 4,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(127,255,212,0.2)',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  dollarPrefix: {
    color: '#7FFFD4',
    fontSize: 22,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingVertical: 16,
  },
  confirmButton: {
    backgroundColor: '#7FFFD4',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#001F3F',
    fontSize: 17,
    fontWeight: '700',
  },
  paymentMethodLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  paymentMethodCardSelected: {
    borderColor: '#7FFFD4',
    backgroundColor: 'rgba(127,255,212,0.08)',
  },
  paymentMethodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 14,
  },
  paymentMethodName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  paymentMethodNameSelected: {
    color: '#7FFFD4',
  },
  paymentMethodDesc: {
    color: '#708090',
    fontSize: 12,
    marginTop: 2,
  },
  paymentMethodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodRadioSelected: {
    borderColor: '#7FFFD4',
  },
  paymentMethodRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7FFFD4',
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickAmountBtnSelected: {
    borderColor: '#7FFFD4',
    backgroundColor: 'rgba(127,255,212,0.08)',
  },
  quickAmountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickAmountTextSelected: {
    color: '#7FFFD4',
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  walletBalanceText: {
    color: '#708090',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  activitySummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  activitySummaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  activitySummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  activitySummaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityDesc: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  activityTime: {
    color: '#708090',
    fontSize: 12,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  distributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  distributeAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.2)',
    width: 100,
  },
  distributeAmountInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingVertical: 10,
  },
  closePoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  closePoolText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  payoutSpeedBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  payoutSpeedBtnSelected: {
    borderColor: '#7FFFD4',
    backgroundColor: 'rgba(127,255,212,0.08)',
  },
  payoutSpeedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  payoutSpeedTextSelected: {
    color: '#7FFFD4',
  },
  payoutSpeedSubtext: {
    color: '#708090',
    fontSize: 11,
    marginTop: 2,
  },
});
