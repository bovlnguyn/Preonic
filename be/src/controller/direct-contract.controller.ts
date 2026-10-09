import { Response } from 'express';
import { AuthRequest } from '../types';
import { sendError } from '../utils/controller.util';
import {
  getDirectGoodsPaymentInstruction,
  listDirectGoodsPaymentsForContract,
  markDirectGoodsPaymentSent,
  confirmDirectGoodsPaymentReceived,
} from '../modules/direct-payment-v2/direct-goods-payment.service';
import {
  acceptDirectContractDelivery,
  getDirectContractWorkflow,
  markDirectContractPreparing,
  markDirectContractShipped,
} from '../modules/direct-payment-v2/direct-contract-workflow.service';
import { getFeeAccountSummary } from '../modules/direct-payment-v2/fee-ledger.service';

const ensurePaymentBelongsToContract = async (
  contractId: string,
  paymentId: string,
  userId: string
) => {
  const payments = await listDirectGoodsPaymentsForContract(contractId, userId);
  const payment = payments.find((item) => item.id === paymentId);
  if (!payment) {
    const error: any = new Error('Không tìm thấy khoản thanh toán trong hợp đồng này');
    error.statusCode = 404;
    throw error;
  }
  return payment;
};

export const getDirectContractProgress = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const workflow = await getDirectContractWorkflow(
      req.params.id,
      req.user!.id
    );
    const payments = workflow.paymentFlow === 'direct_v2'
      ? await listDirectGoodsPaymentsForContract(req.params.id, req.user!.id)
      : [];

    return res.status(200).json({
      success: true,
      data: { workflow, payments },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy tiến độ thanh toán trực tiếp');
  }
};

export const getDirectContractPayments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const payments = await listDirectGoodsPaymentsForContract(
      req.params.id,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      data: { payments },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể lấy danh sách thanh toán');
  }
};

export const getDirectPaymentInstruction = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    await ensurePaymentBelongsToContract(
      req.params.id,
      req.params.paymentId,
      req.user!.id
    );

    const instruction = await getDirectGoodsPaymentInstruction(
      req.params.paymentId,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      data: { instruction },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể tạo chỉ dẫn thanh toán');
  }
};

export const markDirectPaymentSent = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    await ensurePaymentBelongsToContract(
      req.params.id,
      req.params.paymentId,
      req.user!.id
    );

    const payment = await markDirectGoodsPaymentSent(
      req.params.paymentId,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      message: 'Đã ghi nhận doanh nghiệp báo chuyển tiền',
      data: { payment },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể xác nhận đã chuyển tiền');
  }
};

export const confirmDirectPaymentReceived = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    await ensurePaymentBelongsToContract(
      req.params.id,
      req.params.paymentId,
      req.user!.id
    );

    const result = await confirmDirectGoodsPaymentReceived(
      req.params.paymentId,
      req.user!.id
    );

    const feeAccount = await getFeeAccountSummary(req.user!.id);

    return res.status(200).json({
      success: true,
      message: 'Đã xác nhận nhận tiền hàng',
      data: {
        ...result,
        feeAccount,
        promptFeePayment: feeAccount.outstandingAmount > 0,
      },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể xác nhận nhận tiền');
  }
};

export const markContractPreparing = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const contract = await markDirectContractPreparing(
      req.params.id,
      req.user!.id,
      req.body?.note
    );

    return res.status(200).json({
      success: true,
      message: 'Đã chuyển hợp đồng sang giai đoạn chuẩn bị hàng',
      data: { contract },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể cập nhật trạng thái chuẩn bị hàng');
  }
};

export const markContractShipped = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const contract = await markDirectContractShipped(
      req.params.id,
      req.user!.id,
      req.body?.note
    );

    return res.status(200).json({
      success: true,
      message: 'Đã xác nhận hàng đang được giao',
      data: { contract },
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể cập nhật trạng thái giao hàng');
  }
};

export const acceptContractDelivery = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = await acceptDirectContractDelivery(
      req.params.id,
      req.user!.id,
      req.body?.note
    );

    return res.status(200).json({
      success: true,
      message: result.payment
        ? 'Đã xác nhận nhận hàng và tạo khoản thanh toán tiếp theo'
        : result.contractCompleted
          ? 'Đã xác nhận nhận hàng và hoàn tất hợp đồng'
          : 'Đã xác nhận nhận hàng',
      data: result,
    });
  } catch (err: any) {
    return sendError(res, err, 'Không thể xác nhận nhận hàng');
  }
};
