import { Router, RequestHandler } from 'express';
import {
  listConversations,
  getUnreadCount,
  startConversation,
  listMessages,
  sendMessage,
  markConversationAsRead,
} from '../controller/messaging.controller';
import { protect } from '../middlewares/auth.middlewares';
import {
  validateConversationIdParam,
  validateMessagingList,
  validateSendMessage,
  validateStartConversation,
} from '../middlewares/validation';

const router = Router();

router.get('/unread-count', protect as RequestHandler, getUnreadCount as RequestHandler);
router.get('/conversations', protect as RequestHandler, validateMessagingList as RequestHandler[], listConversations as RequestHandler);
router.post('/conversations', protect as RequestHandler, validateStartConversation as RequestHandler[], startConversation as RequestHandler);
router.get('/conversations/:id/messages', protect as RequestHandler, validateConversationIdParam as RequestHandler[], validateMessagingList as RequestHandler[], listMessages as RequestHandler);
router.post('/conversations/:id/messages', protect as RequestHandler, validateConversationIdParam as RequestHandler[], validateSendMessage as RequestHandler[], sendMessage as RequestHandler);
router.patch('/conversations/:id/read', protect as RequestHandler, validateConversationIdParam as RequestHandler[], markConversationAsRead as RequestHandler);

export default router;
