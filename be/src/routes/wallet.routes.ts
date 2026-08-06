import { Router, RequestHandler } from 'express';
import {
  confirmDemoQrTopup,
  createDemoQrTopup,
  createSepayTopup,
  getSepayTopupStatus,
  getEnterpriseTransactionsOverview,
  getWallet,
  getWalletTransactions,
  sepayWebhook,
  topupWallet,
  withdrawWallet,
} from '../controller/wallet.controller';
import { protect } from '../middlewares/auth.middlewares';

const router = Router();

router.get(
  '/',
  protect as RequestHandler,
  getWallet as RequestHandler
);

router.get(
  '/transactions/overview',
  protect as RequestHandler,
  getEnterpriseTransactionsOverview as RequestHandler
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
  '/withdraw',
  protect as RequestHandler,
  withdrawWallet as RequestHandler
);

router.post(
  '/topup/sepay/create',
  protect as RequestHandler,
  createSepayTopup as RequestHandler
);

router.get(
  '/topup/sepay/:orderCode/status',
  protect as RequestHandler,
  getSepayTopupStatus as RequestHandler
);

// Ban demo cua lenh SePay — khong can cau hinh ngan hang that, khong can webhook/tunnel.
router.post(
  '/topup/sepay/demo/create',
  protect as RequestHandler,
  createDemoQrTopup as RequestHandler
);

router.post(
  '/topup/sepay/demo/:orderCode/confirm',
  protect as RequestHandler,
  confirmDemoQrTopup as RequestHandler
);

// Goi truc tiep boi SePay server-to-server, xac thuc bang Authorization header (API Key)
// thay vi JWT nen khong dung middleware protect.
router.post(
  '/topup/sepay/webhook',
  sepayWebhook as RequestHandler
);

export default router;
