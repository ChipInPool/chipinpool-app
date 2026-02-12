import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

const getCategoryIcon = (category: string): string => {
  switch (category?.toLowerCase()) {
    case 'gift': return 'gift';
    case 'trip': return 'airplane';
    case 'purchase': return 'cart';
    case 'event': return 'calendar';
    case 'recurring': return 'repeat';
    default: return 'ellipsis-horizontal';
  }
};

const getActivityIcon = (type: string): { name: string; color: string; bg: string } => {
  switch (type) {
    case 'contribution': return { name: 'arrow-down-circle', color: '#34D399', bg: 'rgba(52,211,153,0.15)' };
    case 'withdrawal': return { name: 'arrow-up-circle', color: '#F87171', bg: 'rgba(248,113,113,0.15)' };
    case 'pool_created': return { name: 'add-circle', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' };
    default: return { name: 'swap-horizontal', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' };
  }
};

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

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

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n: any) => !n?.read)?.length ?? 0;
  const balance = parseFloat(user?.walletBalance ?? user?.balance ?? '0') || 0;

  const handleRefresh = async () => {
    await refreshUser();
    refetch();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
  };

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    }, [])
  );

  const quickActions = [
    { icon: 'add-circle-outline', label: 'Create Pool', color: '#7FFFD4', screen: 'PoolsTab', params: { screen: 'CreatePool' } },
    { icon: 'people-outline', label: 'Join Pool', color: '#60A5FA', screen: 'PoolsTab' },
    { icon: 'bag-handle-outline', label: 'Spend Now', color: '#7FFFD4', screen: 'SpendNowTab' },
    { icon: 'time-outline', label: 'Activity', color: '#60A5FA', screen: 'ProfileModal', params: { screen: 'Activity' } },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#7FFFD4" />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.appBrand}>CHIPINPOOL</Text>
            <Text style={styles.greeting}>Hello, {user?.firstName} 👋</Text>
            <Text style={styles.subGreeting}>Here's your overview</Text>
          </View>
          <TouchableOpacity
            style={styles.bellContainer}
            onPress={() => navigation.navigate('ProfileModal', { screen: 'Notifications' })}
            data-testid="button-notifications"
            activeOpacity={0.7}
          >
            <View style={styles.bellCircle}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </View>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#0D2B4E', '#1A3A5C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceCardInner}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.balanceActions}>
              <TouchableOpacity style={styles.balancePill} activeOpacity={0.8} onPress={() => navigation.navigate('WalletTab')}>
                <Ionicons name="add-circle-outline" size={18} color="#7FFFD4" />
                <Text style={styles.balancePillText}>Add Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.balancePill} activeOpacity={0.8} onPress={() => navigation.navigate('WalletTab')}>
                <Ionicons name="arrow-up-circle-outline" size={18} color="#7FFFD4" />
                <Text style={styles.balancePillText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.balanceDecorCircle1} />
          <View style={styles.balanceDecorCircle2} />
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickActionCard}
                activeOpacity={0.7}
                onPress={() => {
                  if (action.params) {
                    navigation.navigate(action.screen, action.params);
                  } else {
                    navigation.navigate(action.screen);
                  }
                }}
                data-testid={`button-quick-${action.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <View style={[styles.quickActionIconBg, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Pools</Text>
            {pools && pools.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('PoolsTab')} activeOpacity={0.7}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {pools && pools.length > 0 ? (
            pools.slice(0, 3).map((pool: any) => {
              const current = parseFloat(pool.currentAmount || '0');
              const target = parseFloat(pool.targetAmount || '1');
              const percent = Math.min(Math.round((current / target) * 100), 100);
              const catIcon = getCategoryIcon(pool.category);
              return (
                <TouchableOpacity
                  key={pool.id}
                  style={styles.poolCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('PoolsTab', { screen: 'PoolDetails', params: { poolId: pool.id } })}
                  data-testid={`card-pool-${pool.id}`}
                >
                  <View style={styles.poolCategoryIcon}>
                    <Ionicons name={catIcon as any} size={20} color="#7FFFD4" />
                  </View>
                  <View style={styles.poolContent}>
                    <View style={styles.poolTopRow}>
                      <Text style={styles.poolName} numberOfLines={1}>{pool.title}</Text>
                      <Text style={styles.poolPercent}>{percent}%</Text>
                    </View>
                    <View style={styles.poolProgressBarBg}>
                      <View style={[styles.poolProgressBarFill, { width: `${percent}%` }]} />
                    </View>
                    <View style={styles.poolBottomRow}>
                      <Text style={styles.poolAmountText}>
                        ${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.poolTargetText}>
                        of ${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="layers-outline" size={32} color="#708090" />
              </View>
              <Text style={styles.emptyTitle}>No Pools Yet</Text>
              <Text style={styles.emptySubtitle}>Create your first pool and start saving together!</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {Array.isArray(activityFeed) && activityFeed.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileModal', { screen: 'Activity' })}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {Array.isArray(activityFeed) && activityFeed.length > 0 ? (
            activityFeed.slice(0, 5).map((item: any, index: number) => {
              const actIcon = getActivityIcon(item.type);
              return (
                <View
                  key={item.id || index}
                  style={styles.activityCard}
                  data-testid={`card-activity-${item.id || index}`}
                >
                  <View style={[styles.activityIconCircle, { backgroundColor: actIcon.bg }]}>
                    <Ionicons name={actIcon.name as any} size={22} color={actIcon.color} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {item?.description || item?.message || 'Activity'}
                    </Text>
                    <Text style={styles.activityDate}>
                      {new Date(item?.createdAt || item?.date || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {item?.amount && (
                    <Text
                      style={[
                        styles.activityAmount,
                        { color: item?.type === 'withdrawal' ? '#F87171' : '#34D399' },
                      ]}
                    >
                      {item?.type === 'withdrawal' ? '-' : '+'}$
                      {parseFloat(item?.amount ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="pulse-outline" size={32} color="#708090" />
              </View>
              <Text style={styles.emptyTitle}>No Recent Activity</Text>
              <Text style={styles.emptySubtitle}>Your transactions and updates will appear here.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  appBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7FFFD4',
    letterSpacing: 2,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 13,
    color: '#708090',
    marginTop: 2,
  },
  bellContainer: {
    position: 'relative',
    marginTop: 4,
  },
  bellCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#001F3F',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  balanceCard: {
    borderRadius: 16,
    marginBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  balanceCardInner: {
    padding: 24,
    zIndex: 1,
  },
  balanceDecorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(127,255,212,0.06)',
  },
  balanceDecorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(127,255,212,0.04)',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  balanceActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(127,255,212,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.25)',
  },
  balancePillText: {
    color: '#7FFFD4',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7FFFD4',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickActionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  poolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  poolCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(127,255,212,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  poolContent: {
    flex: 1,
  },
  poolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poolName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  poolPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7FFFD4',
  },
  poolProgressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  poolProgressBarFill: {
    height: '100%',
    backgroundColor: '#7FFFD4',
    borderRadius: 3,
  },
  poolBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poolAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  poolTargetText: {
    fontSize: 12,
    color: '#708090',
  },
  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(112,128,144,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#708090',
    textAlign: 'center',
    lineHeight: 18,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityDate: {
    color: '#708090',
    fontSize: 12,
    marginTop: 3,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});
