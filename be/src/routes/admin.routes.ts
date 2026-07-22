import { Router, RequestHandler } from 'express';
import {
  getUsers,
  getUserDetail,
  toggleUserStatus,
  deleteUser,
} from '../controller/admin.controller';
import { protect, restrictTo } from '../middlewares/auth.middlewares';

const router = Router();

router.use(protect as RequestHandler, restrictTo('admin') as RequestHandler);

router.get('/users', getUsers as RequestHandler);
router.get('/users/:id', getUserDetail as RequestHandler);
router.patch('/users/:id/toggle-status', toggleUserStatus as RequestHandler);
router.delete('/users/:id', deleteUser as RequestHandler);

export default router;
