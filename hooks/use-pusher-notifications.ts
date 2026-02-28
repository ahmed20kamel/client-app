'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { PUSHER_EVENTS } from '@/lib/pusher-server';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}

interface UsePusherNotificationsProps {
  userId: string | null;
  isAdmin?: boolean;
  onNewNotification?: (notification: Notification) => void;
}

export function usePusherNotifications({
  userId,
  isAdmin = false,
  onNewNotification,
}: UsePusherNotificationsProps) {
  const subscribedRef = useRef(false);

  const handleNotification = useCallback(
    (data: Notification) => {
      // Show toast
      toast.info(data.title, {
        description: data.message,
        action: data.link
          ? {
              label: 'View',
              onClick: () => {
                window.location.href = data.link!;
              },
            }
          : undefined,
      });

      // Callback
      onNewNotification?.(data);
    },
    [onNewNotification]
  );

  useEffect(() => {
    if (!userId || subscribedRef.current) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    subscribedRef.current = true;

    // Subscribe to user's private channel
    const userChannel = pusher.subscribe(`private-user-${userId}`);
    userChannel.bind(PUSHER_EVENTS.NEW_NOTIFICATION, handleNotification);
    userChannel.bind(PUSHER_EVENTS.TASK_UPDATED, handleNotification);
    userChannel.bind(PUSHER_EVENTS.INTERNAL_TASK_UPDATED, handleNotification);

    // Subscribe to admin channel if admin
    let adminChannel: ReturnType<typeof pusher.subscribe> | null = null;
    if (isAdmin) {
      adminChannel = pusher.subscribe('private-admin');
      adminChannel.bind(PUSHER_EVENTS.APPROVAL_REQUIRED, handleNotification);
    }

    return () => {
      subscribedRef.current = false;
      userChannel.unbind_all();
      userChannel.unsubscribe();
      if (adminChannel) {
        adminChannel.unbind_all();
        adminChannel.unsubscribe();
      }
    };
  }, [userId, isAdmin, handleNotification]);
}
