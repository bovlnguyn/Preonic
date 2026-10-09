import crypto from 'crypto';
import {
  CreateFeePaymentProviderRequest,
  CreateFeePaymentProviderResult,
  FeePaymentProvider,
  NormalizedFeePaymentWebhookEvent,
} from '../fee-payment-provider.interface';
import { verifyTimestampedHmacWebhook } from '../../security/webhook-security';

const normalizeMockAmount = (value: unknown): number | null => {
  if (value == null) return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Mock webhook amount is invalid');
  }
  return amount;
};

const normalizeDate = (value: unknown): Date | null => {
  if (value == null) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Mock webhook occurredAt is invalid');
  }
  return parsed;
};

export class MockFeePaymentProvider implements FeePaymentProvider {
  readonly name = 'mock';

  async createPayment(
    request: CreateFeePaymentProviderRequest
  ): Promise<CreateFeePaymentProviderResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock fee-payment provider is disabled in production');
    }

    const fingerprint = crypto
      .createHash('sha256')
      .update(request.idempotencyKey)
      .digest('hex')
      .slice(0, 16);

    return {
      provider: this.name,
      providerPaymentId: `mock_${fingerprint}`,
      paymentUrl: `https://mock-payments.local/pay/${encodeURIComponent(request.orderCode)}`,
      qrPayload: `MOCK|${request.orderCode}|${request.amount}|${request.transferContent}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  async verifyAndNormalizeWebhook(
    rawBody: Buffer,
    headers: import('http').IncomingHttpHeaders
  ): Promise<NormalizedFeePaymentWebhookEvent> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock fee-payment provider is disabled in production');
    }

    const secret = process.env.FEE_PAYMENT_MOCK_WEBHOOK_SECRET || '';
    const maxAge = Number(process.env.FEE_PAYMENT_WEBHOOK_MAX_AGE_SECONDS || 300);

    verifyTimestampedHmacWebhook({
      rawBody,
      headers,
      secret,
      signatureHeader: 'x-preonic-mock-signature',
      timestampHeader: 'x-preonic-mock-timestamp',
      maxAgeSeconds: maxAge,
    });

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new Error('Mock webhook body is not valid JSON');
    }

    const eventId = String(body?.eventId || '').trim();
    if (!/^[A-Za-z0-9._:-]{8,150}$/.test(eventId)) {
      throw new Error('Mock webhook eventId is invalid');
    }

    const providerPaymentId = body?.providerPaymentId == null
      ? null
      : String(body.providerPaymentId).trim();
    const orderCode = body?.orderCode == null
      ? null
      : String(body.orderCode).trim();

    if (!providerPaymentId && !orderCode) {
      throw new Error('Mock webhook must identify a payment');
    }

    const allowedStatuses = new Set(['processing', 'paid', 'failed', 'expired']);
    const status = String(body?.status || '').trim();
    if (!allowedStatuses.has(status)) {
      throw new Error('Mock webhook status is invalid');
    }

    const amount = normalizeMockAmount(body?.amount);
    if (status === 'paid' && amount == null) {
      throw new Error('Paid webhook must include amount');
    }

    return {
      provider: this.name,
      providerEventId: eventId,
      providerPaymentId,
      orderCode,
      status: status as any,
      amount,
      occurredAt: normalizeDate(body?.occurredAt),
      sanitizedPayload: {
        eventId,
        providerPaymentId,
        orderCode,
        status,
        amount,
      },
    };
  }
}
