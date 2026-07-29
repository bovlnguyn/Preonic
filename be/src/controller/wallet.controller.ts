import { Request, Response } from 'express';
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

export const topupWallet = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.demoTopupWallet(
      req.user!.id,
      req.user!.role,
      {
        amount: Number(req.body?.amount),
        note: req.body?.note,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Nap tien demo thanh cong',
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Nap tien demo that bai',
    });
  }
};

export const createVnpayTopup = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.createVnpayTopupPayment(
      req.user!.id,
      req.user!.role,
      {
        amount: Number(req.body?.amount),
        ipAddr: req.ip,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Tao thanh toan VNPay thanh cong',
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Tao thanh toan VNPay that bai',
    });
  }
};

export const vnpayReturn = async (req: Request, res: Response) => {
  try {
    const result = await walletService.handleVnpayReturn(req.query as any);

    return res.redirect(result.redirectUrl);
  } catch {
    return res.redirect(
      process.env.FRONTEND_WALLET_FAILED_URL ||
      'http://localhost:3000/wallet-test?topup=failed'
    );
  }
};
