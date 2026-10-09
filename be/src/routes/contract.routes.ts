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
import {
  acceptContractDelivery,
  confirmDirectPaymentReceived,
  getDirectContractPayments,
  getDirectContractProgress,
  getDirectPaymentInstruction,
  markContractPreparing,
  markContractShipped,
  markDirectPaymentSent,
} from '../controller/direct-contract.controller';
import { protect, requireCompleteProfile, restrictTo } from '../middlewares/auth.middlewares';
import { requireCommercialAccess } from '../middlewares/commercial-access.middleware';
import {
  validateCreateContract,
  validateContractIdParam,
  validateCancelContract,
  validateRejectContract,
  validateListContracts,
  validateDirectPaymentIdParam,
  validateDirectDeliveryNote,
} from '../middlewares/validation';

const router = Router();

router.post(
  '/',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  requireCompleteProfile as RequestHandler,
  requireCommercialAccess as RequestHandler,
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

// Direct Payment V2 — existing-contract obligations stay accessible even when
// the user's fee account becomes restricted.
router.get(
  '/:id/direct-progress',
  protect as RequestHandler,
  validateContractIdParam as RequestHandler[],
  getDirectContractProgress as RequestHandler
);
router.get(
  '/:id/direct-payments',
  protect as RequestHandler,
  validateContractIdParam as RequestHandler[],
  getDirectContractPayments as RequestHandler
);
router.get(
  '/:id/direct-payments/:paymentId/instruction',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateDirectPaymentIdParam as RequestHandler[],
  getDirectPaymentInstruction as RequestHandler
);
router.post(
  '/:id/direct-payments/:paymentId/sent',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateDirectPaymentIdParam as RequestHandler[],
  markDirectPaymentSent as RequestHandler
);
router.post(
  '/:id/direct-payments/:paymentId/confirm-received',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateDirectPaymentIdParam as RequestHandler[],
  confirmDirectPaymentReceived as RequestHandler
);
router.post(
  '/:id/delivery/preparing',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateDirectDeliveryNote as RequestHandler[],
  markContractPreparing as RequestHandler
);
router.post(
  '/:id/delivery/shipped',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateDirectDeliveryNote as RequestHandler[],
  markContractShipped as RequestHandler
);
router.post(
  '/:id/delivery/accepted',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  validateContractIdParam as RequestHandler[],
  validateDirectDeliveryNote as RequestHandler[],
  acceptContractDelivery as RequestHandler
);

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
  requireCommercialAccess as RequestHandler,
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
  requireCommercialAccess as RequestHandler,
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
