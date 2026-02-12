import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

function MenuItem({ icon, label, onPress, rightElement }: { icon: string; label: string; onPress?: () => void; rightElement?: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon as any} size={22} color="#708090" />
      <Text style={styles.menuLabel}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#708090" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => api.user.updateProfile({ firstName, lastName }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="#708090"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#708090"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saved && styles.saveButtonSuccess]}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#001F3F" />
              ) : saved ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#001F3F" />
                  <Text style={styles.saveButtonText}>Saved</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#001F3F" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <MenuItem
              icon="notifications-outline"
              label="Notification Preferences"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <MenuItem
              icon="moon-outline"
              label="Appearance"
              rightElement={
                <Text style={{ color: '#708090', fontSize: 14 }}>{isDark ? 'Dark' : 'Light'} (System)</Text>
              }
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <MenuItem
              icon="information-circle-outline"
              label="Version 2.0.1 (Build 12)"
              rightElement={<Text style={styles.versionText}>Latest</Text>}
            />
            <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
            <MenuItem icon="lock-closed-outline" label="Privacy Policy" onPress={() => {}} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  email: { fontSize: 14, color: '#708090', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: '#708090', textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' },
  inputContainer: { marginBottom: 16 },
  label: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7FFFD4', paddingVertical: 16, borderRadius: 12, marginTop: 4 },
  saveButtonSuccess: { backgroundColor: '#7FFFD4' },
  saveButtonText: { color: '#001F3F', fontSize: 16, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 8 },
  menuLabel: { flex: 1, marginLeft: 12, fontSize: 16, color: '#fff' },
  versionText: { fontSize: 14, color: '#708090' },
});
