import { Router, RequestHandler } from 'express';
import {
  getEligiblePartners,
  createRating,
  getMyRatings,
} from '../controller/partner-rating.controller';
import { protect } from '../middlewares/auth.middlewares';
import { validateCreatePartnerRating } from '../middlewares/validation';

const router = Router();

router.get(
  '/eligible-partners',
  protect as RequestHandler,
  getEligiblePartners as RequestHandler
);

router.get(
  '/me',
  protect as RequestHandler,
  getMyRatings as RequestHandler
);

router.post(
  '/',
  protect as RequestHandler,
  validateCreatePartnerRating,
  createRating as RequestHandler
);

export default router;
