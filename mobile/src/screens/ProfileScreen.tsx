import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  navy: '#001F3F',
  navyLight: '#002A54',
  mint: '#7FFFD4',
  mintDark: '#5ECFA0',
  slate: '#708090',
  white: '#FFFFFF',
  blue: '#4A90D9',
  yellow: '#FBBF24',
  purple: '#A78BFA',
  amber: '#F59E0B',
  red: '#f87171',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={[COLORS.mint, COLORS.mintDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <Text style={styles.name} data-testid="text-user-fullname">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.username} data-testid="text-username">@{user?.username}</Text>

          <View style={[
            styles.kycBadge,
            { backgroundColor: user?.kycStatus === 'verified' ? 'rgba(127,255,212,0.12)' : 'rgba(251,191,36,0.12)' }
          ]}>
            <Ionicons
              name={user?.kycStatus === 'verified' ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={user?.kycStatus === 'verified' ? COLORS.mint : COLORS.yellow}
            />
            <Text style={[
              styles.kycText,
              { color: user?.kycStatus === 'verified' ? COLORS.mint : COLORS.yellow }
            ]} data-testid="text-kyc-status">
              {user?.kycStatus === 'verified' ? 'Verified' : 'Verification Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="people-outline" value="—" label="Pools" />
          <StatCard icon="wallet-outline" value="—" label="Contributed" />
          <StatCard icon="star-outline" value="—" label="Rewards" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem
            icon="card-outline"
            iconColor={COLORS.mint}
            iconBg="rgba(127,255,212,0.15)"
            label="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethods')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            iconColor={COLORS.blue}
            iconBg="rgba(74,144,217,0.15)"
            label="Security"
            onPress={() => navigation.navigate('Security')}
          />
          <MenuItem
            icon="notifications-outline"
            iconColor={COLORS.yellow}
            iconBg="rgba(251,191,36,0.15)"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
          <MenuItem
            icon="time-outline"
            iconColor={COLORS.purple}
            iconBg="rgba(167,139,250,0.15)"
            label="Activity"
            onPress={() => navigation.navigate('Activity')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <MenuItem
            icon="trophy-outline"
            iconColor={COLORS.amber}
            iconBg="rgba(245,158,11,0.15)"
            label="Rewards & Badges"
            onPress={() => navigation.navigate('Rewards')}
          />
          <MenuItem
            icon="settings-outline"
            iconColor={COLORS.slate}
            iconBg="rgba(112,128,144,0.15)"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem
            icon="help-circle-outline"
            iconColor={COLORS.mint}
            iconBg="rgba(127,255,212,0.10)"
            label="Help Center"
            onPress={() => {}}
          />
          <MenuItem
            icon="chatbubble-outline"
            iconColor={COLORS.blue}
            iconBg="rgba(74,144,217,0.10)"
            label="Contact Us"
            onPress={() => {}}
          />
          <MenuItem
            icon="information-circle-outline"
            iconColor={COLORS.slate}
            iconBg="rgba(112,128,144,0.10)"
            label="About"
            onPress={() => {}}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} data-testid="button-logout">
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version} data-testid="text-version">ChipInPool v2.0.1 (Build 12)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statCard} data-testid={`stat-${label.toLowerCase()}`}>
      <Ionicons name={icon as any} size={22} color={COLORS.mint} style={{ marginBottom: 8 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  iconColor,
  iconBg,
  label,
  onPress,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      data-testid={`button-menu-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
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
    shadowColor: COLORS.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.navy,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: COLORS.slate,
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
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.mint,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.slate,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.slate,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
    color: COLORS.white,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.1)',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  logoutText: {
    color: COLORS.red,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: COLORS.slate,
    fontSize: 12,
    marginTop: 24,
  },
});
