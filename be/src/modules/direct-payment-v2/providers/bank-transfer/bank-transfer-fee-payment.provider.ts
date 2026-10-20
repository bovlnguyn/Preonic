import crypto from 'crypto';
import {
  CreateFeePaymentProviderRequest,
  CreateFeePaymentProviderResult,
  FeePaymentProvider,
  NormalizedFeePaymentEventStatus,
  NormalizedFeePaymentWebhookEvent,
} from '../fee-payment-provider.interface';
import { verifySePayWebhookAuthentication } from '../../security/webhook-security';
import { buildFeePaymentQrExpiry, getFeePaymentQrTtlMinutes } from '../fee-payment-expiry';
import { toVietQrBankCode } from '../../bank-account-input';

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
  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? new Date(`${raw.replace(' ', 'T')}+07:00`)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error('Webhook occurredAt is invalid');
  return date;
};

export const getBankTransferFeeRecipient = () => ({
  bankCode: requiredEnv('FEE_PAYMENT_BANK_CODE'),
  accountNumber: requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_NUMBER'),
  accountHolder: requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_HOLDER'),
});

const extractOrderCode = (body: any): string => {
  const code = String(body?.code || '').trim().toUpperCase().replace(/\s+/g, '');
  const content = String(body?.content || '').trim().toUpperCase();
  const reference = code.startsWith('PRNFE')
    ? code
    : content.match(/PRNFE(PF[A-Z0-9]{8,38})/)?.[0] || '';
  const orderCode = reference.slice('PRNFE'.length);
  if (!/^PF[A-Z0-9]{8,38}$/.test(orderCode)) {
    throw new Error('SePay payment code is invalid');
  }
  return orderCode;
};

export const validateBankTransferFeePaymentConfiguration = (): void => {
  const accountNumber = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_NUMBER');
  const bankCode = requiredEnv('FEE_PAYMENT_BANK_CODE');
  const accountHolder = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_HOLDER');
  const webhookSecret = String(process.env.SEPAY_WEBHOOK_SECRET || process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET || '').trim();
  const webhookApiKey = String(process.env.SEPAY_WEBHOOK_API_KEY || '').trim();
  const baseUrl = process.env.FEE_PAYMENT_QR_BASE_URL || 'https://vietqr.app/img';

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
  if (webhookSecret.length < 32 && webhookApiKey.length < 32) {
    throw new Error('Fee payment webhook requires an HMAC secret or API key');
  }

  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Fee payment QR base URL must use HTTPS');
  }

  const maxAgeSeconds = Number(process.env.FEE_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300);
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 30 || maxAgeSeconds > 3600) {
    throw new Error('Fee payment webhook max age must be between 30 and 3600 seconds');
  }
  getFeePaymentQrTtlMinutes();
};

export class BankTransferFeePaymentProvider implements FeePaymentProvider {
  readonly name = 'bank_transfer';

  async createPayment(request: CreateFeePaymentProviderRequest): Promise<CreateFeePaymentProviderResult> {
    const accountNumber = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_NUMBER');
    const bankCode = requiredEnv('FEE_PAYMENT_BANK_CODE');
    requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_HOLDER');
    if (!/^[A-Za-z0-9.-]{4,40}$/.test(accountNumber)) throw new Error('Fee bank account number is invalid');
    if (!/^[A-Za-z0-9_-]{2,30}$/.test(bankCode)) throw new Error('Fee bank code is invalid');

    const baseUrl = process.env.FEE_PAYMENT_QR_BASE_URL || 'https://vietqr.app/img';
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') throw new Error('Fee payment QR base URL must use HTTPS');
    url.searchParams.set('acc', accountNumber);
    url.searchParams.set('bank', toVietQrBankCode(bankCode));
    url.searchParams.set('amount', String(request.amount));
    url.searchParams.set('des', request.transferContent);
    url.searchParams.set('template', 'compact');

    const fingerprint = crypto.createHash('sha256').update(request.idempotencyKey).digest('hex').slice(0, 24);
    return {
      provider: this.name,
      providerPaymentId: `bank_${fingerprint}`,
      paymentUrl: url.toString(),
      qrPayload: null,
      expiresAt: buildFeePaymentQrExpiry(),
    };
  }

  async verifyAndNormalizeWebhook(rawBody: Buffer, headers: import('http').IncomingHttpHeaders): Promise<NormalizedFeePaymentWebhookEvent> {
    verifySePayWebhookAuthentication({
      rawBody,
      headers,
      hmacSecret: String(process.env.SEPAY_WEBHOOK_SECRET || process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET || '').trim(),
      apiKey: String(process.env.SEPAY_WEBHOOK_API_KEY || '').trim(),
      maxAgeSeconds: Number(process.env.FEE_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300),
    });

    let body: any;
    try { body = JSON.parse(rawBody.toString('utf8')); } catch { throw new Error('Webhook body is not valid JSON'); }
    const sepayId = String(body?.id ?? '').trim();
    if (!/^\d{1,20}$/.test(sepayId)) throw new Error('SePay transaction id is invalid');
    if (String(body?.transferType || '').trim().toLowerCase() !== 'in') {
      throw new Error('SePay transaction is not incoming');
    }
    const configuredAccount = requiredEnv('FEE_PAYMENT_BANK_ACCOUNT_NUMBER');
    const destinationAccount = String(body?.accountNumber || '').trim();
    const destinationVirtualAccount = String(body?.subAccount || '').trim();
    // SePay reports an official virtual account (VA) in `subAccount`, while
    // `accountNumber` remains the linked parent bank account. Accept the
    // configured recipient only when it matches one of those exact fields so
    // BIDV/MSB/Kienlong/OCB VA payments are not rejected.
    if (
      destinationAccount !== configuredAccount &&
      destinationVirtualAccount !== configuredAccount
    ) {
      throw new Error('SePay destination account does not match');
    }

    const eventId = `sepay:${sepayId}`;
    const orderCode = extractOrderCode(body);
    const status: NormalizedFeePaymentEventStatus = 'paid';
    const amount = parseAmount(body?.transferAmount, true);
    return {
      provider: this.name,
      providerEventId: eventId,
      providerPaymentId: null,
      orderCode,
      status,
      amount,
      occurredAt: parseDate(body?.transactionDate),
      sanitizedPayload: {
        sepayId,
        gateway: String(body?.gateway || '').slice(0, 100),
        accountNumber: configuredAccount,
        receivedViaVirtualAccount: destinationVirtualAccount === configuredAccount,
        orderCode,
        status,
        amount,
        referenceCode: String(body?.referenceCode || '').slice(0, 150),
      },
    };
  }
}
