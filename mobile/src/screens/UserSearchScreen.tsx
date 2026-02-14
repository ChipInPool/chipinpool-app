import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { api, API_URL } from '../services/api';

export default function UserSearchScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: () => api.users.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const users = (data as any)?.users || data || [];

  const renderUser = ({ item }: { item: any }) => {
    const initials = ((item.firstName?.[0] || '') + (item.lastName?.[0] || '')).toUpperCase();
    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}
        data-testid={`user-card-${item.id}`}
      >
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar.startsWith('http') ? item.avatar : `${API_URL}${item.avatar}` }}
            style={styles.userAvatar}
          />
        ) : (
          <LinearGradient colors={[colors.mint, colors.mintDark || '#5CCFAB']} style={styles.userAvatar}>
            <Text style={styles.userInitials}>{initials}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>@{item.username}</Text>
          {item.bio && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.bio}</Text>}
        </View>
        {!item.isPublic && <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />}
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Find People</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search by name or username..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
            autoFocus
            data-testid="input-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} data-testid="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {debouncedQuery.length < 2 && (
        <View style={styles.emptyState}>
          <Ionicons name="people" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15 }}>Search for users by name or username</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13, opacity: 0.7 }}>Enter at least 2 characters</Text>
        </View>
      )}

      {isLoading && (
        <ActivityIndicator size="large" color={colors.mint} style={{ marginTop: 40 }} />
      )}

      {!isLoading && debouncedQuery.length >= 2 && (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: colors.textSecondary }}>No users found for "{debouncedQuery}"</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  userInitials: { fontSize: 16, fontWeight: '700', color: '#001F3F' },
  userName: { fontSize: 15, fontWeight: '600' },
});
