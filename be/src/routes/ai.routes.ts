import { RequestHandler, Router } from 'express';
import {
  enterpriseAiChat,
  farmerAiChat,
  getEnterpriseAiStatus,
  getFarmerAiStatus,
  getPublicAiStatus,
  publicAiChat,
} from '../controller/ai.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import { enterpriseAiLimiter, farmerAiLimiter, publicAiLimiter } from '../middlewares/ratelimit.middleware';

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

router.get(
  '/enterprise/status',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  getEnterpriseAiStatus as RequestHandler
);
router.post(
  '/enterprise/chat',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  enterpriseAiLimiter as RequestHandler,
  enterpriseAiChat as RequestHandler
);

export default router;
