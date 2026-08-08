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
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.post(
  '/',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  createContract as RequestHandler
);

router.get('/', protect as RequestHandler, listContracts as RequestHandler);
router.get('/summary', protect as RequestHandler, getContractSummary as RequestHandler);
router.get('/:id', protect as RequestHandler, getContract as RequestHandler);
router.delete(
  '/:id',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  deleteContract as RequestHandler
);

router.post(
  '/:id/submit',
  protect as RequestHandler,
  restrictTo('enterprise') as RequestHandler,
  submitContract as RequestHandler
);

router.post('/:id/cancel', protect as RequestHandler, cancelContract as RequestHandler);
router.post('/:id/confirm-cancel', protect as RequestHandler, confirmCancelContract as RequestHandler);
router.post('/:id/decline-cancel', protect as RequestHandler, declineCancelContract as RequestHandler);
router.post('/:id/sign', protect as RequestHandler, signContract as RequestHandler);
router.post(
  '/:id/reject',
  protect as RequestHandler,
  restrictTo('farmer') as RequestHandler,
  rejectContract as RequestHandler
);

export default router;
