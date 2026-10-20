import { AppDataSource } from '../../config/database';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { makeError } from '../../utils/error.util';
import { createLogger } from '../../utils/logger';
import { getBankAccountForPaymentWithManager } from './settlement-bank-account.service';
import {
  confirmDirectGoodsPaymentProviderEvent,
  extractDirectGoodsTransferCandidates,
} from './direct-goods-payment-webhook.service';
import { hashWebhookPayload } from './security/webhook-security';

const log = createLogger('GoodsPaymentReconciliation');

const getSePayApiToken = (): string => String(
  process.env.SEPAY_API_TOKEN || process.env.BANK_ACCOUNT_VERIFICATION_API_KEY || ''
).trim();

const getSePayTransactionsUrl = (): URL => {
  const base = String(process.env.SEPAY_API_BASE_URL || 'https://userapi.sepay.vn/v2').trim();
  const url = new URL(`${base.replace(/\/$/, '')}/transactions`);
  if (url.protocol !== 'https:') throw new Error('SEPAY_API_BASE_URL must use HTTPS');
  return url;
};

const parseTransactionDate = (value: unknown): Date | null => {
  if (value == null) return null;
  const raw = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? new Date(`${raw.replace(' ', 'T')}+07:00`)
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fetchMatchingTransaction = async (
  payment: DirectGoodsPayment,
  accountNumber: string
): Promise<any | null> => {
  const token = getSePayApiToken();
  if (!token) return null;

  const url = getSePayTransactionsUrl();
  const amount = Math.round(Number(payment.amount));
  url.searchParams.set('q', payment.transferContent);
  url.searchParams.set('transfer_type', 'in');
  url.searchParams.set('amount_in_min', String(amount));
  url.searchParams.set('amount_in_max', String(amount));
  url.searchParams.set('transaction_date_sort', 'desc');
  url.searchParams.set('timestamp_format', 'iso8601');
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '20');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`SePay API returned HTTP ${response.status}`);
    const body = await response.json() as any;
    const rows = Array.isArray(body?.data) ? body.data : [];

    return rows.find((row: any) => {
      const candidates = extractDirectGoodsTransferCandidates({
        code: row?.code,
        content: row?.transaction_content,
      });
      return candidates.includes(payment.transferContent) &&
        String(row?.transfer_type || '').toLowerCase() === 'in' &&
        Math.round(Number(row?.amount_in || 0)) === amount &&
        String(row?.account_number || '').trim() === accountNumber;
    }) || null;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Webhook is the realtime path; this API lookup is the recovery path for a
 * failed/missed delivery. It is called only while the enterprise keeps an
 * active QR session open.
 */
export const reconcileDirectGoodsPaymentWithSePay = async (
  contractId: string,
  paymentId: string,
  enterpriseUserId: string
) => {
  if (!AppDataSource?.isInitialized) throw makeError('Database is not initialized', 503);

  const payment = await AppDataSource.getRepository(DirectGoodsPayment).findOne({
    where: { id: paymentId, contractId },
    relations: ['contract'],
  });
  if (!payment) throw makeError('Không tìm thấy giao dịch tiền hàng', 404);
  if (
    payment.payerUserId !== enterpriseUserId ||
    payment.contract?.enterpriseId !== enterpriseUserId
  ) {
    throw makeError('Bạn không có quyền đối soát giao dịch này', 403);
  }
  if (payment.status === 'confirmed') {
    return { checked: false, confirmed: true, paymentId: payment.id };
  }
  if (!['payable', 'awaiting_payment', 'awaiting_confirmation', 'expired'].includes(payment.status)) {
    return { checked: false, confirmed: false, paymentId: payment.id };
  }

  const { accountNumber } = await getBankAccountForPaymentWithManager(
    AppDataSource.manager,
    payment.payeeUserId,
    payment.bankAccountId
  );

  try {
    const transaction = await fetchMatchingTransaction(payment, accountNumber);
    if (!transaction) {
      return { checked: Boolean(getSePayApiToken()), confirmed: false, paymentId: payment.id };
    }

    const providerId = String(transaction.id || '').trim();
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(providerId)) {
      throw new Error('SePay transaction id is invalid');
    }
    const payload = Buffer.from(JSON.stringify(transaction));
    const result = await confirmDirectGoodsPaymentProviderEvent({
      matchedPaymentId: payment.id,
      providerTransactionId: `sepay:${providerId}`,
      amount: Math.round(Number(transaction.amount_in)),
      destinationAccount: String(transaction.account_number || '').trim(),
      destinationVirtualAccount: String(transaction.va || '').trim(),
      payloadHash: hashWebhookPayload(payload),
      occurredAt: parseTransactionDate(transaction.transaction_date),
    });
    return { checked: true, confirmed: true, ...result };
  } catch (error: any) {
    log.warn(`SePay reconciliation failed for payment ${payment.id}: ${String(error?.message || error)}`);
    return { checked: false, confirmed: false, paymentId: payment.id };
  }
};
