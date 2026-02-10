import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share, Modal, TextInput } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

type PoolsStackParamList = {
  PoolsList: undefined;
  PoolDetails: { poolId: string };
  CreatePool: undefined;
};

type RouteProps = RouteProp<PoolsStackParamList, 'PoolDetails'>;

export default function PoolDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { poolId } = route.params;

  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');

  const { data: pool, isLoading } = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => api.pools.get(poolId),
  });

  const { data: contributions } = useQuery({
    queryKey: ['contributions', poolId],
    queryFn: () => api.pools.getContributions(poolId),
    enabled: !!pool,
  });

  const contributeMutation = useMutation({
    mutationFn: (amount: number) => api.pools.contribute(poolId, amount),
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
    contributeMutation.mutate(amount);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this pool on ChipIn: https://chipinpool.azurewebsites.net/pool/${poolId}`,
        url: `https://chipinpool.azurewebsites.net/pool/${poolId}`,
      });
    } catch (error) {}
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7FFFD4" />
      </View>
    );
  }

  if (!pool) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Pool not found</Text>
      </View>
    );
  }

  const progress = parseFloat(pool.targetAmount) > 0
    ? (parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{pool.emoji || '💰'}</Text>
        <Text style={styles.name}>{pool.name}</Text>
        <Text style={styles.description}>{pool.description}</Text>
      </View>

      <View style={styles.infoCardsRow}>
        <View style={styles.infoCard}>
          <Ionicons name="pricetag-outline" size={18} color="#7FFFD4" />
          <Text style={styles.infoCardLabel}>Type</Text>
          <Text style={styles.infoCardValue}>{pool.type || pool.category || 'General'}</Text>
        </View>
        {pool.deadline && (
          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={18} color="#60A5FA" />
            <Text style={styles.infoCardLabel}>Deadline</Text>
            <Text style={styles.infoCardValue}>{new Date(pool.deadline).toLocaleDateString()}</Text>
          </View>
        )}
        <View style={styles.infoCard}>
          <Ionicons name="flag-outline" size={18} color="#FBBF24" />
          <Text style={styles.infoCardLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: pool.status === 'active' ? 'rgba(127,255,212,0.2)' : 'rgba(251,191,36,0.2)' }]}>
            <Text style={[styles.statusText, { color: pool.status === 'active' ? '#7FFFD4' : '#FBBF24' }]}>
              {pool.status || 'Active'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.amountRow}>
          <Text style={styles.currentAmount}>${parseFloat(pool.currentAmount).toLocaleString()}</Text>
          <Text style={styles.targetAmount}>of ${parseFloat(pool.targetAmount).toLocaleString()}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.progressPercent}>{progress.toFixed(0)}% funded</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => setShowContribute(true)}
          data-testid="button-contribute"
        >
          <Ionicons name="add-circle" size={20} color="#001F3F" />
          <Text style={styles.primaryActionText}>Contribute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={handleShare} data-testid="button-share">
          <Ionicons name="share-outline" size={20} color="#7FFFD4" />
          <Text style={styles.secondaryActionText}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.spendNowButton}
        onPress={() => navigation.navigate('SpendNow')}
        data-testid="button-spend-now"
      >
        <Ionicons name="bag-handle" size={20} color="#001F3F" />
        <Text style={styles.spendNowText}>Spend Now</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contributors</Text>
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
                {new Date(contribution.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.contributorAmount}>${parseFloat(contribution.amount).toLocaleString()}</Text>
          </View>
        ))}
        {(!contributions || contributions.length === 0) && (
          <Text style={styles.emptyText}>No contributions yet. Be the first!</Text>
        )}
      </View>

      <Modal
        visible={showContribute}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContribute(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contribute to Pool</Text>
              <TouchableOpacity onPress={() => setShowContribute(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{pool.name}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              placeholderTextColor="#708090"
              keyboardType="decimal-pad"
              value={contributeAmount}
              onChangeText={setContributeAmount}
              data-testid="input-contribute-amount"
            />
            <TouchableOpacity
              style={[styles.confirmButton, contributeMutation.isPending && styles.confirmButtonDisabled]}
              onPress={handleContribute}
              disabled={contributeMutation.isPending}
              data-testid="button-confirm-contribute"
            >
              {contributeMutation.isPending ? (
                <ActivityIndicator color="#001F3F" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001F3F' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001F3F' },
  errorText: { color: '#f87171', fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  description: { fontSize: 16, color: '#708090', textAlign: 'center', marginTop: 8 },
  infoCardsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  infoCardLabel: { color: '#708090', fontSize: 11, marginTop: 6 },
  infoCardValue: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  progressCard: { backgroundColor: 'rgba(127, 255, 212, 0.1)', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.2)' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  currentAmount: { fontSize: 32, fontWeight: 'bold', color: '#7FFFD4' },
  targetAmount: { fontSize: 16, color: '#708090', marginLeft: 8 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7FFFD4', borderRadius: 4 },
  progressPercent: { fontSize: 14, color: '#7FFFD4', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  primaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 14, borderRadius: 12 },
  primaryActionText: { color: '#001F3F', fontSize: 16, fontWeight: '600' },
  secondaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.3)' },
  secondaryActionText: { color: '#7FFFD4', fontSize: 16, fontWeight: '600' },
  spendNowButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 14, borderRadius: 12, marginBottom: 24 },
  spendNowText: { color: '#001F3F', fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  contributorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  contributorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(127, 255, 212, 0.2)', alignItems: 'center', justifyContent: 'center' },
  contributorInitials: { color: '#7FFFD4', fontWeight: '600' },
  contributorInfo: { flex: 1, marginLeft: 12 },
  contributorName: { color: '#fff', fontWeight: '500' },
  contributorDate: { color: '#708090', fontSize: 12, marginTop: 2 },
  contributorAmount: { color: '#7FFFD4', fontWeight: '600' },
  emptyText: { color: '#708090', textAlign: 'center', paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#001F3F', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalSubtitle: { fontSize: 14, color: '#708090', marginBottom: 20 },
  amountInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, fontSize: 18, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  confirmButton: { backgroundColor: '#7FFFD4', borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: '#001F3F', fontSize: 16, fontWeight: '600' },
});
