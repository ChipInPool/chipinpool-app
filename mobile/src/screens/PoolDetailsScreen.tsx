import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { PoolsStackParamList } from '@/navigation/AppTabs';
import { Ionicons } from '@expo/vector-icons';

type RouteProps = RouteProp<PoolsStackParamList, 'PoolDetails'>;

export default function PoolDetailsScreen() {
  const route = useRoute<RouteProps>();
  const { poolId } = route.params;

  const { data: pool, isLoading } = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => api.pools.get(poolId),
  });

  const { data: contributions } = useQuery({
    queryKey: ['contributions', poolId],
    queryFn: () => api.pools.getContributions(poolId),
    enabled: !!pool,
  });

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
        <TouchableOpacity style={styles.primaryAction}>
          <Ionicons name="add-circle" size={20} color="#001F3F" />
          <Text style={styles.primaryActionText}>Contribute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction}>
          <Ionicons name="share-outline" size={20} color="#7FFFD4" />
          <Text style={styles.secondaryActionText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contributors</Text>
        {contributions?.map((contribution: any) => (
          <View key={contribution.id} style={styles.contributorRow}>
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
  progressCard: { backgroundColor: 'rgba(127, 255, 212, 0.1)', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.2)' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  currentAmount: { fontSize: 32, fontWeight: 'bold', color: '#7FFFD4' },
  targetAmount: { fontSize: 16, color: '#708090', marginLeft: 8 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7FFFD4', borderRadius: 4 },
  progressPercent: { fontSize: 14, color: '#7FFFD4', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  primaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 14, borderRadius: 12 },
  primaryActionText: { color: '#001F3F', fontSize: 16, fontWeight: '600' },
  secondaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.3)' },
  secondaryActionText: { color: '#7FFFD4', fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  contributorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 8 },
  contributorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(127, 255, 212, 0.2)', alignItems: 'center', justifyContent: 'center' },
  contributorInitials: { color: '#7FFFD4', fontWeight: '600' },
  contributorInfo: { flex: 1, marginLeft: 12 },
  contributorName: { color: '#fff', fontWeight: '500' },
  contributorDate: { color: '#708090', fontSize: 12, marginTop: 2 },
  contributorAmount: { color: '#7FFFD4', fontWeight: '600' },
  emptyText: { color: '#708090', textAlign: 'center', paddingVertical: 20 },
});
