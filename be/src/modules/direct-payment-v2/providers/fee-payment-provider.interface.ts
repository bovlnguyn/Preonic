import { IncomingHttpHeaders } from 'http';

export type NormalizedFeePaymentEventStatus =
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired';

export interface CreateFeePaymentProviderRequest {
  orderCode: string;
  amount: number;
  currency: 'VND';
  transferContent: string;
  idempotencyKey: string;
  description?: string;
}

export interface CreateFeePaymentProviderResult {
  provider: string;
  providerPaymentId: string;
  paymentUrl?: string | null;
  qrPayload?: string | null;
  expiresAt?: Date | null;
}

export interface NormalizedFeePaymentWebhookEvent {
  provider: string;
  providerEventId: string;
  providerPaymentId?: string | null;
  orderCode?: string | null;
  status: NormalizedFeePaymentEventStatus;
  amount?: number | null;
  occurredAt?: Date | null;
  sanitizedPayload?: Record<string, unknown> | null;
}

export interface FeePaymentProvider {
  readonly name: string;

  createPayment(
    request: CreateFeePaymentProviderRequest
  ): Promise<CreateFeePaymentProviderResult>;

  verifyAndNormalizeWebhook(
    rawBody: Buffer,
    headers: IncomingHttpHeaders
  ): Promise<NormalizedFeePaymentWebhookEvent>;
}
