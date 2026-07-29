import { Router, RequestHandler } from 'express';
import {
  createVnpayTopup,
  getWallet,
  getWalletTransactions,
  topupWallet,
  vnpayReturn,
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

router.post(
  '/topup/vnpay/create',
  protect as RequestHandler,
  createVnpayTopup as RequestHandler
);

router.get(
  '/vnpay/return',
  vnpayReturn as RequestHandler
);

export default router;
