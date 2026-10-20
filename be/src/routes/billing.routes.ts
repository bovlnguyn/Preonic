import { Router, RequestHandler } from 'express';
import {
  createMyFeePayment,
  disableMySettlementAccount,
  getMyFeeAccount,
  getMyActiveFeePayment,
  getMyFeePayment,
  getMyFeeStatements,
  getMyCashflowReport,
  handleFeePaymentWebhook,
  handleDirectGoodsPaymentWebhook,
  handleUnifiedSePayWebhook,
  listMySettlementAccounts,
  reverifyMySettlementAccount,
  saveMySettlementAccount,
  setMyDefaultSettlementAccount,
  verifyMySettlementAccount,
} from '../controller/billing.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import {
  feePaymentCreateLimiter,
  feePaymentWebhookLimiter,
  bankAccountVerificationLimiter,
} from '../middlewares/ratelimit.middleware';
import {
  validateBillingPagination,
  validateCashflowReport,
  validateCreateFeePayment,
  validateFeePaymentIdParam,
  validateSaveSettlementAccount,
  validateSettlementAccountIdParam,
} from '../middlewares/validation';

const router = Router();

// Provider callback must remain unauthenticated. Authenticity is verified by
// the payment-provider adapter against the exact raw request body.
router.post(
  '/webhooks/sepay',
  feePaymentWebhookLimiter,
  handleUnifiedSePayWebhook as RequestHandler
);

router.post(
  '/webhooks/sepay-goods',
  feePaymentWebhookLimiter,
  handleDirectGoodsPaymentWebhook as RequestHandler
);

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
  '/fee-payments/active',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  getMyActiveFeePayment as RequestHandler
);

router.get(
  '/cashflow-report',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  validateCashflowReport as RequestHandler[],
  getMyCashflowReport as RequestHandler
);

router.get(
  '/statements',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  validateBillingPagination as RequestHandler[],
  getMyFeeStatements as RequestHandler
);

router.post(
  '/fee-payments',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  feePaymentCreateLimiter,
  validateCreateFeePayment as RequestHandler[],
  createMyFeePayment as RequestHandler
);

router.get(
  '/fee-payments/:id',
  restrictTo('farmer', 'enterprise') as RequestHandler,
  validateFeePaymentIdParam as RequestHandler[],
  getMyFeePayment as RequestHandler
);

router.get(
  '/settlement-accounts',
  restrictTo('farmer') as RequestHandler,
  listMySettlementAccounts as RequestHandler
);

router.post(
  '/settlement-accounts/verify',
  restrictTo('farmer') as RequestHandler,
  bankAccountVerificationLimiter,
  validateSaveSettlementAccount as RequestHandler[],
  verifyMySettlementAccount as RequestHandler
);

router.post(
  '/settlement-accounts',
  restrictTo('farmer') as RequestHandler,
  bankAccountVerificationLimiter,
  validateSaveSettlementAccount as RequestHandler[],
  saveMySettlementAccount as RequestHandler
);

router.post(
  '/settlement-accounts/:id/verify',
  restrictTo('farmer') as RequestHandler,
  bankAccountVerificationLimiter,
  validateSettlementAccountIdParam as RequestHandler[],
  reverifyMySettlementAccount as RequestHandler
);

router.patch(
  '/settlement-accounts/:id/default',
  restrictTo('farmer') as RequestHandler,
  validateSettlementAccountIdParam as RequestHandler[],
  setMyDefaultSettlementAccount as RequestHandler
);

router.delete(
  '/settlement-accounts/:id',
  restrictTo('farmer') as RequestHandler,
  validateSettlementAccountIdParam as RequestHandler[],
  disableMySettlementAccount as RequestHandler
);

export default router;
