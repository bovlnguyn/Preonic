import { Router, RequestHandler } from 'express';
import { getSuppliers } from '../controller/enterprise.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.get(
  '/suppliers',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  getSuppliers as RequestHandler
);

export default router;
