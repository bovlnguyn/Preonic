import { AppDataSource } from '../config/database';
import { Notification } from '../models/Notification.entity';

const notificationRepo = () => AppDataSource.getRepository(Notification);

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: string;
}

export const listNotificationsForUser = async (
  userId: string,
  query: ListNotificationsQuery = {}
) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Number(query.page)
    : 1;

  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Number(query.limit), 100)
    : 20;

  const skip = (page - 1) * limit;

  const qb = notificationRepo()
    .createQueryBuilder('notification')
    .where('notification.userId = :userId', { userId });

  if (query.isRead === 'true' || query.isRead === 'false') {
    qb.andWhere('notification.isRead = :isRead', { isRead: query.isRead === 'true' });
  }

  qb.orderBy('notification.createdAt', 'DESC').skip(skip).take(limit);

  const [notifications, total] = await qb.getManyAndCount();
  const unreadCount = await notificationRepo().count({ where: { userId, isRead: false } });

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getUnreadCount = async (userId: string) =>
  notificationRepo().count({ where: { userId, isRead: false } });

export const markNotificationAsRead = async (id: string, userId: string) => {
  const notification = await notificationRepo().findOne({ where: { id } });
  if (!notification) throw makeError('Khong tim thay thong bao', 404);
  if (notification.userId !== userId) {
    throw makeError('Ban khong co quyen truy cap thong bao nay', 403);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notificationRepo().save(notification);
  }

  return notification;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  await notificationRepo()
    .createQueryBuilder()
    .update(Notification)
    .set({ isRead: true })
    .where('userId = :userId', { userId })
    .andWhere('isRead = :isRead', { isRead: false })
    .execute();
};
