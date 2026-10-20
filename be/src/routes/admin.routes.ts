import { Router, RequestHandler } from 'express';
import {
  getUsers,
  getUserDetail,
  toggleUserStatus,
  deleteUser,
  getDashboard,
  getContracts,
  getContractDetail,
  getDisputes,
  getDisputeDetail,
  resolveDispute,
  getTransactions,
  getFees,
  getSystemLogs,
  getSystemLogDetail,
  getSettlementBankAccountReviews,
  reviewSettlementBankAccount,
  verifySettlementBankAccountOnSePay,
} from '../controller/admin.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import {
  validateResolveDispute,
  validateDisputeIdParam,
  validateContractIdParam,
  validateUserIdParam,
  validateSystemLogIdParam,
  validateSettlementAccountIdParam,
} from '../middlewares/validation';

const router = Router();

router.use(protect as RequestHandler, restrictTo('admin') as RequestHandler);

router.get('/dashboard', getDashboard as RequestHandler);

router.get('/users', getUsers as RequestHandler);
router.get(
  '/users/:id',
  validateUserIdParam as RequestHandler[],
  getUserDetail as RequestHandler
);
router.patch(
  '/users/:id/toggle-status',
  validateUserIdParam as RequestHandler[],
  toggleUserStatus as RequestHandler
);
router.post(
  '/settlement-account-reviews/:id/verify-sepay',
  validateSettlementAccountIdParam as RequestHandler[],
  verifySettlementBankAccountOnSePay as RequestHandler
);
router.delete(
  '/users/:id',
  validateUserIdParam as RequestHandler[],
  deleteUser as RequestHandler
);

router.get('/contracts', getContracts as RequestHandler);
router.get(
  '/contracts/:id',
  validateContractIdParam as RequestHandler[],
  getContractDetail as RequestHandler
);

router.get('/disputes', getDisputes as RequestHandler);
router.get(
  '/disputes/:id',
  validateDisputeIdParam as RequestHandler[],
  getDisputeDetail as RequestHandler
);
router.patch(
  '/disputes/:id/resolve',
  validateResolveDispute as RequestHandler[],
  resolveDispute as RequestHandler
);

router.get('/transactions', getTransactions as RequestHandler);
router.get('/fees', getFees as RequestHandler);

router.get('/settlement-account-reviews', getSettlementBankAccountReviews as RequestHandler);
router.patch(
  '/settlement-account-reviews/:id',
  validateSettlementAccountIdParam as RequestHandler[],
  reviewSettlementBankAccount as RequestHandler
);

router.get('/system-logs', getSystemLogs as RequestHandler);
router.get('/system-logs/:id', validateSystemLogIdParam as RequestHandler[], getSystemLogDetail as RequestHandler);

export default router;
