import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './error.middleware';
import { getFeeAccountSummary } from '../modules/direct-payment-v2/fee-ledger.service';

export const requireCommercialAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Bạn cần đăng nhập để thực hiện giao dịch', 401));
  }

  if (req.user.role === 'admin') return next();

  try {
    const summary = await getFeeAccountSummary(req.user.id);

    if (summary.status === 'restricted') {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'FEE_ACCOUNT_RESTRICTED',
        message:
          'Tài khoản đang bị giới hạn do phí dịch vụ quá hạn. Vui lòng thanh toán phí để tiếp tục tạo giao dịch mới.',
        data: {
          outstandingAmount: summary.outstandingAmount,
          overdueAmount: summary.overdueAmount,
          restrictedAt: summary.restrictedAt,
        },
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
