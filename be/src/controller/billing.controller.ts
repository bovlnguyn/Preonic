import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { sendError } from '../utils/controller.util';
import {
  getFeeAccountSummary,
} from '../modules/direct-payment-v2/fee-ledger.service';
import {
  listFeeStatementsForUser,
} from '../modules/direct-payment-v2/fee-statement.service';
import {
  createPlatformFeePayment,
  getPlatformFeePayment,
  processPlatformFeePaymentWebhook,
} from '../modules/direct-payment-v2/fee-payment.service';
import {
  disableFarmerSettlementBankAccount,
  listFarmerSettlementBankAccounts,
  saveFarmerSettlementBankAccount,
  setDefaultFarmerSettlementBankAccount,
} from '../modules/direct-payment-v2/settlement-bank-account.service';

const parsePositiveInt = (
  value: unknown,
  fallback: number
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getMyFeeAccount = async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getFeeAccountSummary(req.user!.id);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy công nợ phí');
  }
};

export const getMyFeeStatements = async (req: AuthRequest, res: Response) => {
  try {
    const result = await listFeeStatementsForUser(
      req.user!.id,
      parsePositiveInt(req.query.page, 1),
      parsePositiveInt(req.query.limit, 20)
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy bảng kê phí');
  }
};

export const createMyFeePayment = async (req: AuthRequest, res: Response) => {
  try {
    const idempotencyKey = String(req.header('Idempotency-Key') || '').trim();

    const payment = await createPlatformFeePayment(req.user!.id, {
      idempotencyKey,
      statementId: req.body?.statementId || null,
      amount: req.body?.amount,
    });

    return res.status(201).json({
      success: true,
      message: 'Đã tạo yêu cầu thanh toán phí',
      data: { payment },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể tạo thanh toán phí');
  }
};

export const getMyFeePayment = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await getPlatformFeePayment(
      req.user!.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data: { payment },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy giao dịch phí');
  }
};

export const handleFeePaymentWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    const rawBody = (req as any).rawBody;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Webhook raw body is required',
      });
    }

    const result = await processPlatformFeePaymentWebhook(
      String(req.params.provider || ''),
      rawBody,
      req.headers
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return sendError(res, err, 'Webhook thanh toán không hợp lệ', 400);
  }
};

export const listMySettlementAccounts = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const accounts = await listFarmerSettlementBankAccounts(req.user!.id);
    return res.status(200).json({
      success: true,
      data: { accounts },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy tài khoản nhận tiền');
  }
};

export const saveMySettlementAccount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const account = await saveFarmerSettlementBankAccount(req.user!.id, {
      bankCode: req.body?.bankCode,
      bankName: req.body?.bankName,
      accountHolder: req.body?.accountHolder,
      accountNumber: req.body?.accountNumber,
      makeDefault: req.body?.makeDefault,
    });

    return res.status(201).json({
      success: true,
      message: 'Đã lưu tài khoản nhận tiền',
      data: { account },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lưu tài khoản nhận tiền');
  }
};

export const setMyDefaultSettlementAccount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const account = await setDefaultFarmerSettlementBankAccount(
      req.user!.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật tài khoản nhận tiền mặc định',
      data: { account },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể cập nhật tài khoản mặc định');
  }
};

export const disableMySettlementAccount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const account = await disableFarmerSettlementBankAccount(
      req.user!.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: 'Đã vô hiệu hóa tài khoản nhận tiền',
      data: { account },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể vô hiệu hóa tài khoản nhận tiền');
  }
};
