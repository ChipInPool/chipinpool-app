import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const { data: pools, refetch, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
  });

  const { data: activityFeed } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: api.activity.feed,
  });

  const unreadCount = notifications?.filter((n: any) => !n.read)?.length || 0;
  const balance = parseFloat(user?.balance || '0');

  const quickActions = [
    { icon: 'add', label: 'Create Pool', color: '#7FFFD4', screen: 'PoolsTab', params: { screen: 'CreatePool' } },
    { icon: 'people', label: 'Join Pool', color: '#60A5FA', screen: 'PoolsTab' },
    { icon: 'card', label: 'View Cards', color: '#F472B6', screen: 'CardsTab' },
    { icon: 'bag-handle', label: 'Spend Now', color: '#7FFFD4', screen: 'SpendNow' },
    { icon: 'time', label: 'Activity', color: '#60A5FA', screen: 'Activity' },
    { icon: 'trophy', label: 'Rewards', color: '#FBBF24', screen: 'Rewards' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName}!</Text>
            <Text style={styles.subGreeting}>Here's your overview</Text>
          </View>
          <TouchableOpacity
            style={styles.bellContainer}
            onPress={() => navigation.navigate('Notifications')}
            data-testid="button-notifications"
          >
            <Ionicons name="notifications-outline" size={26} color="#fff" />
            {unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.balanceAction}>
              <Ionicons name="add-circle" size={24} color="#7FFFD4" />
              <Text style={styles.balanceActionText}>Add Funds</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceAction}>
              <Ionicons name="arrow-up-circle" size={24} color="#7FFFD4" />
              <Text style={styles.balanceActionText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickAction}
                onPress={() => {
                  if (action.params) {
                    navigation.navigate(action.screen, action.params);
                  } else {
                    navigation.navigate(action.screen);
                  }
                }}
                data-testid={`button-quick-${action.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Pools</Text>
          {pools?.slice(0, 3).map((pool: any) => (
            <TouchableOpacity
              key={pool.id}
              style={styles.poolCard}
              onPress={() => navigation.navigate('PoolsTab', { screen: 'PoolDetails', params: { poolId: pool.id } })}
              data-testid={`card-pool-${pool.id}`}
            >
              <View style={styles.poolInfo}>
                <Text style={styles.poolName}>{pool.name}</Text>
                <Text style={styles.poolDescription} numberOfLines={1}>{pool.description}</Text>
              </View>
              <View style={styles.poolProgress}>
                <Text style={styles.poolAmount}>${parseFloat(pool.currentAmount).toLocaleString()}</Text>
                <Text style={styles.poolTarget}>of ${parseFloat(pool.targetAmount).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {(!pools || pools.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pools yet. Create your first pool!</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activityFeed?.slice(0, 3).map((item: any, index: number) => (
            <View key={item.id || index} style={styles.activityCard} data-testid={`card-activity-${item.id || index}`}>
              <View style={styles.activityIconContainer}>
                <Ionicons
                  name={
                    item.type === 'contribution' ? 'arrow-down-circle' :
                    item.type === 'withdrawal' ? 'arrow-up-circle' :
                    item.type === 'pool_created' ? 'add-circle' :
                    'swap-horizontal'
                  }
                  size={24}
                  color="#7FFFD4"
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityDescription} numberOfLines={1}>{item.description || item.message}</Text>
                <Text style={styles.activityDate}>
                  {new Date(item.createdAt || item.date).toLocaleDateString()}
                </Text>
              </View>
              {item.amount && (
                <Text style={styles.activityAmount}>
                  ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          ))}
          {(!activityFeed || activityFeed.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent activity</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 16, color: '#708090', marginTop: 4 },
  bellContainer: { position: 'relative', padding: 4 },
  badgeDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#f87171' },
  balanceCard: { backgroundColor: 'rgba(127, 255, 212, 0.1)', borderRadius: 16, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(127, 255, 212, 0.2)' },
  balanceLabel: { fontSize: 14, color: '#708090' },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#7FFFD4', marginTop: 8 },
  balanceActions: { flexDirection: 'row', marginTop: 20, gap: 20 },
  balanceAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceActionText: { color: '#7FFFD4', fontSize: 14, fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: { width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center' },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  poolCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  poolInfo: { flex: 1 },
  poolName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  poolDescription: { fontSize: 14, color: '#708090', marginTop: 4 },
  poolProgress: { alignItems: 'flex-end' },
  poolAmount: { fontSize: 18, fontWeight: '600', color: '#7FFFD4' },
  poolTarget: { fontSize: 12, color: '#708090' },
  emptyState: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyStateText: { color: '#708090', fontSize: 14 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activityIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(127,255,212,0.15)', alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, marginLeft: 12 },
  activityDescription: { color: '#fff', fontSize: 14, fontWeight: '500' },
  activityDate: { color: '#708090', fontSize: 12, marginTop: 2 },
  activityAmount: { color: '#7FFFD4', fontSize: 16, fontWeight: '600' },
});
