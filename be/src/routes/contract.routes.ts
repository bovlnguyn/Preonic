import { Router, RequestHandler } from 'express';
import {
  createContract,
  submitContract,
  listContracts,
  getContractSummary,
  getContract,
  signContract,
  rejectContract,
  cancelContract,
  deleteContract,
  confirmCancelContract,
  declineCancelContract,
} from '../controller/contract.controller';
import { protect, requireCompleteProfile, restrictTo } from '../middlewares/auth.middlewares';
import {
  validateCreateContract,
  validateContractIdParam,
  validateCancelContract,
  validateRejectContract,
  validateListContracts,
} from '../middlewares/validation';

const router = Router();

router.post(
  '/',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  requireCompleteProfile as RequestHandler,
  validateCreateContract as RequestHandler[],
  createContract as RequestHandler
);

router.get(
  '/',
  protect as RequestHandler,
  validateListContracts as RequestHandler[],
  listContracts as RequestHandler
);
router.get('/summary', protect as RequestHandler, getContractSummary as RequestHandler);
router.get(
  '/:id',
  protect as RequestHandler,
  validateContractIdParam as RequestHandler[],
  getContract as RequestHandler
);
router.delete(
  '/:id',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  deleteContract as RequestHandler
);

router.post(
  '/:id/submit',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  requireCompleteProfile as RequestHandler,
  validateContractIdParam as RequestHandler[],
  submitContract as RequestHandler
);

router.post(
  '/:id/cancel',
  protect as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateCancelContract as RequestHandler[],
  cancelContract as RequestHandler
);
router.post(
  '/:id/confirm-cancel',
  protect as RequestHandler,
  validateContractIdParam as RequestHandler[],
  confirmCancelContract as RequestHandler
);
router.post(
  '/:id/decline-cancel',
  protect as RequestHandler,
  validateContractIdParam as RequestHandler[],
  declineCancelContract as RequestHandler
);
router.post(
  '/:id/sign',
  protect as RequestHandler,
  requireCompleteProfile as RequestHandler,
  validateContractIdParam as RequestHandler[],
  signContract as RequestHandler
);
router.post(
  '/:id/reject',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateRejectContract as RequestHandler[],
  rejectContract as RequestHandler
);

export default router;
