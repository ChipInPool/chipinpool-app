import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.username}>@{user?.username}</Text>

          <View style={styles.kycBadge}>
            <Ionicons
              name={user?.kycStatus === 'verified' ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={user?.kycStatus === 'verified' ? '#7FFFD4' : '#FBBF24'}
            />
            <Text style={[styles.kycText, { color: user?.kycStatus === 'verified' ? '#7FFFD4' : '#FBBF24' }]}>
              {user?.kycStatus === 'verified' ? 'Verified' : 'Verification Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem
            icon="card-outline"
            label="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethods')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Security"
            onPress={() => navigation.navigate('Security')}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
          <MenuItem
            icon="time-outline"
            label="Activity"
            onPress={() => navigation.navigate('Activity')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <MenuItem
            icon="trophy-outline"
            label="Rewards & Badges"
            onPress={() => navigation.navigate('Rewards')}
          />
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem icon="help-circle-outline" label="Help Center" onPress={() => {}} />
          <MenuItem icon="chatbubble-outline" label="Contact Us" onPress={() => {}} />
          <MenuItem icon="information-circle-outline" label="About" onPress={() => {}} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} data-testid="button-logout">
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} data-testid={`button-menu-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <Ionicons name={icon as any} size={22} color="#708090" />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#708090" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(127, 255, 212, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#7FFFD4' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  username: { fontSize: 16, color: '#708090', marginTop: 4 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  kycText: { fontSize: 14, fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: '#708090', textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  menuLabel: { flex: 1, marginLeft: 12, fontSize: 16, color: '#fff' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(248, 113, 113, 0.1)', padding: 16, borderRadius: 12, marginTop: 8 },
  logoutText: { color: '#f87171', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#708090', fontSize: 12, marginTop: 24 },
});
