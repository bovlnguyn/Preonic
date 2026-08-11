import { Router, RequestHandler } from 'express';
import {
  getAll, getById, getSimilar, getByRegion, getMyProducts,
  create, update, remove,
  getReviews, addReview, getReviewEligibility,
} from '../controller/product.controller';
import { protect, requireCompleteProfile, restrictTo } from '../middlewares/auth.middlewares';
import { uploadProductFiles } from '../middlewares/uploads.middlewares';
import { validateCreateProduct } from '../middlewares/validation';

const router = Router();

// ── Public routes ──
router.get('/',                getAll as RequestHandler);
router.get('/region/:region',  getByRegion as RequestHandler);
// ── Protected routes — Farmer ──
router.get(
  '/my-products',
  protect as RequestHandler,
  getMyProducts as RequestHandler
);

router.get('/:id',              getById as RequestHandler);
router.get('/:id/similar',      getSimilar as RequestHandler);
router.get('/:id/reviews',      getReviews as RequestHandler);

// ── Protected routes — Farmer ──

router.post(
  '/',
  protect as RequestHandler,
  requireCompleteProfile as RequestHandler,
  uploadProductFiles,
  validateCreateProduct,
  create as RequestHandler
);

router.put(
  '/:id',
  protect as RequestHandler,
  uploadProductFiles,
  update as RequestHandler
);

router.delete(
  '/:id',
  protect as RequestHandler,
  remove as RequestHandler
);

// ── Protected routes — Enterprise ──
router.get(
  '/:id/reviews/eligibility',
  protect as RequestHandler,
  getReviewEligibility as RequestHandler
);

router.post(
  '/:id/reviews',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  addReview as RequestHandler
);

export default router;