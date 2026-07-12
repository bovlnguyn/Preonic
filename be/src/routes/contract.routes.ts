import { Router, RequestHandler } from 'express';
import {
  createContract,
  listContracts,
  getContract,
  signContract,
  rejectContract,
} from '../controller/contract.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.post(
  '/',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  createContract as RequestHandler
);

router.get('/', protect as RequestHandler, listContracts as RequestHandler);
router.get('/:id', protect as RequestHandler, getContract as RequestHandler);

router.post('/:id/sign', protect as RequestHandler, signContract as RequestHandler);
router.post(
  '/:id/reject',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  rejectContract as RequestHandler
);

export default router;