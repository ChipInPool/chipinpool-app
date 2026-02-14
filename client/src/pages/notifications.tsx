import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api, queryKeys } from "@/lib/api";
import { useLocation } from "wouter";
import { Bell, BellOff, Check, DollarSign, Trophy, UserPlus, ArrowDown, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

function getNotificationIcon(type: string) {
  switch (type) {
    case "contribution":
      return <DollarSign className="w-5 h-5 text-green-400" />;
    case "pool_funded":
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case "milestone":
      return <Trophy className="w-5 h-5 text-amber-400" />;
    case "invite":
      return <UserPlus className="w-5 h-5 text-blue-400" />;
    case "withdrawal":
      return <ArrowDown className="w-5 h-5 text-red-400" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

export default function Notifications() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications.list,
    enabled: isAuthenticated,
  });

  const markAllReadMutation = useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const notifications = notificationsData?.notifications || notificationsData || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-4" data-testid="notifications-loading">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto" data-testid="notifications-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-notifications-title">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-unread-count">
                {unreadCount} unread
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            className="border-white/10 hover:bg-white/5"
            data-testid="button-mark-all-read"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {markAllReadMutation.isPending ? "Marking..." : "Mark all read"}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3" data-testid="notifications-loading">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="notifications-empty">
            <BellOff className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              When something happens, you'll see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="notifications-list">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  !notification.read
                    ? "bg-primary/5 border-l-2 border-l-primary border-white/10"
                    : "bg-card border-white/5"
                }`}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <p className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {notification.title}
                    </p>
                  )}
                  <p className={`text-sm ${!notification.read ? "text-foreground/80" : "text-muted-foreground"}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1" data-testid={`text-time-${notification.id}`}>
                    {formatDistanceToNow(new Date(notification.createdAt || notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary" data-testid={`indicator-unread-${notification.id}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
