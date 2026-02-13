import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();

  const { data: pools } = useQuery({
    queryKey: ['pools'],
    queryFn: api.pools.list,
  });

  const { data: pointsData } = useQuery({
    queryKey: ['rewardsPoints'],
    queryFn: api.rewards.points,
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const walletBalance = parseFloat(user?.walletBalance || '0');
  const formattedBalance = `$${walletBalance.toFixed(2)}`;
  const poolsCount = String(pools?.length || 0);
  const rewardsPoints = String(pointsData?.points || 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={[colors.mint, colors.mintDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, { shadowColor: colors.mint }]}
          >
            <Text style={[styles.avatarText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>{initials}</Text>
          </LinearGradient>

          <Text style={[styles.name, { color: colors.text }]} data-testid="text-user-fullname">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]} data-testid="text-username">@{user?.username}</Text>

          <View style={[
            styles.kycBadge,
            { backgroundColor: user?.kycStatus === 'verified' ? `${colors.mint}20` : `${colors.yellow}20` }
          ]}>
            <Ionicons
              name={user?.kycStatus === 'verified' ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={user?.kycStatus === 'verified' ? colors.mint : colors.yellow}
            />
            <Text style={[
              styles.kycText,
              { color: user?.kycStatus === 'verified' ? colors.mint : colors.yellow }
            ]} data-testid="text-kyc-status">
              {user?.kycStatus === 'verified' ? 'Verified' : 'Verification Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="people-outline" value={poolsCount} label="Pools" colors={colors} />
          <StatCard icon="wallet-outline" value={formattedBalance} label="Contributed" colors={colors} />
          <StatCard icon="star-outline" value={rewardsPoints} label="Rewards" colors={colors} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <MenuItem
            icon="card-outline"
            iconColor={colors.mint}
            iconBg={`${colors.mint}26`}
            label="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethods')}
            colors={colors}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            iconColor={colors.blue}
            iconBg={`${colors.blue}26`}
            label="Security"
            onPress={() => navigation.navigate('Security')}
            colors={colors}
          />
          <MenuItem
            icon="notifications-outline"
            iconColor={colors.yellow}
            iconBg={`${colors.yellow}26`}
            label="Notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
            colors={colors}
          />
          <MenuItem
            icon="time-outline"
            iconColor={colors.purple}
            iconBg={`${colors.purple}26`}
            label="Activity"
            onPress={() => navigation.navigate('Activity')}
            colors={colors}
          />
          <MenuItem
            icon="repeat-outline"
            iconColor={colors.green}
            iconBg={`${colors.green}26`}
            label="Recurring Payments"
            onPress={() => navigation.navigate('Recurring')}
            colors={colors}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>More</Text>
          <MenuItem
            icon="trophy-outline"
            iconColor={colors.amber}
            iconBg={`${colors.amber}26`}
            label="Rewards & Badges"
            onPress={() => navigation.navigate('Rewards')}
            colors={colors}
          />
          <MenuItem
            icon="settings-outline"
            iconColor={colors.textSecondary}
            iconBg={`${colors.textSecondary}26`}
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
            colors={colors}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
          <MenuItem
            icon="help-circle-outline"
            iconColor={colors.mint}
            iconBg={`${colors.mint}1A`}
            label="Help Center"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="chatbubble-outline"
            iconColor={colors.blue}
            iconBg={`${colors.blue}1A`}
            label="Contact Us"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="information-circle-outline"
            iconColor={colors.textSecondary}
            iconBg={`${colors.textSecondary}1A`}
            label="About"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: `${colors.red}1A`, borderColor: `${colors.red}33` }]} onPress={handleLogout} data-testid="button-logout">
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]} data-testid="text-version">ChipInPool v2.0.1 (Build 12)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, colors }: { icon: string; value: string; label: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`stat-${label.toLowerCase()}`}>
      <Ionicons name={icon as any} size={22} color={colors.mint} style={{ marginBottom: 8 }} />
      <Text style={[styles.statValue, { color: colors.mint }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  iconColor,
  iconBg,
  label,
  onPress,
  colors,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.7}
      data-testid={`button-menu-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    marginBottom: 12,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  kycText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
