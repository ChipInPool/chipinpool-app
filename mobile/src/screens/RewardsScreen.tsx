import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'badges' | 'points' | 'leaderboard';

function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#708090';
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RewardsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('badges');

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['rewards', 'points'],
    queryFn: api.rewards.points,
  });

  const { data: badges, isLoading: badgesLoading, refetch: refetchBadges } = useQuery({
    queryKey: ['rewards', 'myBadges'],
    queryFn: api.rewards.myBadges,
  });

  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['rewards', 'history'],
    queryFn: api.rewards.history,
    enabled: activeTab === 'points',
  });

  const { data: leaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['rewards', 'leaderboard'],
    queryFn: api.rewards.leaderboard,
    enabled: activeTab === 'leaderboard',
  });

  useEffect(() => {
    api.rewards.initBadges().catch(() => {});
  }, []);

  const totalPoints = pointsData?.totalPoints ?? pointsData?.points ?? 0;

  const renderBadge = ({ item }: { item: any }) => {
    const earned = item.earned || item.unlockedAt;
    return (
      <View style={[styles.badgeCard, !earned && styles.badgeLocked]} data-testid={`badge-item-${item.id}`}>
        <Text style={styles.badgeEmoji}>{item.icon || item.emoji || '🏆'}</Text>
        <Text style={[styles.badgeName, !earned && styles.dimmedText]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.badgeDesc, !earned && styles.dimmedText]} numberOfLines={2}>{item.description}</Text>
        {earned ? (
          <View style={styles.earnedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#7FFFD4" />
            <Text style={styles.earnedText}>Earned</Text>
          </View>
        ) : (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={14} color="#708090" />
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isPositive = (item.points || item.amount || 0) > 0;
    return (
      <View style={styles.transactionCard} data-testid={`points-transaction-${item.id}`}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={isPositive ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={28}
            color={isPositive ? '#7FFFD4' : '#F87171'}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{item.description || item.reason || 'Points activity'}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.createdAt || item.created_at || new Date().toISOString())}</Text>
        </View>
        <Text style={[styles.transactionPoints, { color: isPositive ? '#7FFFD4' : '#F87171' }]}>
          {isPositive ? '+' : ''}{item.points || item.amount || 0}
        </Text>
      </View>
    );
  };

  const renderLeaderboardEntry = ({ item, index }: { item: any; index: number }) => {
    const rank = item.rank || index + 1;
    const isCurrentUser = item.userId === user?.id || item.username === user?.username;
    return (
      <View
        style={[styles.leaderboardRow, isCurrentUser && styles.currentUserRow]}
        data-testid={`leaderboard-entry-${item.userId || index}`}
      >
        <View style={[styles.rankBadge, { backgroundColor: rank <= 3 ? `${getRankColor(rank)}20` : 'rgba(255,255,255,0.05)' }]}>
          <Text style={[styles.rankNumber, { color: getRankColor(rank) }]}>
            {rank}
          </Text>
        </View>
        <View style={styles.leaderboardInfo}>
          <Text style={[styles.leaderboardName, isCurrentUser && styles.currentUserName]}>
            {item.username || item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim()}
            {isCurrentUser ? ' (You)' : ''}
          </Text>
        </View>
        {rank <= 3 && (
          <Ionicons name="trophy" size={20} color={getRankColor(rank)} style={{ marginRight: 8 }} />
        )}
        <Text style={styles.leaderboardPoints}>{item.totalPoints ?? item.points ?? 0}</Text>
      </View>
    );
  };

  const PointsSummaryCard = () => (
    <View style={styles.pointsCard}>
      <Text style={styles.pointsLabel}>Total Points</Text>
      <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
      <View style={styles.pointsIcon}>
        <Ionicons name="star" size={24} color="#7FFFD4" />
      </View>
    </View>
  );

  const renderBadgesTab = () => (
    <FlatList
      data={badges || []}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderBadge}
      numColumns={3}
      columnWrapperStyle={styles.badgeRow}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={badgesLoading} onRefresh={refetchBadges} tintColor="#7FFFD4" />}
      ListHeaderComponent={<PointsSummaryCard />}
      ListEmptyComponent={
        !badgesLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon" size={64} color="#708090" />
            <Text style={styles.emptyText}>No badges available yet</Text>
          </View>
        ) : (
          <ActivityIndicator color="#7FFFD4" style={{ marginTop: 40 }} />
        )
      }
    />
  );

  const renderPointsTab = () => (
    <FlatList
      data={history || []}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderTransaction}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={refetchHistory} tintColor="#7FFFD4" />}
      ListHeaderComponent={<PointsSummaryCard />}
      ListEmptyComponent={
        !historyLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="time" size={64} color="#708090" />
            <Text style={styles.emptyText}>No points activity yet</Text>
          </View>
        ) : (
          <ActivityIndicator color="#7FFFD4" style={{ marginTop: 40 }} />
        )
      }
    />
  );

  const renderLeaderboardTab = () => (
    <FlatList
      data={leaderboard || []}
      keyExtractor={(item, index) => String(item.userId || item.id || index)}
      renderItem={renderLeaderboardEntry}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={leaderboardLoading} onRefresh={refetchLeaderboard} tintColor="#7FFFD4" />}
      ListEmptyComponent={
        !leaderboardLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="podium" size={64} color="#708090" />
            <Text style={styles.emptyText}>Leaderboard is empty</Text>
          </View>
        ) : (
          <ActivityIndicator color="#7FFFD4" style={{ marginTop: 40 }} />
        )
      }
    />
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'badges', label: 'Badges' },
    { key: 'points', label: 'Points' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rewards</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContentContainer}>
        {activeTab === 'badges' && renderBadgesTab()}
        {activeTab === 'points' && renderPointsTab()}
        {activeTab === 'leaderboard' && renderLeaderboardTab()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(127, 255, 212, 0.15)',
    borderWidth: 1,
    borderColor: '#7FFFD4',
  },
  tabText: { fontSize: 14, color: '#708090', fontWeight: '500' },
  activeTabText: { color: '#7FFFD4' },
  tabContentContainer: { flex: 1 },
  tabContent: { padding: 20 },
  pointsCard: {
    backgroundColor: 'rgba(127, 255, 212, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(127, 255, 212, 0.2)',
    alignItems: 'center',
    position: 'relative',
  },
  pointsLabel: { fontSize: 14, color: '#708090' },
  pointsValue: { fontSize: 42, fontWeight: 'bold', color: '#7FFFD4', marginTop: 4 },
  pointsIcon: { position: 'absolute', top: 16, right: 16 },
  badgeRow: { justifyContent: 'space-between', marginBottom: 12 },
  badgeCard: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeLocked: { opacity: 0.4 },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeName: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center' },
  badgeDesc: { fontSize: 10, color: '#708090', textAlign: 'center', marginTop: 4, lineHeight: 14 },
  dimmedText: { color: '#555' },
  earnedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  earnedText: { fontSize: 10, color: '#7FFFD4', fontWeight: '500' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  lockedText: { fontSize: 10, color: '#708090' },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  transactionIcon: { marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, color: '#fff', fontWeight: '500' },
  transactionDate: { fontSize: 12, color: '#708090', marginTop: 4 },
  transactionPoints: { fontSize: 16, fontWeight: '700' },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currentUserRow: {
    backgroundColor: 'rgba(127, 255, 212, 0.08)',
    borderColor: 'rgba(127, 255, 212, 0.3)',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: { fontSize: 16, fontWeight: 'bold' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 15, color: '#fff', fontWeight: '500' },
  currentUserName: { color: '#7FFFD4' },
  leaderboardPoints: { fontSize: 16, fontWeight: '700', color: '#7FFFD4' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#708090', marginTop: 16 },
});
