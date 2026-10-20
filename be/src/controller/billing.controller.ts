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
  getActivePlatformFeePayment,
  getPlatformFeePayment,
  processPlatformFeePaymentWebhook,
} from '../modules/direct-payment-v2/fee-payment.service';
import {
  disableFarmerSettlementBankAccount,
  getFarmerBankAccountVerificationCapability,
  listFarmerSettlementBankAccounts,
  reverifyFarmerSettlementBankAccount,
  saveFarmerSettlementBankAccount,
  setDefaultFarmerSettlementBankAccount,
  verifyFarmerSettlementBankAccount,
} from '../modules/direct-payment-v2/settlement-bank-account.service';
import { getCashflowReport } from '../modules/direct-payment-v2/cashflow-report.service';
import { processDirectGoodsPaymentWebhook } from '../modules/direct-payment-v2/direct-goods-payment-webhook.service';

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

export const getMyCashflowReport = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    if (role !== 'farmer' && role !== 'enterprise') {
      return res.status(403).json({ success: false, message: 'Vai trò không được hỗ trợ' });
    }

    const report = await getCashflowReport(
      req.user!.id,
      role,
      parsePositiveInt(req.query.months, 12)
    );
    return res.status(200).json({ success: true, data: report });
  } catch (err: any) {
    return sendError(res, err, 'Không thể tạo báo cáo dòng tiền');
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

export const getMyActiveFeePayment = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await getActivePlatformFeePayment(req.user!.id);
    return res.status(200).json({ success: true, data: { payment } });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy mã thanh toán đang hoạt động');
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

    // SePay accepts a 2xx JSON response containing success=true. Processing is
    // already idempotent, so internal payment references stay private.
    void result;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return sendError(res, err, 'Webhook thanh toán không hợp lệ', 400);
  }
};

export const handleDirectGoodsPaymentWebhook = async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ success: false, message: 'Webhook raw body is required' });
    }
    await processDirectGoodsPaymentWebhook(rawBody, req.headers);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return sendError(res, err, 'Webhook tiền hàng không hợp lệ', 400);
  }
};

export const handleUnifiedSePayWebhook = async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ success: false, message: 'Webhook raw body is required' });
    }
    let body: any = {};
    try { body = JSON.parse(rawBody.toString('utf8')); } catch {
      return res.status(400).json({ success: false, message: 'Webhook body is not valid JSON' });
    }
    const searchable = `${String(body?.code || '')} ${String(body?.content || '')}`.toUpperCase();
    if (/PRNFE(?:PF)?[A-Z0-9]{8,}/.test(searchable)) {
      await processPlatformFeePaymentWebhook('bank_transfer', rawBody, req.headers);
    } else {
      await processDirectGoodsPaymentWebhook(rawBody, req.headers);
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    // A unified webhook can receive valid incoming transfers that do not belong
    // to Preonic (including SePay's built-in test event). Acknowledge those
    // after signature/payload validation so SePay does not retry them. Invalid
    // signatures and malformed events still return an error.
    if (Number(err?.statusCode) === 404) {
      return res.status(200).json({ success: true, ignored: true });
    }
    return sendError(res, err, 'Webhook SePay không hợp lệ', 400);
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
      data: {
        accounts,
        verification: getFarmerBankAccountVerificationCapability(),
      },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy tài khoản nhận tiền');
  }
};

export const reverifyMySettlementAccount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = await reverifyFarmerSettlementBankAccount(
      req.user!.id,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      message: result.verification.status === 'verified'
        ? 'Tài khoản ngân hàng đã được xác minh'
        : result.verification.message,
      data: result,
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể xác minh lại tài khoản ngân hàng');
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

export const verifyMySettlementAccount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const verification = await verifyFarmerSettlementBankAccount({
      bankCode: req.body?.bankCode,
      bankName: req.body?.bankName,
      accountHolder: req.body?.accountHolder,
      accountNumber: req.body?.accountNumber,
    });
    return res.status(200).json({ success: true, data: { verification } });
  } catch (err: any) {
    return sendError(res, err, 'Không thể xác minh tài khoản ngân hàng');
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
