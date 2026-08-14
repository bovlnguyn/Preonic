import { Router, RequestHandler } from 'express';
import { depositEscrow, getEscrow, getEscrowSummary, listEscrows, confirmMilestone } from '../controller/escrow.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import { validateEscrowContractIdParam, validateConfirmMilestone, validateListEscrows } from '../middlewares/validation';

const router = Router();

router.get(
  '/',
  protect as RequestHandler,
  validateListEscrows as RequestHandler[],
  listEscrows as RequestHandler
);

router.get('/summary', protect as RequestHandler, getEscrowSummary as RequestHandler);

router.post(
  '/:contractId/deposit',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateEscrowContractIdParam as RequestHandler[],
  depositEscrow as RequestHandler
);

router.get(
  '/:contractId',
  protect as RequestHandler,
  validateEscrowContractIdParam as RequestHandler[],
  getEscrow as RequestHandler
);

router.post(
  '/:contractId/milestones/:step/confirm',
  protect as RequestHandler,
  validateConfirmMilestone as RequestHandler[],
  confirmMilestone as RequestHandler
);

export default router;
