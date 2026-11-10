import { Router, RequestHandler } from 'express';
import * as controller from '../controller/advertisement.controller';
import { protect, requireCompleteProfile, restrictTo } from '../middlewares/auth.middlewares';
import { requireCommercialAccess } from '../middlewares/commercial-access.middleware';
import { uploadAdvertisementBanner } from '../middlewares/uploads.middlewares';

const router = Router();

router.get('/pricing', controller.pricing as RequestHandler);
router.get('/public', controller.listPublic as RequestHandler);
router.post('/:id/impression', controller.track('impression') as RequestHandler);
router.post('/:id/click', controller.track('click') as RequestHandler);
router.get('/mine', protect as RequestHandler, restrictTo('farmer') as RequestHandler, controller.listMine as RequestHandler);
router.post(
  '/',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  requireCompleteProfile as RequestHandler,
  requireCommercialAccess as RequestHandler,
  uploadAdvertisementBanner as RequestHandler,
  controller.create as RequestHandler
);
router.patch('/:id/cancel', protect as RequestHandler, restrictTo('farmer') as RequestHandler, controller.cancel as RequestHandler);

export default router;
