import { Router, RequestHandler } from 'express';
import {
  getAll, getById, getSimilar, getByRegion, getMyProducts,
  create, update, remove,
  getReviews, addReview, getReviewEligibility,
} from '../controller/product.controller';
import { protect, requireCompleteProfile, restrictTo } from '../middlewares/auth.middlewares';
import { requireCommercialAccess } from '../middlewares/commercial-access.middleware';
import { uploadProductFiles } from '../middlewares/uploads.middlewares';
import {
  validateCreateProduct,
  validatePublicProductList,
  validateFarmerProductList,
  validateRegionProductList,
  validateProductIdParam,
  validateProductRegionParam,
  validateUpdateProduct,
  validateProductReview,
} from '../middlewares/validation';

const router = Router();

// ── Public routes ──
router.get('/', validatePublicProductList as RequestHandler[], getAll as RequestHandler);
router.get(
  '/region/:region',
  validateProductRegionParam as RequestHandler[],
  validateRegionProductList as RequestHandler[],
  getByRegion as RequestHandler
);

// ── Protected routes — Farmer ──
router.get(
  '/my-products',
  protect as RequestHandler,
  validateFarmerProductList as RequestHandler[],
  getMyProducts as RequestHandler
);

// ── Public product detail/reviews ──
router.get('/:id', validateProductIdParam as RequestHandler[], getById as RequestHandler);
router.get('/:id/similar', validateProductIdParam as RequestHandler[], getSimilar as RequestHandler);
router.get('/:id/reviews', validateProductIdParam as RequestHandler[], getReviews as RequestHandler);

router.post(
  '/',
  protect as RequestHandler,
  requireCompleteProfile as RequestHandler,
  requireCommercialAccess as RequestHandler,
  uploadProductFiles as RequestHandler,
  validateCreateProduct as RequestHandler[],
  create as RequestHandler
);

router.put(
  '/:id',
  protect as RequestHandler,
  uploadProductFiles as RequestHandler,
  validateProductIdParam as RequestHandler[],
  validateUpdateProduct as RequestHandler[],
  update as RequestHandler
);

router.delete(
  '/:id',
  protect as RequestHandler,
  validateProductIdParam as RequestHandler[],
  remove as RequestHandler
);

// ── Protected routes — Enterprise ──
router.get(
  '/:id/reviews/eligibility',
  protect as RequestHandler,
  validateProductIdParam as RequestHandler[],
  getReviewEligibility as RequestHandler
);

router.post(
  '/:id/reviews',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateProductIdParam as RequestHandler[],
  validateProductReview as RequestHandler[],
  addReview as RequestHandler
);

export default router;
