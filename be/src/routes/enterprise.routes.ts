import { Router, RequestHandler } from 'express';
import { getSuppliers, getSupplierDetail } from '../controller/enterprise.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import { validateSupplierFarmerIdParam, validateSupplierList } from '../middlewares/validation';

const router = Router();

router.get(
  '/suppliers',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateSupplierList as RequestHandler[],
  getSuppliers as RequestHandler
);

router.get(
  '/suppliers/:farmerId',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateSupplierFarmerIdParam as RequestHandler[],
  validateSupplierList as RequestHandler[],
  getSupplierDetail as RequestHandler
);

export default router;
