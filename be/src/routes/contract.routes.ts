import { Router, RequestHandler } from 'express';
import { createContract } from '../controller/contract.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.post(
  '/',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  createContract as RequestHandler
);

export default router;