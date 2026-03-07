'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  CheckSquare,
  Users,
  Info,
  AlertTriangle,
  ArrowUpCircle,
  MessageSquare,
  Clock,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

type FilterType = 'all' | 'unread' | 'read' | 'urgent';

const URGENT_TYPES = ['TASK_ESCALATED', 'SLA_WARNING', 'INTERNAL_TASK_REJECTED'];
const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(async (append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const offset = append ? notifications.length : 0;
      const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      if (append) {
        setNotifications(prev => [...prev, ...data.data]);
      } else {
        setNotifications(data.data);
      }
      setUnreadCount(data.unreadCount);
      setHasMore(data.data.length === PAGE_SIZE);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [notifications.length, t]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success(t('notifications.markAllRead'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const promises = notifications.map(n =>
        fetch(`/api/notifications/${n.id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setNotifications([]);
      setUnreadCount(0);
      toast.success(t('notifications.deleteAll'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      TASK_ASSIGNED: <CheckSquare className="size-5 text-primary" />,
      TASK_DUE: <AlertCircle className="size-5 text-amber-500" />,
      CUSTOMER_UPDATED: <Users className="size-5 text-emerald-500" />,
      TASK_ESCALATED: <ArrowUpCircle className="size-5 text-red-500" />,
      TASK_REASSIGNED: <Users className="size-5 text-orange-500" />,
      TASK_COMMENT: <MessageSquare className="size-5 text-blue-500" />,
      SLA_WARNING: <Clock className="size-5 text-red-600" />,
      INTERNAL_TASK_ASSIGNED: <CheckSquare className="size-5 text-indigo-500" />,
      INTERNAL_TASK_SUBMITTED: <ArrowUpCircle className="size-5 text-amber-500" />,
      INTERNAL_TASK_APPROVED: <Check className="size-5 text-emerald-500" />,
      INTERNAL_TASK_REJECTED: <X className="size-5 text-red-500" />,
      INTERNAL_TASK_RATED: <AlertCircle className="size-5 text-yellow-500" />,
      PERFORMANCE_REVIEW: <Info className="size-5 text-purple-500" />,
    };
    return iconMap[type] || <Info className="size-5 text-blue-500" />;
  };

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      TASK_ASSIGNED: t('notifications.taskAssigned'),
      TASK_DUE: t('notifications.taskDue'),
      CUSTOMER_UPDATED: t('notifications.customerUpdated'),
      SYSTEM: t('notifications.system'),
      TASK_ESCALATED: t('notifications.taskEscalated'),
      TASK_REASSIGNED: t('notifications.taskReassigned'),
      TASK_COMMENT: t('notifications.taskComment'),
      SLA_WARNING: t('notifications.slaWarning'),
      INTERNAL_TASK_ASSIGNED: t('notifications.internalTaskAssigned'),
      INTERNAL_TASK_SUBMITTED: t('notifications.internalTaskSubmitted'),
      INTERNAL_TASK_APPROVED: t('notifications.internalTaskApproved'),
      INTERNAL_TASK_REJECTED: t('notifications.internalTaskRejected'),
      INTERNAL_TASK_RATED: t('notifications.internalTaskRated'),
      PERFORMANCE_REVIEW: t('notifications.performanceReview'),
    };
    return labelMap[type] || type;
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: locale === 'ar' ? ar : enUS,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    switch (filter) {
      case 'unread': return !n.isRead;
      case 'read': return n.isRead;
      case 'urgent': return URGENT_TYPES.includes(n.type);
      default: return true;
    }
  });

  // Group by date
  const groupedNotifications: { label: string; items: Notification[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  filteredNotifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const label = isToday
      ? t('notifications.today')
      : isYesterday
      ? t('notifications.yesterday')
      : date.toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    const lastGroup = groupedNotifications[groupedNotifications.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(notification);
    } else {
      groupedNotifications.push({ label, items: [notification] });
    }
  });

  const filterButtons: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: t('notifications.all'), count: notifications.length },
    { key: 'unread', label: t('notifications.unread'), count: unreadCount },
    { key: 'urgent', label: t('notifications.urgent'), count: notifications.filter(n => URGENT_TYPES.includes(n.type) && !n.isRead).length },
  ];

  const emptyMessage = filter === 'unread'
    ? t('notifications.noUnread')
    : filter === 'urgent'
    ? t('notifications.noUrgent')
    : t('notifications.noNotifications');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('notifications.title')}
        icon={Bell}
        subtitle={unreadCount > 0 ? `${unreadCount} ${t('notifications.unread')}` : undefined}
        actions={
          <>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
                <CheckCheck className="size-4" />
                <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">{t('notifications.deleteAll')}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('notifications.deleteAllConfirm')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('notifications.deleteAllConfirmDesc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAllNotifications} className="bg-destructive text-white hover:bg-destructive/90">
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filter === btn.key
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {btn.label}
            {btn.count !== undefined && btn.count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                filter === btn.key
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="shadow-premium">
              <CardContent className="p-4">
                <div className="flex gap-3 animate-pulse">
                  <div className="size-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                    <div className="h-3 w-1/4 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Bell className="size-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-medium">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map(group => (
            <div key={group.label}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Notification Cards */}
              <div className="space-y-2">
                {group.items.map(notification => (
                  <Card
                    key={notification.id}
                    className={`shadow-premium cursor-pointer transition-all duration-200 hover:shadow-premium-lg group ${
                      !notification.isRead ? 'bg-primary/[0.03] border-primary/20' : ''
                    } ${URGENT_TYPES.includes(notification.type) && !notification.isRead ? 'border-s-2 border-s-destructive' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${
                                  !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {notification.title}
                                </p>
                                {!notification.isRead && (
                                  <span className="shrink-0 size-2 rounded-full bg-primary" />
                                )}
                                {URGENT_TYPES.includes(notification.type) && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-destructive/10 text-destructive rounded">
                                    {t('notifications.urgent')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground/60">
                                  {formatTime(notification.createdAt)}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                  {getTypeLabel(notification.type)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  title={t('notifications.markAsRead')}
                                >
                                  <Check className="size-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                title={t('common.delete')}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && filter === 'all' && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNotifications(true)}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                {t('notifications.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
