import { Router, RequestHandler } from 'express';
import { sendContactRequest } from '../controller/contact.controller';
import { contactLimiter } from '../middlewares/ratelimit.middleware';
import { validateContactRequest } from '../middlewares/validation';

const router = Router();

router.post(
  '/',
  contactLimiter,
  validateContactRequest as RequestHandler[],
  sendContactRequest as RequestHandler
);

export default router;
