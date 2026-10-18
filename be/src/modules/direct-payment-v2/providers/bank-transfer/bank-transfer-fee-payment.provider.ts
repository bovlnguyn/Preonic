import crypto from 'crypto';
import {
  CreateFeePaymentProviderRequest,
  CreateFeePaymentProviderResult,
  FeePaymentProvider,
  NormalizedFeePaymentEventStatus,
  NormalizedFeePaymentWebhookEvent,
} from '../fee-payment-provider.interface';
import { verifyTimestampedHmacWebhook } from '../../security/webhook-security';

const requiredEnv = (name: string): string => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for bank-transfer fee payments`);
  return value;
};

const parseAmount = (value: unknown, required: boolean): number | null => {
  if (value == null && !required) return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Webhook amount is invalid');
  return amount;
};

const parseDate = (value: unknown): Date | null => {
  if (value == null) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('Webhook occurredAt is invalid');
  return date;
};

export const validateBankTransferFeePaymentConfiguration = (): void => {
  const accountNumber = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_NUMBER');
  const bankCode = requiredEnv('FEE_PAYMENT_BANK_CODE');
  const accountHolder = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_HOLDER');
  const webhookSecret = requiredEnv('FEE_PAYMENT_BANK_WEBHOOK_SECRET');
  const baseUrl = process.env.FEE_PAYMENT_QR_BASE_URL || 'https://qr.sepay.vn/img';

  if (!/^[A-Za-z0-9.-]{4,40}$/.test(accountNumber)) {
    throw new Error('Fee bank account number is invalid');
  }
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(bankCode)) {
    throw new Error('Fee bank code is invalid');
  }
  if (
    accountHolder.length > 150 ||
    /[\u0000-\u001f\u007f]/.test(accountHolder)
  ) {
    throw new Error('Fee bank account holder is invalid');
  }
  if (webhookSecret.length < 32) {
    throw new Error('Fee payment webhook secret must contain at least 32 characters');
  }

  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Fee payment QR base URL must use HTTPS');
  }

  const maxAgeSeconds = Number(process.env.FEE_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300);
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 30 || maxAgeSeconds > 3600) {
    throw new Error('Fee payment webhook max age must be between 30 and 3600 seconds');
  }
};

export class BankTransferFeePaymentProvider implements FeePaymentProvider {
  readonly name = 'bank_transfer';

  async createPayment(request: CreateFeePaymentProviderRequest): Promise<CreateFeePaymentProviderResult> {
    const accountNumber = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_NUMBER');
    const bankCode = requiredEnv('FEE_PAYMENT_BANK_CODE');
    requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_HOLDER');
    if (!/^[A-Za-z0-9.-]{4,40}$/.test(accountNumber)) throw new Error('Fee bank account number is invalid');
    if (!/^[A-Za-z0-9_-]{2,30}$/.test(bankCode)) throw new Error('Fee bank code is invalid');

    const baseUrl = process.env.FEE_PAYMENT_QR_BASE_URL || 'https://qr.sepay.vn/img';
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') throw new Error('Fee payment QR base URL must use HTTPS');
    url.searchParams.set('acc', accountNumber);
    url.searchParams.set('bank', bankCode);
    url.searchParams.set('amount', String(request.amount));
    url.searchParams.set('des', request.transferContent);

    const fingerprint = crypto.createHash('sha256').update(request.idempotencyKey).digest('hex').slice(0, 24);
    return {
      provider: this.name,
      providerPaymentId: `bank_${fingerprint}`,
      paymentUrl: url.toString(),
      qrPayload: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async verifyAndNormalizeWebhook(rawBody: Buffer, headers: import('http').IncomingHttpHeaders): Promise<NormalizedFeePaymentWebhookEvent> {
    verifyTimestampedHmacWebhook({
      rawBody,
      headers,
      secret: requiredEnv('FEE_PAYMENT_BANK_WEBHOOK_SECRET'),
      signatureHeader: 'x-preonic-bank-signature',
      timestampHeader: 'x-preonic-bank-timestamp',
      maxAgeSeconds: Number(process.env.FEE_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300),
    });

    let body: any;
    try { body = JSON.parse(rawBody.toString('utf8')); } catch { throw new Error('Webhook body is not valid JSON'); }
    const eventId = String(body?.eventId || '').trim();
    if (!/^[A-Za-z0-9._:-]{8,150}$/.test(eventId)) throw new Error('Webhook eventId is invalid');
    const providerPaymentId = body?.providerPaymentId == null ? null : String(body.providerPaymentId).trim();
    const orderCode = body?.orderCode == null ? null : String(body.orderCode).trim();
    if (!providerPaymentId && !orderCode) throw new Error('Webhook must identify a payment');
    const allowed = new Set<NormalizedFeePaymentEventStatus>(['processing', 'paid', 'failed', 'expired']);
    const status = String(body?.status || '') as NormalizedFeePaymentEventStatus;
    if (!allowed.has(status)) throw new Error('Webhook status is invalid');
    const amount = parseAmount(body?.amount, status === 'paid');
    return {
      provider: this.name,
      providerEventId: eventId,
      providerPaymentId,
      orderCode,
      status,
      amount,
      occurredAt: parseDate(body?.occurredAt),
      sanitizedPayload: { eventId, providerPaymentId, orderCode, status, amount },
    };
  }
}
