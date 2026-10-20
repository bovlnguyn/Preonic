import { In } from 'typeorm';
import { IncomingHttpHeaders } from 'http';
import { AppDataSource } from '../../config/database';
import { Contract } from '../../models/Contract.entity';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { makeError } from '../../utils/error.util';
import { lockByIdOrFail, runLockedTransaction } from '../../utils/transaction-lock.util';
import { getBankAccountForPaymentWithManager } from './settlement-bank-account.service';
import { postPendingFeesForPaymentWithManager } from './fee-ledger.service';
import { refreshDirectContractPaymentProgressWithManager } from './direct-goods-payment.service';
import { hashWebhookPayload, verifyTimestampedHmacWebhook } from './security/webhook-security';

const requiredSecret = (): string => {
  const value = String(
    process.env.SEPAY_WEBHOOK_SECRET
    || process.env.DIRECT_PAYMENT_BANK_WEBHOOK_SECRET
    || process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET
    || ''
  ).trim();
  if (value.length < 32) throw makeError('Webhook tiền hàng chưa được cấu hình an toàn', 503);
  return value;
};

export const extractDirectGoodsTransferCandidates = (body: any): string[] => {
  const values = new Set<string>();
  const code = String(body?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^PRN(?!FE)[A-Z0-9]{6,90}P\d{1,4}$/.test(code)) values.add(code);

  const content = String(body?.content || '').toUpperCase();
  for (const match of content.matchAll(/PRN(?!FE)[A-Z0-9]{6,90}?P\d{1,4}(?![A-Z0-9])/g)) {
    values.add(match[0]);
  }
  return [...values];
};

const parseBody = (rawBody: Buffer): any => {
  try { return JSON.parse(rawBody.toString('utf8')); } catch {
    throw makeError('Webhook tiền hàng không phải JSON hợp lệ', 400);
  }
};

export const processDirectGoodsPaymentWebhook = async (
  rawBody: Buffer,
  headers: IncomingHttpHeaders
) => {
  verifyTimestampedHmacWebhook({
    rawBody,
    headers,
    secret: requiredSecret(),
    signatureHeader: 'x-sepay-signature',
    timestampHeader: 'x-sepay-timestamp',
    maxAgeSeconds: Number(process.env.DIRECT_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300),
  });

  const body = parseBody(rawBody);
  const sepayId = String(body?.id ?? '').trim();
  if (!/^\d{1,20}$/.test(sepayId)) throw makeError('Mã giao dịch SePay không hợp lệ', 400);
  if (String(body?.transferType || '').trim().toLowerCase() !== 'in') {
    throw makeError('Webhook không phải giao dịch tiền vào', 400);
  }
  const amount = Number(body?.transferAmount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw makeError('Số tiền webhook không hợp lệ', 400);
  }

  const providerTransactionId = `sepay:${sepayId}`;
  const repo = AppDataSource.getRepository(DirectGoodsPayment);
  const duplicate = await repo.findOne({ where: { providerTransactionId } });
  if (duplicate) return { paymentId: duplicate.id, alreadyProcessed: true };

  const candidates = extractDirectGoodsTransferCandidates(body);
  if (!candidates.length) throw makeError('Không tìm thấy mã thanh toán hợp đồng', 404);
  const matched = await repo.findOne({ where: { transferContent: In(candidates) } });
  if (!matched) throw makeError('Không tìm thấy khoản thanh toán hợp đồng tương ứng', 404);

  const destinationAccount = String(body?.accountNumber || '').trim();
  const destinationVirtualAccount = String(body?.subAccount || '').trim();
  if (!destinationAccount && !destinationVirtualAccount) {
    throw makeError('Webhook thiếu tài khoản nhận tiền', 400);
  }
  const payloadHash = hashWebhookPayload(rawBody);

  return runLockedTransaction(async (manager) => {
    const contract = await lockByIdOrFail(
      manager,
      Contract,
      matched.contractId,
      () => makeError('Không tìm thấy hợp đồng của giao dịch', 404)
    );
    const payment = await lockByIdOrFail(
      manager,
      DirectGoodsPayment,
      matched.id,
      () => makeError('Không tìm thấy khoản thanh toán', 404)
    );

    if (payment.providerTransactionId === providerTransactionId) {
      return { paymentId: payment.id, alreadyProcessed: true };
    }
    if (payment.status === 'confirmed' || payment.providerTransactionId) {
      throw makeError('Khoản thanh toán đã được xác nhận bằng giao dịch khác', 409);
    }
    if (!['payable', 'awaiting_payment', 'awaiting_confirmation'].includes(payment.status)) {
      throw makeError('Trạng thái khoản thanh toán không còn cho phép ghi nhận tiền', 409);
    }
    if (contract.paymentFlow !== 'direct_v2' || contract.status !== 'active') {
      throw makeError('Hợp đồng không còn ở trạng thái nhận thanh toán', 409);
    }
    if (Math.round(Number(payment.amount)) !== amount) {
      throw makeError('Số tiền nhận không khớp khoản thanh toán hợp đồng', 409);
    }

    const { accountNumber } = await getBankAccountForPaymentWithManager(
      manager,
      payment.payeeUserId,
      payment.bankAccountId
    );
    if (destinationAccount !== accountNumber && destinationVirtualAccount !== accountNumber) {
      throw makeError('Tài khoản nhận tiền không khớp tài khoản đã xác minh', 409);
    }

    const now = new Date();
    payment.status = 'confirmed';
    payment.confirmationMethod = 'provider_webhook';
    payment.confirmedAt = now;
    payment.confirmedBy = null;
    payment.providerTransactionId = providerTransactionId;
    payment.providerPayloadHash = payloadHash;
    const saved = await manager.getRepository(DirectGoodsPayment).save(payment);

    await postPendingFeesForPaymentWithManager(manager, saved, now);
    const progress = await refreshDirectContractPaymentProgressWithManager(manager, contract, now);
    return { paymentId: saved.id, alreadyProcessed: false, ...progress };
  }, { label: 'paymentV2.processGoodsPaymentWebhook' });
};
