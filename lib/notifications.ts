import { prisma } from '@/lib/prisma';
import { sendPusherNotification, PUSHER_EVENTS } from '@/lib/pusher-server';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'CUSTOMER_UPDATED'
  | 'SYSTEM'
  | 'TASK_ESCALATED'
  | 'TASK_REASSIGNED'
  | 'TASK_COMMENT'
  | 'SLA_WARNING'
  | 'INTERNAL_TASK_ASSIGNED'
  | 'INTERNAL_TASK_SUBMITTED'
  | 'INTERNAL_TASK_APPROVED'
  | 'INTERNAL_TASK_REJECTED'
  | 'INTERNAL_TASK_RATED'
  | 'PERFORMANCE_REVIEW';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });

    // Send real-time notification via Pusher
    await sendPusherNotification(userId, PUSHER_EVENTS.NEW_NOTIFICATION, {
      id: notification.id,
      type,
      title,
      message,
      link,
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function createTaskAssignedNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  locale: string = 'en'
) {
  const title = locale === 'ar' ? 'مهمة جديدة مسندة إليك' : 'New Task Assigned';
  const message = locale === 'ar'
    ? `تم إسناد مهمة "${taskTitle}" إليك`
    : `You have been assigned task "${taskTitle}"`;

  return createNotification({
    userId,
    type: 'TASK_ASSIGNED',
    title,
    message,
    link: `/${locale}/tasks/${taskId}`,
  });
}

export async function createTaskDueNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  dueDate: Date,
  locale: string = 'en'
) {
  const title = locale === 'ar' ? 'مهمة مستحقة قريباً' : 'Task Due Soon';
  const message = locale === 'ar'
    ? `المهمة "${taskTitle}" مستحقة في ${dueDate.toLocaleDateString('ar')}`
    : `Task "${taskTitle}" is due on ${dueDate.toLocaleDateString('en')}`;

  return createNotification({
    userId,
    type: 'TASK_DUE',
    title,
    message,
    link: `/${locale}/tasks/${taskId}`,
  });
}

export async function createCustomerUpdatedNotification(
  userId: string,
  customerName: string,
  customerId: string,
  action: 'created' | 'updated',
  locale: string = 'en'
) {
  const titles = {
    created: locale === 'ar' ? 'عميل جديد' : 'New Customer',
    updated: locale === 'ar' ? 'تحديث عميل' : 'Customer Updated',
  };
  const messages = {
    created: locale === 'ar' ? `تم إضافة عميل جديد "${customerName}"` : `New customer "${customerName}" was added`,
    updated: locale === 'ar' ? `تم تحديث بيانات العميل "${customerName}"` : `Customer "${customerName}" was updated`,
  };

  return createNotification({
    userId,
    type: 'CUSTOMER_UPDATED',
    title: titles[action],
    message: messages[action],
    link: `/${locale}/customers/${customerId}`,
  });
}
