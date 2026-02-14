import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet, SectionList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { api, API_URL } from '../services/api';

export default function FollowersListScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const userId = route.params?.userId;
  const initialTab = route.params?.tab || 'followers';
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: followersData, isLoading: loadingFollowers } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => api.users.getFollowers(userId),
    enabled: !!userId,
  });

  const { data: followingData, isLoading: loadingFollowing } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => api.users.getFollowing(userId),
    enabled: !!userId,
  });

  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: () => api.users.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const updateCacheOptimistically = useCallback((targetId: string, newIsFollowing: boolean) => {
    const updateList = (old: any) => {
      if (!old) return old;
      const list = old?.followers || old?.following || old;
      if (!Array.isArray(list)) return old;
      const updated = list.map((u: any) =>
        u.id === targetId ? { ...u, isFollowing: newIsFollowing } : u
      );
      if (old?.followers) return { ...old, followers: updated };
      if (old?.following) return { ...old, following: updated };
      return updated;
    };

    queryClient.setQueryData(['followers', userId], (old: any) => updateList(old));
    queryClient.setQueryData(['following', userId], (old: any) => {
      if (!old) return old;
      if (!newIsFollowing) {
        const list = old?.following || old;
        if (Array.isArray(list)) {
          const filtered = list.filter((u: any) => u.id !== targetId);
          if (old?.following) return { ...old, following: filtered };
          return filtered;
        }
      }
      return updateList(old);
    });

    queryClient.setQueriesData({ queryKey: ['userSearch'] }, (old: any) => {
      if (!old) return old;
      const list = old?.users || old;
      if (!Array.isArray(list)) return old;
      const updated = list.map((u: any) =>
        u.id === targetId ? { ...u, isFollowing: newIsFollowing } : u
      );
      if (old?.users) return { ...old, users: updated };
      return updated;
    });
  }, [queryClient, userId]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['followers', userId] });
    queryClient.invalidateQueries({ queryKey: ['following', userId] });
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    queryClient.invalidateQueries({ queryKey: ['userSearch'] });
  }, [queryClient, userId]);

  const captureSearchCache = () => {
    const cache: Record<string, any> = {};
    const queries = queryClient.getQueriesData({ queryKey: ['userSearch'] });
    queries.forEach(([key, data]) => { cache[JSON.stringify(key)] = data; });
    return cache;
  };

  const restoreSearchCache = (cache: Record<string, any>) => {
    Object.entries(cache).forEach(([keyStr, data]) => {
      queryClient.setQueryData(JSON.parse(keyStr), data);
    });
  };

  const followMutation = useMutation({
    mutationFn: (targetId: string) => api.users.follow(targetId),
    onMutate: async (targetId: string) => {
      await queryClient.cancelQueries({ queryKey: ['followers', userId] });
      await queryClient.cancelQueries({ queryKey: ['following', userId] });
      const prevFollowers = queryClient.getQueryData(['followers', userId]);
      const prevFollowing = queryClient.getQueryData(['following', userId]);
      const prevSearch = captureSearchCache();
      updateCacheOptimistically(targetId, true);
      return { prevFollowers, prevFollowing, prevSearch };
    },
    onError: (_err, _targetId, context) => {
      if (context?.prevFollowers) queryClient.setQueryData(['followers', userId], context.prevFollowers);
      if (context?.prevFollowing) queryClient.setQueryData(['following', userId], context.prevFollowing);
      if (context?.prevSearch) restoreSearchCache(context.prevSearch);
    },
    onSettled: () => invalidateAll(),
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetId: string) => api.users.unfollow(targetId),
    onMutate: async (targetId: string) => {
      await queryClient.cancelQueries({ queryKey: ['followers', userId] });
      await queryClient.cancelQueries({ queryKey: ['following', userId] });
      const prevFollowers = queryClient.getQueryData(['followers', userId]);
      const prevFollowing = queryClient.getQueryData(['following', userId]);
      const prevSearch = captureSearchCache();
      updateCacheOptimistically(targetId, false);
      return { prevFollowers, prevFollowing, prevSearch };
    },
    onError: (_err, _targetId, context) => {
      if (context?.prevFollowers) queryClient.setQueryData(['followers', userId], context.prevFollowers);
      if (context?.prevFollowing) queryClient.setQueryData(['following', userId], context.prevFollowing);
      if (context?.prevSearch) restoreSearchCache(context.prevSearch);
    },
    onSettled: () => invalidateAll(),
  });

  const followers = (followersData as any)?.followers || followersData || [];
  const following = (followingData as any)?.following || followingData || [];
  const list = activeTab === 'followers' ? followers : following;
  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;

  const filteredList = searchQuery.length > 0
    ? list.filter((u: any) => {
        const q = searchQuery.toLowerCase();
        return (
          (u.firstName || '').toLowerCase().includes(q) ||
          (u.lastName || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q)
        );
      })
    : list;

  const searchUsers = (searchData as any)?.users || searchData || [];
  const existingIds = new Set(list.map((u: any) => u.id));
  const globalSearchResults = searchUsers.filter((u: any) => !existingIds.has(u.id));
  const showGlobalSearch = debouncedQuery.length >= 2;

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
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}
          data-testid={`user-info-${item.id}`}
        >
          <Text style={[styles.userName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>@{item.username}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: item.isFollowing ? 'transparent' : colors.mint, borderWidth: item.isFollowing ? 1 : 0, borderColor: colors.cardBorder }
          ]}
          onPress={() => item.isFollowing ? unfollowMutation.mutate(item.id) : followMutation.mutate(item.id)}
          disabled={followMutation.isPending || unfollowMutation.isPending}
          data-testid={`button-follow-${item.id}`}
        >
          <Text style={[styles.actionButtonText, { color: item.isFollowing ? colors.text : (isDark ? '#001F3F' : '#FFFFFF') }]}>
            {item.isFollowing ? 'Unfollow' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderListContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={colors.mint} style={{ marginTop: 40 }} />;
    }

    const hasLocalResults = filteredList.length > 0;
    const hasGlobalResults = showGlobalSearch && globalSearchResults.length > 0;

    return (
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {filteredList.length > 0 && (
              <View>
                {showGlobalSearch && (
                  <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                    {activeTab === 'followers' ? 'Followers' : 'Following'}
                  </Text>
                )}
                {filteredList.map((item: any) => (
                  <View key={item.id}>{renderUser({ item })}</View>
                ))}
              </View>
            )}

            {showGlobalSearch && (
              <View>
                <View style={[styles.dividerRow, { borderTopColor: colors.cardBorder }]}>
                  <Ionicons name="globe-outline" size={16} color={colors.mint} />
                  <Text style={[styles.sectionHeader, { color: colors.mint, marginTop: 0 }]}>
                    Search all users
                  </Text>
                  {loadingSearch && <ActivityIndicator size="small" color={colors.mint} style={{ marginLeft: 8 }} />}
                </View>
                {!loadingSearch && globalSearchResults.length > 0 && globalSearchResults.map((item: any) => (
                  <View key={item.id}>{renderUser({ item })}</View>
                ))}
                {!loadingSearch && globalSearchResults.length === 0 && (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12, fontSize: 14 }}>
                    No additional users found
                  </Text>
                )}
              </View>
            )}

            {!hasLocalResults && !showGlobalSearch && (
              <View style={styles.emptyState}>
                <Ionicons name="people" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                  {searchQuery.length > 0 ? `No results for "${searchQuery}"` : `No ${activeTab} yet`}
                </Text>
              </View>
            )}

            {!hasLocalResults && showGlobalSearch && !hasGlobalResults && !loadingSearch && (
              <View style={styles.emptyState}>
                <Ionicons name="people" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                  No results for "{searchQuery}"
                </Text>
              </View>
            )}
          </>
        }
        contentContainerStyle={{ padding: 16 }}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Connections</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: colors.mint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('followers')}
          data-testid="tab-followers"
        >
          <Text style={[styles.tabText, { color: activeTab === 'followers' ? colors.mint : colors.textSecondary }]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: colors.mint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('following')}
          data-testid="tab-following"
        >
          <Text style={[styles.tabText, { color: activeTab === 'following' ? colors.mint : colors.textSecondary }]}>
            Following
          </Text>
        </TouchableOpacity>
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
            data-testid="input-filter"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} data-testid="button-clear-filter">
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, marginLeft: 4, opacity: 0.7 }}>
            Type 2+ characters to search all users
          </Text>
        )}
      </View>

      {renderListContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 15, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  userInitials: { fontSize: 16, fontWeight: '700', color: '#001F3F' },
  userName: { fontSize: 15, fontWeight: '600' },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 16, marginTop: 8, borderTopWidth: 1 },
});
