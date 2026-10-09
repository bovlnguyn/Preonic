import { Router, RequestHandler } from 'express';
import {
  createMyFeePayment,
  disableMySettlementAccount,
  getMyFeeAccount,
  getMyFeePayment,
  getMyFeeStatements,
  handleFeePaymentWebhook,
  listMySettlementAccounts,
  saveMySettlementAccount,
  setMyDefaultSettlementAccount,
} from '../controller/billing.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import {
  feePaymentCreateLimiter,
  feePaymentWebhookLimiter,
} from '../middlewares/ratelimit.middleware';

const router = Router();

// Provider callback must remain unauthenticated. Authenticity is verified by
// the payment-provider adapter against the exact raw request body.
router.post(
  '/webhooks/:provider',
  feePaymentWebhookLimiter,
  handleFeePaymentWebhook as RequestHandler
);

router.use(protect as RequestHandler);

router.get(
  '/account',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  getMyFeeAccount as RequestHandler
);

router.get(
  '/statements',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  getMyFeeStatements as RequestHandler
);

router.post(
  '/fee-payments',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  feePaymentCreateLimiter,
  createMyFeePayment as RequestHandler
);

router.get(
  '/fee-payments/:id',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  getMyFeePayment as RequestHandler
);

router.get(
  '/settlement-accounts',
  restrictTo('farmer') as RequestHandler,
  listMySettlementAccounts as RequestHandler
);

router.post(
  '/settlement-accounts',
  restrictTo('farmer') as RequestHandler,
  saveMySettlementAccount as RequestHandler
);

router.patch(
  '/settlement-accounts/:id/default',
  restrictTo('farmer') as RequestHandler,
  setMyDefaultSettlementAccount as RequestHandler
);

router.delete(
  '/settlement-accounts/:id',
  restrictTo('farmer') as RequestHandler,
  disableMySettlementAccount as RequestHandler
);

export default router;
