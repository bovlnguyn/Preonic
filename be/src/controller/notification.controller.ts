import { Response } from 'express';
import { AuthRequest } from '../types';
import * as notificationService from '../services/notification.service';

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const result = await notificationService.listNotificationsForUser(req.user!.id, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      isRead: typeof req.query.isRead === 'string' ? req.query.isRead : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: result.pagination,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay danh sach thong bao that bai',
    });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user!.id);

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay so thong bao chua doc that bai',
    });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'Da danh dau thong bao la da doc',
      data: { notification },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Danh dau thong bao la da doc that bai',
    });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await notificationService.markAllNotificationsAsRead(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Da danh dau tat ca thong bao la da doc',
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Danh dau tat ca thong bao that bai',
    });
  }
};
