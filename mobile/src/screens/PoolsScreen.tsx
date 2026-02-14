import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, API_URL } from '@/services/api';
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

const STATUS_OPTIONS = ['All', 'Active', 'Complete', 'Closed', 'Expired', 'Paused', 'Archived'];
const CATEGORY_OPTIONS = ['All', 'Trip', 'Gift', 'Purchase', 'Event', 'Recurring', 'Other'];
const DATE_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'year', label: 'This Year' },
];

const getDateCutoff = (filter: string): Date | null => {
  const now = new Date();
  switch (filter) {
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    default: return null;
  }
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function displayStatus(status: string): string {
  if (status === 'completed') return 'complete';
  return status;
}

function statusFilterValue(label: string): string {
  if (label === 'Complete') return 'completed';
  return label.toLowerCase();
}

export default function PoolsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');

  const { data: pools, refetch, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const filteredAndSortedPools = useMemo(() => {
    if (!pools) return [];
    let result = [...pools];

    if (selectedStatus !== 'All') {
      const matchValue = statusFilterValue(selectedStatus);
      result = result.filter((pool: any) => pool.status === matchValue);
    }

    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Other') {
        const knownCategories = CATEGORY_OPTIONS.filter(c => c !== 'All' && c !== 'Other');
        result = result.filter((pool: any) => !knownCategories.includes(pool.category));
      } else {
        result = result.filter((pool: any) =>
          pool.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }

    const dateCutoff = getDateCutoff(dateFilter);
    if (dateCutoff) {
      result = result.filter((pool: any) => new Date(pool.createdAt) >= dateCutoff);
    }

    result.sort((a: any, b: any) => {
      let valA: number, valB: number;
      if (sortBy === 'date') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else {
        valA = parseFloat(a.targetAmount) || 0;
        valB = parseFloat(b.targetAmount) || 0;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [pools, selectedStatus, selectedCategory, dateFilter, sortBy, sortAsc]);

  const renderPill = (
    label: string,
    isSelected: boolean,
    onPress: () => void,
    testId: string,
  ) => (
    <TouchableOpacity
      key={label}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected ? colors.mint : colors.card,
          borderColor: isSelected ? colors.mint : colors.cardBorder,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      data-testid={testId}
    >
      <Text
        style={[
          styles.pillText,
          { color: isSelected ? (isDark ? '#001F3F' : '#FFFFFF') : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPool = ({ item: pool }: { item: any }) => {
    const current = parseFloat(pool.currentAmount) || 0;
    const target = parseFloat(pool.targetAmount) || 0;
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const { icon, color } = getCategoryConfig(pool.category);
    const isActive = pool.status === 'active';
    const statusDisplay = displayStatus(pool.status);

    return (
      <TouchableOpacity
        style={[styles.poolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...(pool.image ? { paddingTop: 0 } : {}) }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PoolDetails', { poolId: pool.id })}
        data-testid={`card-pool-${pool.id}`}
      >
        {pool.image && (
          <Image
            source={{ uri: pool.image.startsWith('http') ? pool.image : `${API_URL}/objects/${pool.image.replace(/^\/objects\//, '')}` }}
            style={styles.poolImage}
            resizeMode="cover"
          />
        )}
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
              {statusDisplay}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.filterToggleRow, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}
        activeOpacity={0.7}
        onPress={() => setFiltersExpanded(!filtersExpanded)}
        data-testid="button-toggle-filters"
      >
        <View style={styles.filterToggleLeft}>
          <Ionicons name="options-outline" size={18} color={colors.mint} />
          <Text style={[styles.filterToggleText, { color: colors.text }]}>Filters & Sort</Text>
        </View>
        <View style={styles.filterToggleRight}>
          <TouchableOpacity
            style={styles.archivedLink}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ArchivedPools')}
            data-testid="button-archived-pools"
          >
            <Ionicons name="archive-outline" size={16} color={colors.mint} />
            <Text style={[styles.archivedLinkText, { color: colors.mint }]}>Archived</Text>
          </TouchableOpacity>
          <Ionicons
            name={filtersExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {filtersExpanded && (
        <View style={[styles.filterSection, { backgroundColor: colors.background }]}>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContainer}
            >
              {STATUS_OPTIONS.map((status) =>
                renderPill(
                  status,
                  selectedStatus === status,
                  () => setSelectedStatus(status),
                  `pill-status-${status.toLowerCase()}`
                )
              )}
            </ScrollView>
          </View>

          <View style={[styles.filterDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContainer}
            >
              {CATEGORY_OPTIONS.map((category) =>
                renderPill(
                  category,
                  selectedCategory === category,
                  () => setSelectedCategory(category),
                  `pill-category-${category.toLowerCase()}`
                )
              )}
            </ScrollView>
          </View>

          <View style={[styles.filterDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Created</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContainer}
            >
              {DATE_FILTERS.map((df) =>
                renderPill(
                  df.label,
                  dateFilter === df.key,
                  () => setDateFilter(df.key),
                  `pill-date-${df.key}`
                )
              )}
            </ScrollView>
          </View>

          <View style={[styles.filterDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.sortRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sort</Text>
            <View style={styles.sortControls}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: sortBy === 'date' ? colors.mint : colors.card,
                    borderColor: sortBy === 'date' ? colors.mint : colors.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setSortBy('date')}
                data-testid="button-sort-date"
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    { color: sortBy === 'date' ? (isDark ? '#001F3F' : '#FFFFFF') : colors.textSecondary },
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: sortBy === 'amount' ? colors.mint : colors.card,
                    borderColor: sortBy === 'amount' ? colors.mint : colors.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setSortBy('amount')}
                data-testid="button-sort-amount"
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    { color: sortBy === 'amount' ? (isDark ? '#001F3F' : '#FFFFFF') : colors.textSecondary },
                  ]}
                >
                  Amount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortDirectionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                activeOpacity={0.7}
                onPress={() => setSortAsc(!sortAsc)}
                data-testid="button-sort-direction"
              >
                <Ionicons
                  name={sortAsc ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={colors.mint}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={filteredAndSortedPools}
        renderItem={renderPool}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedPools.length === 0 && styles.listContentEmpty,
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
  filterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    paddingVertical: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  filterDivider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 2,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortDirectionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    overflow: 'hidden',
  },
  poolImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 12,
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
  filterToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  archivedLinkText: {
    fontSize: 13,
    fontWeight: '600',
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
