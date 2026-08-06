import { Router } from 'express';
import { getPublicAiStatus, publicAiChat } from '../controller/ai.controller';
import { publicAiLimiter } from '../middlewares/ratelimit.middleware';

const router = Router();

router.get('/public/status', getPublicAiStatus);
router.post('/public/chat', publicAiLimiter, publicAiChat);

export default router;
