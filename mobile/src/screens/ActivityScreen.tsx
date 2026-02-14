import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'contribution', label: 'Contributions' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'spend', label: 'Spending' },
  { key: 'transfer', label: 'Transfers' },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ActivityScreen() {
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');

  function getActivityIcon(type: string): { name: string; color: string } {
    switch (type) {
      case 'contribution':
        return { name: 'arrow-up-circle', color: colors.green };
      case 'withdrawal':
        return { name: 'arrow-down-circle', color: colors.blue };
      case 'deposit':
        return { name: 'add-circle', color: colors.mint };
      case 'spend':
        return { name: 'bag-handle', color: colors.purple };
      case 'pool_withdrawal':
        return { name: 'trending-down', color: colors.red };
      case 'pool_transfer':
        return { name: 'swap-horizontal', color: colors.amber };
      default:
        return { name: 'ellipse', color: colors.slate };
    }
  }

  function formatAmount(direction: string, amount: string | number): { text: string; color: string } {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const abs = Math.abs(num).toFixed(2);

    if (direction === 'in') {
      return { text: `+$${abs}`, color: colors.green };
    }
    return { text: `-$${abs}`, color: colors.red };
  }

  const {
    data: activityData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['user-activity'],
    queryFn: api.activity.userActivity,
  });

  const activities = useMemo(() => {
    const items = Array.isArray(activityData) ? activityData : [];
    if (activeFilter === 'all') return items;
    if (activeFilter === 'transfer') {
      return items.filter((item: any) => item.type === 'pool_transfer' || item.type === 'pool_withdrawal');
    }
    return items.filter((item: any) => item.type === activeFilter);
  }, [activityData, activeFilter]);

  const summary = useMemo(() => {
    const items = Array.isArray(activityData) ? activityData : [];
    let totalIn = 0;
    let totalOut = 0;
    items.forEach((item: any) => {
      const amt = parseFloat(item.amount || '0');
      if (item.direction === 'in') {
        totalIn += amt;
      } else {
        totalOut += amt;
      }
    });
    return { totalIn, totalOut };
  }, [activityData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.mint}
          />
        }
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.slate }]}>Money In</Text>
              <Text style={[styles.summaryValue, { color: colors.green }]} data-testid="text-total-in">
                +${summary.totalIn.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.slate }]}>Money Out</Text>
              <Text style={[styles.summaryValue, { color: colors.red }]} data-testid="text-total-out">
                -${summary.totalOut.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              data-testid={`button-filter-${filter.key}`}
              style={[
                styles.filterTab,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                activeFilter === filter.key && { backgroundColor: colors.mint, borderColor: colors.mint },
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: colors.slate },
                  activeFilter === filter.key && { color: isDark ? '#001F3F' : '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.mint}
            style={{ marginVertical: 60 }}
          />
        ) : activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={64}
              color={`${colors.slate}4D`}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.slate }]}>
              Start by creating a pool or depositing to your wallet
            </Text>
          </View>
        ) : (
          <View style={[styles.activityList, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {activities.map((item: any, index: number) => {
              const icon = getActivityIcon(item?.type ?? '');
              const amount = formatAmount(item?.direction ?? 'out', item?.amount ?? '0');
              const hasStatus = item?.status && (item.type === 'withdrawal' || item.type === 'pool_withdrawal');
              return (
                <View
                  key={item.id || index}
                  data-testid={`card-activity-${item.id || index}`}
                  style={[
                    styles.activityItem,
                    index < activities.length - 1 && [styles.activityItemBorder, { borderBottomColor: colors.cardBorder }],
                  ]}
                >
                  <View
                    style={[
                      styles.activityIconWrap,
                      { backgroundColor: `${icon.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={icon.name as any}
                      size={24}
                      color={icon.color}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityDescription, { color: colors.text }]} numberOfLines={1}>
                      {item?.description || item?.type || 'Activity'}
                    </Text>
                    {item?.poolTitle ? (
                      <Text style={[styles.activityPool, { color: colors.mint }]} numberOfLines={1}>
                        {item.poolTitle}
                      </Text>
                    ) : null}
                    <View style={styles.activityMeta}>
                      <Text style={[styles.activityDate, { color: colors.slate }]}>
                        {formatDate(item?.createdAt || new Date().toISOString())}
                      </Text>
                      {hasStatus ? (
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: item.status === 'completed' ? `${colors.green}20` :
                              item.status === 'pending' ? `${colors.amber}20` : `${colors.slate}20`,
                          },
                        ]}>
                          <Text style={[
                            styles.statusText,
                            {
                              color: item.status === 'completed' ? colors.green :
                                item.status === 'pending' ? colors.amber : colors.slate,
                            },
                          ]}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.activityAmount, { color: amount.color }]}>
                    {amount.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  filtersContainer: { marginBottom: 20 },
  filtersContent: { gap: 8 },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: { fontSize: 13, fontWeight: '500' },
  activityList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: { flex: 1, marginRight: 12 },
  activityDescription: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  activityPool: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  activityDate: { fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
});
