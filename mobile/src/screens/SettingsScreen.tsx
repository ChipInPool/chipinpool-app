import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api, API_URL } from '@/services/api';
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
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async () => {
    try {
      let ImagePicker: any;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        Alert.alert('Not Available', 'Image picker is not available in this build. Please update the app to use this feature.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      setUploadingAvatar(true);
      const asset = result.assets[0];

      const uploadUrlRes = await api.user.getAvatarUploadUrl();
      const { uploadURL, objectPath } = uploadUrlRes;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      await fetch(uploadURL, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': asset.mimeType || 'image/jpeg' },
      });

      await api.user.confirmAvatar(objectPath);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      await refreshUser();
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={[]}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity onPress={handleAvatarUpload} activeOpacity={0.8} style={{ position: 'relative', marginBottom: 12 }}>
              {user?.avatar ? (
                <Image 
                  source={{ uri: user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}` }} 
                  style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.mint }} 
                />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(127, 255, 212, 0.2)' : 'rgba(0, 168, 120, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.mint }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={12} color={isDark ? '#001F3F' : '#FFFFFF'} />
              </View>
            </TouchableOpacity>
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
