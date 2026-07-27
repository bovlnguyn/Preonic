import { Router, RequestHandler } from 'express';
import {
  listConversations,
  startConversation,
  listMessages,
  sendMessage,
  markConversationAsRead,
} from '../controller/messaging.controller';
import { protect } from '../middlewares/auth.middlewares';

const router = Router();

router.get('/conversations', protect as RequestHandler, listConversations as RequestHandler);
router.post('/conversations', protect as RequestHandler, startConversation as RequestHandler);
router.get('/conversations/:id/messages', protect as RequestHandler, listMessages as RequestHandler);
router.post('/conversations/:id/messages', protect as RequestHandler, sendMessage as RequestHandler);
router.patch('/conversations/:id/read', protect as RequestHandler, markConversationAsRead as RequestHandler);

export default router;
