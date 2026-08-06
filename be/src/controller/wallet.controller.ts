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

export const withdrawWallet = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.demoWithdrawWallet(
      req.user!.id,
      req.user!.role,
      {
        amount: Number(req.body?.amount),
        note: req.body?.note,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Rut tien demo thanh cong',
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Rut tien demo that bai',
    });
  }
};

export const createSepayTopup = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.createSepayTopupOrder(
      req.user!.id,
      req.user!.role,
      { amount: Number(req.body?.amount) }
    );

    res.status(201).json({
      success: true,
      message: 'Tao lenh nap tien SePay thanh cong',
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Tao lenh nap tien SePay that bai',
    });
  }
};

export const getSepayTopupStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.getSepayTopupStatus(
      req.user!.id,
      req.params.orderCode
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay trang thai lenh nap tien that bai',
    });
  }
};

export const createDemoQrTopup = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.createDemoQrTopupOrder(
      req.user!.id,
      req.user!.role,
      { amount: Number(req.body?.amount) }
    );

    res.status(201).json({
      success: true,
      message: 'Tao lenh nap tien demo thanh cong',
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Tao lenh nap tien demo that bai',
    });
  }
};

export const confirmDemoQrTopup = async (req: AuthRequest, res: Response) => {
  try {
    const result = await walletService.confirmDemoQrTopup(
      req.user!.id,
      req.params.orderCode
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Xac nhan nap tien demo that bai',
    });
  }
};

export const sepayWebhook = async (req: Request, res: Response) => {
  try {
    const authHeader = String(req.headers['authorization'] || '');
    const apiKey = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();

    const result = await walletService.handleSepayWebhook(req.body, apiKey);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Xu ly webhook SePay that bai',
    });
  }
};
