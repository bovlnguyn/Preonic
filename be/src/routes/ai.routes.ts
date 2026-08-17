import { RequestHandler, Router } from 'express';
import { farmerAiChat, getFarmerAiStatus, getPublicAiStatus, publicAiChat } from '../controller/ai.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import { farmerAiLimiter, publicAiLimiter } from '../middlewares/ratelimit.middleware';

const router = Router();

router.get('/public/status', getPublicAiStatus);
router.post('/public/chat', publicAiLimiter, publicAiChat);

router.get(
  '/farmer/status',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  getFarmerAiStatus as RequestHandler
);
router.post(
  '/farmer/chat',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  farmerAiLimiter as RequestHandler,
  farmerAiChat as RequestHandler
);

export default router;
