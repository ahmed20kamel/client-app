'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertCircle,
  CheckSquare,
  Users,
  Info,
  AlertTriangle,
  ArrowUpCircle,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationCenter() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch session for Pusher channel subscription
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) setSessionUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  // Pusher real-time: instantly re-fetch when a notification event arrives
  useEffect(() => {
    if (!sessionUserId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-user-${sessionUserId}`);
    const handler = () => fetchNotifications();
    channel.bind('new-notification', handler);
    channel.bind('task-updated', handler);
    channel.bind('internal-task-updated', handler);

    return () => {
      channel.unbind('new-notification', handler);
      channel.unbind('task-updated', handler);
      channel.unbind('internal-task-updated', handler);
      channel.unsubscribe();
    };
  }, [sessionUserId]);

  // Smart Polling fallback: 15s when tab is active, 60s when in background
  useEffect(() => {
    fetchNotifications();

    let intervalId: NodeJS.Timeout;
    const ACTIVE_INTERVAL = 15000;
    const BACKGROUND_INTERVAL = 60000;

    const startPolling = (interval: number) => {
      clearInterval(intervalId);
      intervalId = setInterval(fetchNotifications, interval);
    };

    startPolling(ACTIVE_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        startPolling(BACKGROUND_INTERVAL);
      } else {
        fetchNotifications();
        startPolling(ACTIVE_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <CheckSquare className="size-5 text-primary" />;
      case 'TASK_DUE':
        return <AlertCircle className="size-5 text-amber-500" />;
      case 'CUSTOMER_UPDATED':
        return <Users className="size-5 text-emerald-500" />;
      case 'TASK_ESCALATED':
        return <ArrowUpCircle className="size-5 text-red-500" />;
      case 'TASK_REASSIGNED':
        return <Users className="size-5 text-orange-500" />;
      case 'TASK_COMMENT':
        return <MessageSquare className="size-5 text-blue-500" />;
      case 'SLA_WARNING':
        return <Clock className="size-5 text-red-600" />;
      case 'INTERNAL_TASK_ASSIGNED':
        return <CheckSquare className="size-5 text-indigo-500" />;
      case 'INTERNAL_TASK_SUBMITTED':
        return <ArrowUpCircle className="size-5 text-amber-500" />;
      case 'INTERNAL_TASK_APPROVED':
        return <Check className="size-5 text-emerald-500" />;
      case 'INTERNAL_TASK_REJECTED':
        return <X className="size-5 text-red-500" />;
      case 'INTERNAL_TASK_RATED':
        return <AlertCircle className="size-5 text-yellow-500" />;
      case 'PERFORMANCE_REVIEW':
        return <Info className="size-5 text-purple-500" />;
      default:
        return <Info className="size-5 text-blue-500" />;
    }
  };

  const isUrgentNotification = (type: string) => {
    return ['TASK_ESCALATED', 'SLA_WARNING', 'INTERNAL_TASK_REJECTED'].includes(type);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: locale === 'ar' ? ar : enUS,
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-foreground transition-all duration-200 group"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="size-5 animate-pulse" />
        ) : (
          <Bell className="size-5 group-hover:scale-110 transition-transform" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-destructive rounded-full animate-scale-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 end-0 w-80 sm:w-96 bg-background border border-border rounded-2xl shadow-premium-lg overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                {t('notifications.title')}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {unreadCount} {t('notifications.new')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title={t('notifications.markAllRead')}
                >
                  <CheckCheck className="size-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="size-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Bell className="size-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {t('notifications.noNotifications')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-all duration-200 hover:bg-secondary/50 group ${
                      !notification.isRead ? 'bg-primary/5' : ''
                    } ${isUrgentNotification(notification.type) && !notification.isRead ? 'border-s-2 border-s-red-500' : ''}`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`shrink-0 size-10 rounded-xl flex items-center justify-center ${
                        !notification.isRead ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${
                            !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="shrink-0 size-2 mt-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-primary transition-colors"
                            title={t('notifications.markAsRead')}
                          >
                            <Check className="size-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border bg-secondary/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  router.push(`/${locale}/notifications`);
                  setIsOpen(false);
                }}
              >
                {t('notifications.viewAll')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
