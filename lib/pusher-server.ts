import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.PUSHER_SECRET) {
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });
  }

  return pusherInstance;
}

// Channel naming convention
export function getUserChannel(userId: string) {
  return `private-user-${userId}`;
}

export function getAdminChannel() {
  return 'private-admin';
}

// Event types
export const PUSHER_EVENTS = {
  NEW_NOTIFICATION: 'new-notification',
  TASK_UPDATED: 'task-updated',
  INTERNAL_TASK_UPDATED: 'internal-task-updated',
  APPROVAL_REQUIRED: 'approval-required',
} as const;

// Send notification via Pusher
export async function sendPusherNotification(
  userId: string,
  event: string,
  data: Record<string, unknown>
) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(getUserChannel(userId), event, data);
  } catch (error) {
    console.error('Pusher trigger error:', error);
  }
}

// Send to admin channel
export async function sendPusherAdminNotification(
  event: string,
  data: Record<string, unknown>
) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(getAdminChannel(), event, data);
  } catch (error) {
    console.error('Pusher admin trigger error:', error);
  }
}
