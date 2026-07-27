import { Router, RequestHandler } from 'express';
import {
  getWallet,
  getWalletTransactions,
} from '../controller/wallet.controller';
import { protect } from '../middlewares/auth.middlewares';

const router = Router();

router.get(
  '/',
  protect as RequestHandler,
  getWallet as RequestHandler
);

router.get(
  '/transactions',
  protect as RequestHandler,
  getWalletTransactions as RequestHandler
);

export default router;