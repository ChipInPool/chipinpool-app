import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'contribution': return 'cash';
    case 'pool_funded': return 'checkmark-circle';
    case 'milestone': return 'trophy';
    case 'invite': return 'person-add';
    case 'withdrawal': return 'arrow-down';
    default: return 'notifications';
  }
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
  });

  const markAllReadMutation = useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const renderNotification = ({ item }: { item: any }) => (
    <View
      style={[
        styles.notificationCard,
        !item?.read && styles.unreadCard,
      ]}
      data-testid={`notification-item-${item?.id}`}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getNotificationIcon(item?.type ?? '') as any}
          size={22}
          color="#7FFFD4"
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationMessage, !item?.read && styles.unreadMessage]}>
          {item?.message ?? ''}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTimeAgo(item?.createdAt || item?.created_at || new Date().toISOString())}
        </Text>
      </View>
      {!item?.read && <View style={styles.unreadDot} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          data-testid="button-mark-all-read"
        >
          <Text style={styles.markAllRead}>
            {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7FFFD4" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={64} color="#708090" />
              <Text style={styles.emptyStateText}>No notifications yet</Text>
            </View>
          ) : (
            <ActivityIndicator color="#7FFFD4" style={{ marginTop: 40 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  markAllRead: { fontSize: 14, color: '#7FFFD4', fontWeight: '500' },
  listContent: { padding: 20, paddingTop: 8 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unreadCard: {
    borderLeftColor: '#7FFFD4',
    backgroundColor: 'rgba(127, 255, 212, 0.05)',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(127, 255, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationMessage: { fontSize: 14, color: '#ccc', lineHeight: 20 },
  unreadMessage: { color: '#fff', fontWeight: '500' },
  notificationTime: { fontSize: 12, color: '#708090', marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7FFFD4',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: { fontSize: 16, color: '#708090', marginTop: 16 },
});
