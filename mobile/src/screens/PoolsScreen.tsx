import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '@/services/api';
import { PoolsStackParamList } from '@/navigation/AppTabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

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
  const { colors, isDark } = useTheme();

  const { data: pools, refetch, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const renderPool = ({ item: pool }: { item: any }) => {
    const current = parseFloat(pool.currentAmount) || 0;
    const target = parseFloat(pool.targetAmount) || 0;
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const { icon, color } = getCategoryConfig(pool.category);
    const isActive = pool.status === 'active';

    return (
      <TouchableOpacity
        style={[styles.poolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PoolDetails', { poolId: pool.id })}
        data-testid={`card-pool-${pool.id}`}
      >
        <View style={styles.poolHeader}>
          <View style={[styles.categoryCircle, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={22} color={color} />
          </View>
          <View style={styles.poolInfo}>
            <Text style={[styles.poolTitle, { color: colors.text }]} numberOfLines={1}>{pool.title}</Text>
            <Text style={[styles.poolDescription, { color: colors.textSecondary }]} numberOfLines={1}>{pool.description}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progress</Text>
            <Text style={[styles.progressPercent, { color: colors.mint }]}>{Math.round(progress)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.cardBorder }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.mint }]} />
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.currentAmount, { color: colors.text }]}>{formatCurrency(current)}</Text>
            <Text style={[styles.targetAmount, { color: colors.textSecondary }]}>of {formatCurrency(target)}</Text>
          </View>
        </View>

        <View style={[styles.bottomRow, { borderTopColor: colors.cardBorder }]}>
          <View style={styles.contributorInfo}>
            <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.contributorText, { color: colors.textSecondary }]}>{pool.contributorCount || 0} contributors</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? `${colors.mint}20` : colors.card }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.mint : colors.textSecondary }]} />
            <Text style={[styles.statusText, { color: isActive ? colors.mint : colors.textSecondary }]}>
              {pool.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={pools || []}
        renderItem={renderPool}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          (!pools || pools.length === 0) && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.mint} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.mint}1A` }]}>
              <Ionicons name="wallet-outline" size={40} color={colors.mint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pools Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create a pool and start collecting funds with friends and family.
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.mint }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CreatePool')}
              data-testid="button-create-first-pool"
            >
              <Ionicons name="add-circle-outline" size={20} color={isDark ? '#001F3F' : '#FFFFFF'} />
              <Text style={[styles.emptyButtonText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>Create Your First Pool</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.mint }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreatePool')}
        data-testid="button-create-pool"
      >
        <Ionicons name="add" size={28} color={isDark ? '#001F3F' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
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
    letterSpacing: 0.2,
  },
  poolDescription: {
    fontSize: 13,
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
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
  },
  targetAmount: {
    fontSize: 13,
    fontWeight: '400',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  contributorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contributorText: {
    fontSize: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
