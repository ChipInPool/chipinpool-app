import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '@/services/api';
import { PoolsStackParamList } from '@/navigation/AppTabs';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<PoolsStackParamList, 'PoolsList'>;

export default function PoolsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: pools, refetch, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const renderPool = ({ item: pool }: { item: any }) => {
    const progress = parseFloat(pool.targetAmount) > 0 
      ? (parseFloat(pool.currentAmount) / parseFloat(pool.targetAmount)) * 100 
      : 0;

    return (
      <TouchableOpacity 
        style={styles.poolCard} 
        onPress={() => navigation.navigate('PoolDetails', { poolId: pool.id })}
      >
        <View style={styles.poolHeader}>
          <View style={styles.poolEmoji}>
            <Text style={styles.poolEmojiText}>{pool.emoji || '💰'}</Text>
          </View>
          <View style={styles.poolInfo}>
            <Text style={styles.poolName}>{pool.name}</Text>
            <Text style={styles.poolDescription} numberOfLines={1}>{pool.description}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.currentAmount}>${parseFloat(pool.currentAmount).toLocaleString()}</Text>
            <Text style={styles.targetAmount}>of ${parseFloat(pool.targetAmount).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.poolMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color="#708090" />
            <Text style={styles.metaText}>{pool.contributorCount || 0} contributors</Text>
          </View>
          <Text style={[styles.statusBadge, { backgroundColor: pool.status === 'active' ? 'rgba(127, 255, 212, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]}>
            {pool.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pools || []}
        renderItem={renderPool}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#708090" />
            <Text style={styles.emptyStateText}>No pools yet</Text>
            <Text style={styles.emptyStateSubtext}>Create your first pool to get started</Text>
          </View>
        }
      />
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreatePool')}>
        <Ionicons name="add" size={28} color="#001F3F" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  listContent: { padding: 16 },
  poolCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  poolHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  poolEmoji: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(127, 255, 212, 0.1)', alignItems: 'center', justifyContent: 'center' },
  poolEmojiText: { fontSize: 24 },
  poolInfo: { flex: 1, marginLeft: 12 },
  poolName: { fontSize: 18, fontWeight: '600', color: '#fff' },
  poolDescription: { fontSize: 14, color: '#708090', marginTop: 2 },
  progressContainer: { marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7FFFD4', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  currentAmount: { fontSize: 16, fontWeight: '600', color: '#7FFFD4' },
  targetAmount: { fontSize: 14, color: '#708090' },
  poolMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#708090' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, color: '#7FFFD4', overflow: 'hidden', textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#708090', marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#7FFFD4', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
