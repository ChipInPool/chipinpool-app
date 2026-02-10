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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'contribution', label: 'Contributions' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'deposit', label: 'Deposits' },
];

function getActivityIcon(type: string): { name: string; color: string } {
  switch (type) {
    case 'contribution':
      return { name: 'arrow-up-circle', color: '#22C55E' };
    case 'withdrawal':
      return { name: 'arrow-down-circle', color: '#60A5FA' };
    case 'deposit':
      return { name: 'add-circle', color: '#7FFFD4' };
    default:
      return { name: 'ellipse', color: '#708090' };
  }
}

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

function formatAmount(type: string, amount: string | number): { text: string; color: string } {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const abs = Math.abs(num).toFixed(2);

  switch (type) {
    case 'contribution':
      return { text: `-$${abs}`, color: '#22C55E' };
    case 'withdrawal':
      return { text: `-$${abs}`, color: '#60A5FA' };
    case 'deposit':
      return { text: `+$${abs}`, color: '#7FFFD4' };
    default:
      return { text: `$${abs}`, color: '#708090' };
  }
}

export default function ActivityScreen() {
  const [activeFilter, setActiveFilter] = useState('all');

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#7FFFD4"
          />
        }
      >
        <Text style={styles.title}>Activity</Text>

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
                activeFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter.key && styles.filterTabTextActive,
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
            color="#7FFFD4"
            style={{ marginVertical: 60 }}
          />
        ) : activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={64}
              color="rgba(112,128,144,0.3)"
            />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              Your transactions and contributions will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {activities.map((item: any, index: number) => {
              const icon = getActivityIcon(item.type);
              const amount = formatAmount(item.type, item.amount);
              return (
                <View
                  key={item.id || index}
                  style={[
                    styles.activityItem,
                    index < activities.length - 1 && styles.activityItemBorder,
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
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {item.description || item.title || item.type}
                    </Text>
                    <Text style={styles.activityDate}>
                      {formatDate(item.createdAt || item.date || item.timestamp)}
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
  container: { flex: 1, backgroundColor: '#001F3F' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  filtersContainer: { marginBottom: 20 },
  filtersContent: { gap: 8 },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTabActive: {
    backgroundColor: '#7FFFD4',
    borderColor: '#7FFFD4',
  },
  filterTabText: { color: '#708090', fontSize: 13, fontWeight: '500' },
  filterTabTextActive: { color: '#001F3F', fontWeight: '700' },
  activityList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  activityDescription: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  activityDate: { color: '#708090', fontSize: 12 },
  activityAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#708090', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
});
