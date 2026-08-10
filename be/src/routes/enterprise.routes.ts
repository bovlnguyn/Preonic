import { Router, RequestHandler } from 'express';
import { getSuppliers, getSupplierDetail } from '../controller/enterprise.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.get(
  '/suppliers',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  getSuppliers as RequestHandler
);

router.get(
  '/suppliers/:farmerId',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  getSupplierDetail as RequestHandler
);

export default router;
