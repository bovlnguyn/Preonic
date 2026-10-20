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
import { hashWebhookPayload, verifySePayWebhookAuthentication } from './security/webhook-security';

const getHmacSecret = (): string => String(
    process.env.SEPAY_WEBHOOK_SECRET
    || process.env.DIRECT_PAYMENT_BANK_WEBHOOK_SECRET
    || process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET
    || ''
  ).trim();

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

const parseOccurredAt = (value: unknown): Date | null => {
  if (value == null) return null;
  const raw = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? new Date(`${raw.replace(' ', 'T')}+07:00`)
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export interface DirectGoodsProviderEvent {
  matchedPaymentId: string;
  providerTransactionId: string;
  amount: number;
  destinationAccount: string;
  destinationVirtualAccount?: string;
  payloadHash: string;
  occurredAt?: Date | null;
}

export const confirmDirectGoodsPaymentProviderEvent = async (
  event: DirectGoodsProviderEvent
) => runLockedTransaction(async (manager) => {
  const paymentSnapshot = await manager.getRepository(DirectGoodsPayment).findOne({
    where: { providerTransactionId: event.providerTransactionId },
  });
  if (paymentSnapshot) return { paymentId: paymentSnapshot.id, alreadyProcessed: true };

  const matched = await manager.getRepository(DirectGoodsPayment).findOne({
    where: { id: event.matchedPaymentId },
  });
  if (!matched) throw makeError('Không tìm thấy khoản thanh toán', 404);

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

  if (payment.providerTransactionId === event.providerTransactionId) {
    return { paymentId: payment.id, alreadyProcessed: true };
  }
  if (payment.status === 'confirmed' || payment.providerTransactionId) {
    throw makeError('Khoản thanh toán đã được xác nhận bằng giao dịch khác', 409);
  }
  // `expired` only closes the QR session in the UI. A bank transfer cannot be
  // revoked after the customer confirms it, so an exact late provider event
  // must still be reconciled instead of leaving real money unrecorded.
  if (!['payable', 'awaiting_payment', 'awaiting_confirmation', 'expired'].includes(payment.status)) {
    throw makeError('Trạng thái khoản thanh toán không còn cho phép ghi nhận tiền', 409);
  }
  if (contract.paymentFlow !== 'direct_v2' || contract.status !== 'active') {
    throw makeError('Hợp đồng không còn ở trạng thái nhận thanh toán', 409);
  }
  if (Math.round(Number(payment.amount)) !== event.amount) {
    throw makeError('Số tiền nhận không khớp khoản thanh toán hợp đồng', 409);
  }

  const { accountNumber } = await getBankAccountForPaymentWithManager(
    manager,
    payment.payeeUserId,
    payment.bankAccountId
  );
  if (
    event.destinationAccount !== accountNumber &&
    event.destinationVirtualAccount !== accountNumber
  ) {
    throw makeError('Tài khoản nhận tiền không khớp tài khoản đã xác minh', 409);
  }

  const confirmedAt = event.occurredAt ?? new Date();
  payment.status = 'confirmed';
  payment.confirmationMethod = 'provider_webhook';
  payment.confirmedAt = confirmedAt;
  payment.confirmedBy = null;
  payment.providerTransactionId = event.providerTransactionId;
  payment.providerPayloadHash = event.payloadHash;
  const saved = await manager.getRepository(DirectGoodsPayment).save(payment);

  await postPendingFeesForPaymentWithManager(manager, saved, confirmedAt);
  const progress = await refreshDirectContractPaymentProgressWithManager(
    manager,
    contract,
    confirmedAt
  );
  return { paymentId: saved.id, alreadyProcessed: false, ...progress };
}, { label: 'paymentV2.confirmGoodsPaymentProviderEvent' });

export const processDirectGoodsPaymentWebhook = async (
  rawBody: Buffer,
  headers: IncomingHttpHeaders
) => {
  try {
    verifySePayWebhookAuthentication({
      rawBody,
      headers,
      hmacSecret: getHmacSecret(),
      apiKey: String(process.env.SEPAY_WEBHOOK_API_KEY || '').trim(),
      maxAgeSeconds: Number(process.env.DIRECT_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300),
    });
  } catch {
    throw makeError('Webhook tiền hàng không xác thực được', 401);
  }

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

  return confirmDirectGoodsPaymentProviderEvent({
    matchedPaymentId: matched.id,
    providerTransactionId,
    amount,
    destinationAccount,
    destinationVirtualAccount,
    payloadHash,
    occurredAt: parseOccurredAt(body?.transactionDate),
  });
};
