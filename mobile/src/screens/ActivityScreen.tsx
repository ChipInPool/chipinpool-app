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
      default:
        return { name: 'ellipse', color: colors.slate };
    }
  }

  function formatAmount(type: string, amount: string | number): { text: string; color: string } {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const abs = Math.abs(num).toFixed(2);

    switch (type) {
      case 'contribution':
        return { text: `-$${abs}`, color: colors.green };
      case 'withdrawal':
        return { text: `-$${abs}`, color: colors.blue };
      case 'deposit':
        return { text: `+$${abs}`, color: colors.mint };
      default:
        return { text: `$${abs}`, color: colors.slate };
    }
  }

  const {
    data: activityData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: api.activity.feed,
  });

  const activities = useMemo(() => {
    const items = Array.isArray(activityData)
      ? activityData
      : activityData?.activities || activityData?.feed || [];
    if (activeFilter === 'all') return items;
    return items.filter((item: any) => item.type === activeFilter);
  }, [activityData, activeFilter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
        <Text style={[styles.title, { color: colors.text }]}>Activity</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
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
              Your transactions and contributions will appear here
            </Text>
          </View>
        ) : (
          <View style={[styles.activityList, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {activities.map((item: any, index: number) => {
              const icon = getActivityIcon(item?.type ?? '');
              const amount = formatAmount(item?.type ?? '', item?.amount ?? '0');
              return (
                <View
                  key={item.id || index}
                  style={[
                    styles.activityItem,
                    index < activities.length - 1 && [styles.activityItemBorder, { borderBottomColor: colors.card }],
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
                      {item?.description || item?.title || item?.type || 'Activity'}
                    </Text>
                    <Text style={[styles.activityDate, { color: colors.slate }]}>
                      {formatDate(item?.createdAt || item?.date || item?.timestamp || new Date().toISOString())}
                    </Text>
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
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
    borderBottomWidth: 1,
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
  activityDescription: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  activityDate: { fontSize: 12 },
  activityAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
});
