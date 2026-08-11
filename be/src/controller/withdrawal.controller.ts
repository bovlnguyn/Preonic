import { Response } from 'express';
import { AuthRequest } from '../types';
import * as withdrawalService from '../services/withdrawal.service';
import { sendError } from '../utils/controller.util';

export const createWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const result = await withdrawalService.createWithdrawalRequest(
      req.user!.id,
      req.user!.role,
      {
        amount: Number(req.body?.amount),
        note: req.body?.note,
        isDemo: !!req.body?.isDemo,
        bankName: req.body?.bankName,
        bankAccountNumber: req.body?.bankAccountNumber,
        bankAccountHolder: req.body?.bankAccountHolder,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Đã gửi yêu cầu rút tiền, vui lòng chờ quản trị viên duyệt',
      data: result,
    });
  } catch (err: any) {
    sendError(res, err, 'Tạo yêu cầu rút tiền thất bại');
  }
};

export const getAdminWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    const result = await withdrawalService.listWithdrawalRequestsForAdmin({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách yêu cầu rút tiền thất bại');
  }
};

export const completeAdminWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const result = await withdrawalService.approveWithdrawalRequest(req.user!.id, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Đã xác nhận chuyển khoản và trừ số dư người dùng',
      data: result,
    });
  } catch (err: any) {
    sendError(res, err, 'Xác nhận rút tiền thất bại');
  }
};

export const rejectAdminWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const result = await withdrawalService.rejectWithdrawalRequest(
      req.user!.id,
      req.params.id,
      req.body?.reason
    );

    res.status(200).json({
      success: true,
      message: 'Đã từ chối yêu cầu rút tiền',
      data: result,
    });
  } catch (err: any) {
    sendError(res, err, 'Từ chối yêu cầu rút tiền thất bại');
  }
};
