import { Router, RequestHandler } from 'express';
import {
  getWallet,
  getWalletTransactions,
  topupWallet,
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

router.post(
  '/topup',
  protect as RequestHandler,
  topupWallet as RequestHandler
);

export default router;
