import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { api } from '@/services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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

export default function ArchivedPoolsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: pools = [], refetch, isLoading } = useQuery({
    queryKey: ['archivedPools'],
    queryFn: async () => {
      const res = await api.pools.list();
      return (res || []).filter((p: any) => p.status === 'archived');
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const unarchiveMutation = useMutation({
    mutationFn: (poolId: string) => api.pools.unarchive(poolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archivedPools'] });
      queryClient.invalidateQueries({ queryKey: ['pools'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to unarchive pool');
    },
  });

  const handleUnarchive = (poolId: string, title: string) => {
    Alert.alert(
      'Unarchive Pool',
      `Are you sure you want to unarchive "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: () => unarchiveMutation.mutate(poolId),
        },
      ]
    );
  };

  const renderPool = ({ item: pool }: { item: any }) => {
    const current = parseFloat(pool.currentAmount) || 0;
    const target = parseFloat(pool.targetAmount) || 0;
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const { icon, color } = getCategoryConfig(pool.category);
    const archivedDate = pool.archivedAt
      ? new Date(pool.archivedAt).toLocaleDateString()
      : pool.updatedAt
        ? new Date(pool.updatedAt).toLocaleDateString()
        : '';

    return (
      <View
        style={[styles.poolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        data-testid={`card-archived-pool-${pool.id}`}
      >
        <View style={styles.poolHeader}>
          <View style={[styles.categoryCircle, { backgroundColor: color + '20' }]}>
            {pool.emoji ? (
              <Text style={{ fontSize: 24 }}>{pool.emoji}</Text>
            ) : (
              <Ionicons name={icon} size={22} color={color} />
            )}
          </View>
          <View style={styles.poolInfo}>
            <Text style={[styles.poolTitle, { color: colors.text }]} numberOfLines={1}>{pool.title}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color }]}>{pool.category || 'Other'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={[styles.currentAmount, { color: colors.text }]}>{formatCurrency(current)}</Text>
            <Text style={[styles.targetAmount, { color: colors.textSecondary }]}>of {formatCurrency(target)}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.cardBorder }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.mint }]} />
          </View>
        </View>

        {archivedDate ? (
          <View style={styles.archivedDateRow}>
            <Ionicons name="archive-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.archivedDateText, { color: colors.textSecondary }]}>
              Archived {archivedDate}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.unarchiveButton, { backgroundColor: `${colors.mint}15`, borderColor: colors.mint }]}
          activeOpacity={0.7}
          onPress={() => handleUnarchive(pool.id.toString(), pool.title)}
          data-testid={`button-unarchive-${pool.id}`}
        >
          <Ionicons name="arrow-undo-outline" size={16} color={colors.mint} />
          <Text style={[styles.unarchiveButtonText, { color: colors.mint }]}>Unarchive</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={pools}
        renderItem={renderPool}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          pools.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.mint} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.mint}1A` }]}>
              <Ionicons name="archive-outline" size={40} color={colors.mint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Archived Pools</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Pools you archive will appear here. You can unarchive them at any time.
            </Text>
          </View>
        }
      />
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
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amountSection: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
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
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  archivedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  archivedDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  unarchiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  unarchiveButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
});
