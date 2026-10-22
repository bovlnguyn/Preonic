import { Router, RequestHandler } from 'express';
import {
  completeOrder,
  createCropReport,
  createCropReportRequest,
  getOrder,
  ghnWebhook,
  handoverOrder,
  listOrders,
  readyOrderForShipping,
  receiveOrder,
  setReportSchedule,
} from '../controller/order.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import { uploadCropReportImages, uploadLoadingPhoto } from '../middlewares/uploads.middlewares';

const router = Router();

router.post('/webhooks/ghn', ghnWebhook as RequestHandler);
router.use(protect as RequestHandler);
router.get('/', listOrders as RequestHandler);
router.get('/:id', getOrder as RequestHandler);
router.patch('/:id/report-schedule', restrictTo('farmer') as RequestHandler, setReportSchedule as RequestHandler);
router.post('/:id/report-requests', restrictTo('enterprise') as RequestHandler, createCropReportRequest as RequestHandler);
router.post(
  '/:id/crop-reports',
  restrictTo('farmer') as RequestHandler,
  uploadCropReportImages,
  createCropReport as RequestHandler
);
router.post('/:id/ready-to-ship', restrictTo('farmer') as RequestHandler, readyOrderForShipping as RequestHandler);
router.post(
  '/:id/handover',
  restrictTo('farmer') as RequestHandler,
  uploadLoadingPhoto,
  handoverOrder as RequestHandler
);
router.post('/:id/receive', restrictTo('enterprise') as RequestHandler, receiveOrder as RequestHandler);
router.post('/:id/complete', restrictTo('enterprise') as RequestHandler, completeOrder as RequestHandler);

export default router;
