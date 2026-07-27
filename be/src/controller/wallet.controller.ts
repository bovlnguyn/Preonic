import { Response } from 'express';
import { AuthRequest } from '../types';
import * as walletService from '../services/wallet.service';

export const getWallet = async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await walletService.getWalletOverview(req.user!.id);

    res.status(200).json({
      success: true,
      data: {
        wallet,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy thông tin ví thất bại',
    });
  }
};

export const getWalletTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.getWalletTransactions(req.user!.id, {
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy lịch sử giao dịch thất bại',
    });
  }
};