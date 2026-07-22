import { Router, RequestHandler } from 'express';
import { depositEscrow, getEscrow, listEscrows, confirmMilestone } from '../controller/escrow.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.get('/', protect as RequestHandler, listEscrows as RequestHandler);

router.post(
  '/:contractId/deposit',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  depositEscrow as RequestHandler
);

router.get('/:contractId', protect as RequestHandler, getEscrow as RequestHandler);

router.post(
  '/:contractId/milestones/:step/confirm',
  protect as RequestHandler,
  confirmMilestone as RequestHandler
);

export default router;
