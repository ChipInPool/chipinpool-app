import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { api, API_URL } from '../services/api';

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const userId = route.params?.userId;
  const username = route.params?.username;

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ['userProfile', userId || username],
    queryFn: () => username ? api.users.getProfileByUsername(username) : api.users.getProfile(userId),
    enabled: !!(userId || username),
  });

  const followMutation = useMutation({
    mutationFn: () => api.users.follow(profileData?.user?.id || userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId || username] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.users.unfollow(profileData?.user?.id || userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId || username] });
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.mint} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (profileData?.isPrivate) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.privateContainer}>
          <View style={[styles.privateIcon, { backgroundColor: colors.cardBorder }]}>
            <Ionicons name="lock-closed" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.privateName, { color: colors.text }]}>
            {profileData.firstName} {profileData.lastName}
          </Text>
          <Text style={[styles.privateUsername, { color: colors.textSecondary }]}>
            @{profileData.username}
          </Text>
          <Text style={[styles.privateText, { color: colors.textSecondary }]}>
            This profile is private
          </Text>
          <TouchableOpacity
            style={[styles.followButton, { backgroundColor: colors.mint }]}
            onPress={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            data-testid="button-follow-private"
          >
            <Ionicons name="person-add" size={18} color={isDark ? '#001F3F' : '#FFFFFF'} />
            <Text style={[styles.followButtonText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>
              Follow to see their profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const user = profileData?.user || profileData;
  const pools = profileData?.pools || [];
  const isFollowing = profileData?.isFollowing;
  const poolsCreated = parseInt(String(user?.poolsCreated)) || 0;
  const poolsJoined = profileData?.poolsJoined || 0;
  const rating = parseFloat(user?.rating || '5.0') || 5.0;
  const followerCount = user?.followerCount || profileData?.followerCount || 0;
  const followingCount = user?.followingCount || profileData?.followingCount || 0;
  const totalRaised = profileData?.totalRaised || '0.00';
  const totalContributed = user?.totalContributed || '0.00';
  const badges = user?.badges || profileData?.badges || [];
  const recentActivity = profileData?.recentActivity || [];
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.mint} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileHeader}>
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}` }}
              style={[styles.avatar, { borderColor: colors.mint }]}
            />
          ) : (
            <LinearGradient
              colors={[colors.mint, colors.mintDark || '#5CCFAB']}
              style={[styles.avatar, { borderColor: colors.mint }]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          )}
          <Text style={[styles.name, { color: colors.text }]} data-testid="text-user-fullname">{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]} data-testid="text-username">@{user?.username}</Text>
          {user?.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>}

          <View style={styles.metaRow}>
            {user?.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{user.location}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,
              { backgroundColor: isFollowing ? 'transparent' : colors.mint, borderWidth: isFollowing ? 1 : 0, borderColor: colors.cardBorder }
            ]}
            onPress={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
            disabled={followMutation.isPending || unfollowMutation.isPending}
            data-testid="button-follow"
          >
            <Ionicons
              name={isFollowing ? 'person-remove' : 'person-add'}
              size={18}
              color={isFollowing ? colors.text : (isDark ? '#001F3F' : '#FFFFFF')}
            />
            <Text style={[
              styles.followButtonText,
              { color: isFollowing ? colors.text : (isDark ? '#001F3F' : '#FFFFFF') }
            ]}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="stat-created">{poolsCreated}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Created</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="stat-joined">{poolsJoined}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Joined</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={[styles.statValue, { color: colors.text }]} data-testid="stat-rating">{rating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color="#EAB308" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]} data-testid="stat-followers">{followerCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="people" size={16} color={colors.mint} /> Network
          </Text>
          <View style={styles.networkRow}>
            <TouchableOpacity style={[styles.networkItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} data-testid="button-followers">
              <Text style={[styles.networkValue, { color: colors.text }]}>{followerCount}</Text>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.networkItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} data-testid="button-following">
              <Text style={[styles.networkValue, { color: colors.text }]}>{followingCount}</Text>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="trending-up" size={16} color={colors.mint} /> Impact
          </Text>
          <View style={styles.networkRow}>
            <View style={[styles.networkItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.networkValue, { color: colors.mint }]} data-testid="text-total-raised">${parseFloat(totalRaised).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Total Raised</Text>
            </View>
            <View style={[styles.networkItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.networkValue, { color: colors.text }]} data-testid="text-total-contributed">${parseFloat(totalContributed).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Contributed</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              <Ionicons name="trophy" size={16} color="#EAB308" /> Achievements
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{badges.length} earned</Text>
          </View>
          {badges.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No badges yet</Text>
          ) : (
            badges.map((badge: any) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={[styles.badgeIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <Text style={{ fontSize: 20 }}>{badge.icon || '🏆'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.badgeName, { color: colors.text }]}>{badge.name}</Text>
                  <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{badge.description || ''}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {pools.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pools</Text>
            {pools.map((pool: any) => (
              <TouchableOpacity
                key={pool.id}
                style={[styles.poolItem, { borderBottomColor: colors.cardBorder }]}
                onPress={() => navigation.navigate('PoolDetails', { poolId: pool.id })}
                data-testid={`pool-item-${pool.id}`}
              >
                <Text style={{ fontSize: 24 }}>{pool.emoji || '💰'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poolTitle, { color: colors.text }]}>{pool.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    ${parseFloat(pool.currentAmount || '0').toFixed(2)} of ${parseFloat(pool.targetAmount || '0').toFixed(2)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {recentActivity.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 40 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            {recentActivity.map((activity: any) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: isDark ? 'rgba(127,255,212,0.1)' : 'rgba(0,31,63,0.05)' }]}>
                  <Ionicons name="pulse" size={16} color={colors.mint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: colors.text, fontSize: 14 }]}>{activity.description}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#001F3F' },
  name: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  username: { fontSize: 14, marginBottom: 8 },
  bio: { fontSize: 14, textAlign: 'center', marginBottom: 8, paddingHorizontal: 20 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  followButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  followButtonText: { fontSize: 16, fontWeight: '600' },
  statsCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  statDivider: { width: 1, marginHorizontal: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  networkRow: { flexDirection: 'row', gap: 12 },
  networkItem: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  networkValue: { fontSize: 20, fontWeight: '700' },
  networkLabel: { fontSize: 12, marginTop: 4 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  badgeIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 14, fontWeight: '600' },
  badgeDesc: { fontSize: 12 },
  poolItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  poolTitle: { fontSize: 14, fontWeight: '600' },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  privateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  privateIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  privateName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  privateUsername: { fontSize: 14, marginBottom: 16 },
  privateText: { fontSize: 14, marginBottom: 16 },
});
