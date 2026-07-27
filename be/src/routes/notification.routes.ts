import { Router, RequestHandler } from 'express';
import {
  listNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controller/notification.controller';
import { protect } from '../middlewares/auth.middlewares';

const router = Router();

router.get('/', protect as RequestHandler, listNotifications as RequestHandler);
router.get('/unread-count', protect as RequestHandler, getUnreadCount as RequestHandler);
router.patch('/read-all', protect as RequestHandler, markAllNotificationsAsRead as RequestHandler);
router.patch('/:id/read', protect as RequestHandler, markNotificationAsRead as RequestHandler);

export default router;
