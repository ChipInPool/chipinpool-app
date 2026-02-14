import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '@/theme/ThemeContext';

function MenuItem({ icon, label, onPress, rightElement, colors }: { icon: string; label: string; onPress?: () => void; rightElement?: React.ReactNode; colors: any }) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder }} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon as any} size={22} color={colors.slate} />
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, color: colors.text }}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.slate} />}
    </TouchableOpacity>
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(127, 255, 212, 0.2)' : 'rgba(0, 168, 120, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.mint }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>{user?.firstName} {user?.lastName}</Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>@{user?.username}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{user?.email}</Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' }}>Edit Profile</Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>First Name</Text>
              <TextInput
                style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 16, color: colors.text, fontSize: 16 }}
                placeholder="First Name"
                placeholderTextColor={colors.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>Last Name</Text>
              <TextInput
                style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 16, color: colors.text, fontSize: 16 }}
                placeholder="Last Name"
                placeholderTextColor={colors.textSecondary}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.mint, paddingVertical: 16, borderRadius: 12, marginTop: 4 }}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color={isDark ? '#001F3F' : '#FFFFFF'} />
              ) : saved ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={isDark ? '#001F3F' : '#FFFFFF'} />
                  <Text style={{ color: isDark ? '#001F3F' : '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Saved</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={isDark ? '#001F3F' : '#FFFFFF'} />
                  <Text style={{ color: isDark ? '#001F3F' : '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' }}>Appearance</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    backgroundColor: themeMode === option.value ? (isDark ? 'rgba(127,255,212,0.15)' : 'rgba(0,168,120,0.1)') : colors.card,
                    borderColor: themeMode === option.value ? colors.mint : colors.cardBorder,
                  }}
                  onPress={() => setThemeMode(option.value)}
                  data-testid={`button-theme-${option.value}`}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={themeMode === option.value ? colors.mint : colors.slate}
                  />
                  <Text style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: themeMode === option.value ? '700' : '500',
                    color: themeMode === option.value ? colors.mint : colors.textSecondary,
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' }}>Preferences</Text>
            <MenuItem
              icon="notifications-outline"
              label="Notification Preferences"
              onPress={() => navigation.navigate('NotificationSettings')}
              colors={colors}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' }}>About</Text>
            <MenuItem
              icon="information-circle-outline"
              label="Version 2.0.1 (Build 12)"
              rightElement={<Text style={{ fontSize: 14, color: colors.textSecondary }}>Latest</Text>}
              colors={colors}
            />
            <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => navigation.navigate('Terms')} colors={colors} />
            <MenuItem icon="lock-closed-outline" label="Privacy Policy" onPress={() => navigation.navigate('Privacy')} colors={colors} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
