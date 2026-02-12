import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share, Modal, TextInput } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function PoolDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { poolId } = route.params;

  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');

  const { data: pool, isLoading, isError } = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => api.pools.get(poolId),
  });

  const { data: contributions } = useQuery({
    queryKey: ['contributions', poolId],
    queryFn: () => api.pools.getContributions(poolId),
    enabled: !!pool,
  });

  const contributeMutation = useMutation({
    mutationFn: (amount: string) => api.pools.contribute(poolId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool', poolId] });
      queryClient.invalidateQueries({ queryKey: ['contributions', poolId] });
      setShowContribute(false);
      setContributeAmount('');
      Alert.alert('Success', 'Contribution added successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to contribute');
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

  const currentAmount = parseFloat(pool.currentAmount) || 0;
  const targetAmount = parseFloat(pool.targetAmount) || 0;
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const categoryColor = getCategoryColor(pool.category);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={getCategoryIcon(pool.category)} size={36} color={categoryColor} />
        </View>
        <Text style={styles.title} data-testid="text-pool-title">{pool.title}</Text>
        {pool.description ? (
          <Text style={styles.description} data-testid="text-pool-description">{pool.description}</Text>
        ) : null}
      </View>

      <View style={styles.infoCardsRow}>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(127,255,212,0.15)' }]}>
            <Ionicons name="pricetag-outline" size={16} color="#7FFFD4" />
          </View>
          <Text style={styles.infoCardLabel}>Category</Text>
          <Text style={styles.infoCardValue} data-testid="text-pool-category">{pool.category || 'General'}</Text>
        </View>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
            <Ionicons name="calendar-outline" size={16} color="#60A5FA" />
          </View>
          <Text style={styles.infoCardLabel}>Deadline</Text>
          <Text style={styles.infoCardValue} data-testid="text-pool-deadline">
            {pool.deadline ? new Date(pool.deadline).toLocaleDateString() : 'None'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: pool.status === 'active' ? 'rgba(127,255,212,0.15)' : 'rgba(251,191,36,0.15)' }]}>
            <Ionicons name="flag-outline" size={16} color={pool.status === 'active' ? '#7FFFD4' : '#FBBF24'} />
          </View>
          <Text style={styles.infoCardLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: pool.status === 'active' ? 'rgba(127,255,212,0.15)' : 'rgba(251,191,36,0.15)' }]}>
            <Text style={[styles.statusText, { color: pool.status === 'active' ? '#7FFFD4' : '#FBBF24' }]} data-testid="text-pool-status">
              {pool.status || 'Active'}
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
        onPress={() => setShowContribute(true)}
        activeOpacity={0.8}
        data-testid="button-contribute"
      >
        <Ionicons name="add-circle" size={22} color="#001F3F" />
        <Text style={styles.primaryButtonText}>Contribute</Text>
      </TouchableOpacity>

      <View style={styles.secondaryButtonsRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare} activeOpacity={0.7} data-testid="button-share">
          <Ionicons name="share-outline" size={20} color="#7FFFD4" />
          <Text style={styles.secondaryButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SpendNow')}
          activeOpacity={0.7}
          data-testid="button-spend-now"
        >
          <Ionicons name="bag-handle-outline" size={20} color="#7FFFD4" />
          <Text style={styles.secondaryButtonText}>Spend Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={20} color="#7FFFD4" />
          <Text style={styles.sectionTitle}>Contributors</Text>
          {contributions && contributions.length > 0 && (
            <View style={styles.contributorCountBadge}>
              <Text style={styles.contributorCountText}>{contributions.length}</Text>
            </View>
          )}
        </View>
        {contributions?.map((contribution: any) => (
          <View key={contribution.id} style={styles.contributorRow} data-testid={`card-contributor-${contribution.id}`}>
            <View style={styles.contributorAvatar}>
              <Text style={styles.contributorInitials}>
                {contribution.user?.firstName?.[0]}{contribution.user?.lastName?.[0]}
              </Text>
            </View>
            <View style={styles.contributorInfo}>
              <Text style={styles.contributorName}>{contribution.user?.firstName} {contribution.user?.lastName}</Text>
              <Text style={styles.contributorDate}>
                {new Date(contribution.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.contributorAmount}>${parseFloat(contribution.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        ))}
        {(!contributions || contributions.length === 0) && (
          <View style={styles.emptyContributors}>
            <Ionicons name="people-outline" size={32} color="#708090" />
            <Text style={styles.emptyText}>No contributions yet</Text>
            <Text style={styles.emptySubtext}>Be the first to contribute!</Text>
          </View>
        )}
      </View>

      <Modal
        visible={showContribute}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContribute(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowContribute(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Contribute to Pool</Text>
                <Text style={styles.modalSubtitle}>{pool.title}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowContribute(false)} data-testid="button-close-modal">
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
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
              style={[styles.confirmButton, contributeMutation.isPending && styles.confirmButtonDisabled]}
              onPress={handleContribute}
              disabled={contributeMutation.isPending}
              activeOpacity={0.8}
              data-testid="button-confirm-contribute"
            >
              {contributeMutation.isPending ? (
                <ActivityIndicator color="#001F3F" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Contribution</Text>
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
});
