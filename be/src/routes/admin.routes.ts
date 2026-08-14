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
  getCommissions,
  getSystemLogs,
  getSystemLogDetail,
} from '../controller/admin.controller';
import {
  getAdminWithdrawals,
  completeAdminWithdrawal,
  rejectAdminWithdrawal,
} from '../controller/withdrawal.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';
import {
  validateResolveDispute,
  validateDisputeIdParam,
  validateContractIdParam,
  validateUserIdParam,
  validateSystemLogIdParam,
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
router.get('/commissions', getCommissions as RequestHandler);

router.get('/withdrawals', getAdminWithdrawals as RequestHandler);
router.patch('/withdrawals/:id/complete', completeAdminWithdrawal as RequestHandler);
router.patch('/withdrawals/:id/reject', rejectAdminWithdrawal as RequestHandler);

router.get('/system-logs', getSystemLogs as RequestHandler);
router.get('/system-logs/:id', validateSystemLogIdParam as RequestHandler[], getSystemLogDetail as RequestHandler);

export default router;
