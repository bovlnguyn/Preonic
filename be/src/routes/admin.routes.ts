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
  getSystemLogs,
  getSystemLogDetail,
} from '../controller/admin.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.use(protect as RequestHandler, restrictTo('admin') as RequestHandler);

router.get('/dashboard', getDashboard as RequestHandler);

router.get('/users', getUsers as RequestHandler);
router.get('/users/:id', getUserDetail as RequestHandler);
router.patch('/users/:id/toggle-status', toggleUserStatus as RequestHandler);
router.delete('/users/:id', deleteUser as RequestHandler);

router.get('/contracts', getContracts as RequestHandler);
router.get('/contracts/:id', getContractDetail as RequestHandler);

router.get('/disputes', getDisputes as RequestHandler);
router.get('/disputes/:id', getDisputeDetail as RequestHandler);
router.patch('/disputes/:id/resolve', resolveDispute as RequestHandler);

router.get('/transactions', getTransactions as RequestHandler);

router.get('/system-logs', getSystemLogs as RequestHandler);
router.get('/system-logs/:id', getSystemLogDetail as RequestHandler);

export default router;
