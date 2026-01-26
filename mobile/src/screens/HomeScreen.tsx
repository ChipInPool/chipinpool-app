import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user } = useAuth();

  const { data: pools, refetch, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const balance = parseFloat(user?.balance || '0');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.firstName}!</Text>
          <Text style={styles.subGreeting}>Here's your overview</Text>
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
            <QuickAction icon="add" label="Create Pool" color="#7FFFD4" />
            <QuickAction icon="people" label="Join Pool" color="#60A5FA" />
            <QuickAction icon="card" label="View Cards" color="#F472B6" />
            <QuickAction icon="stats-chart" label="Analytics" color="#FBBF24" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Pools</Text>
          {pools?.slice(0, 3).map((pool: any) => (
            <View key={pool.id} style={styles.poolCard}>
              <View style={styles.poolInfo}>
                <Text style={styles.poolName}>{pool.name}</Text>
                <Text style={styles.poolDescription} numberOfLines={1}>{pool.description}</Text>
              </View>
              <View style={styles.poolProgress}>
                <Text style={styles.poolAmount}>${parseFloat(pool.currentAmount).toLocaleString()}</Text>
                <Text style={styles.poolTarget}>of ${parseFloat(pool.targetAmount).toLocaleString()}</Text>
              </View>
            </View>
          ))}
          {(!pools || pools.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pools yet. Create your first pool!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.quickAction}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 16, color: '#708090', marginTop: 4 },
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
  poolCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poolInfo: { flex: 1 },
  poolName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  poolDescription: { fontSize: 14, color: '#708090', marginTop: 4 },
  poolProgress: { alignItems: 'flex-end' },
  poolAmount: { fontSize: 18, fontWeight: '600', color: '#7FFFD4' },
  poolTarget: { fontSize: 12, color: '#708090' },
  emptyState: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyStateText: { color: '#708090', fontSize: 14 },
});
