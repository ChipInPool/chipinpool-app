import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '@/services/api';
import { PoolsStackParamList } from '@/navigation/AppTabs';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<PoolsStackParamList, 'PoolsList'>;

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  Gift: { icon: 'gift', color: '#FF6B9D' },
  Trip: { icon: 'airplane', color: '#4ECDC4' },
  Purchase: { icon: 'cart', color: '#FFD93D' },
  Event: { icon: 'calendar', color: '#6C5CE7' },
  Recurring: { icon: 'repeat', color: '#00B894' },
};

const DEFAULT_CATEGORY = { icon: 'ellipsis-horizontal' as keyof typeof Ionicons.glyphMap, color: '#A0AEC0' };

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PoolsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: pools, refetch, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const renderPool = ({ item: pool }: { item: any }) => {
    const current = parseFloat(pool.currentAmount) || 0;
    const target = parseFloat(pool.targetAmount) || 0;
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const { icon, color } = getCategoryConfig(pool.category);
    const isActive = pool.status === 'active';

    return (
      <TouchableOpacity
        style={styles.poolCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PoolDetails', { poolId: pool.id })}
        data-testid={`card-pool-${pool.id}`}
      >
        <View style={styles.poolHeader}>
          <View style={[styles.categoryCircle, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={22} color={color} />
          </View>
          <View style={styles.poolInfo}>
            <Text style={styles.poolTitle} numberOfLines={1}>{pool.title}</Text>
            <Text style={styles.poolDescription} numberOfLines={1}>{pool.description}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.currentAmount}>{formatCurrency(current)}</Text>
            <Text style={styles.targetAmount}>of {formatCurrency(target)}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.contributorInfo}>
            <Ionicons name="people-outline" size={15} color="#708090" />
            <Text style={styles.contributorText}>{pool.contributorCount || 0} contributors</Text>
          </View>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? '#7FFFD4' : '#708090' }]} />
            <Text style={[styles.statusText, { color: isActive ? '#7FFFD4' : '#708090' }]}>
              {pool.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={pools || []}
        renderItem={renderPool}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          (!pools || pools.length === 0) && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="wallet-outline" size={40} color="#7FFFD4" />
            </View>
            <Text style={styles.emptyTitle}>No Pools Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a pool and start collecting funds with friends and family.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CreatePool')}
              data-testid="button-create-first-pool"
            >
              <Ionicons name="add-circle-outline" size={20} color="#001F3F" />
              <Text style={styles.emptyButtonText}>Create Your First Pool</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreatePool')}
        data-testid="button-create-pool"
      >
        <Ionicons name="add" size={28} color="#001F3F" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  poolCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolInfo: {
    flex: 1,
    marginLeft: 12,
  },
  poolTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  poolDescription: {
    fontSize: 13,
    color: '#708090',
    marginTop: 3,
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#708090',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 13,
    color: '#7FFFD4',
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7FFFD4',
    borderRadius: 3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 4,
  },
  currentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  targetAmount: {
    fontSize: 13,
    color: '#708090',
    fontWeight: '400',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  contributorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contributorText: {
    fontSize: 12,
    color: '#708090',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusActive: {
    backgroundColor: 'rgba(127, 255, 212, 0.12)',
  },
  statusInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(127, 255, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#708090',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7FFFD4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#001F3F',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7FFFD4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
