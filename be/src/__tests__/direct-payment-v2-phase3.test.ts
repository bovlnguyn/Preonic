import crypto from 'crypto';
import { getMetadataArgsStorage } from 'typeorm';
import {
  getHoChiMinhBillingMonth,
  getPreviousCompletedHoChiMinhMonth,
} from '../modules/direct-payment-v2/billing-period';
import {
  verifyTimestampedHmacWebhook,
} from '../modules/direct-payment-v2/security/webhook-security';
import { MockFeePaymentProvider } from '../modules/direct-payment-v2/providers/mock/mock-fee-payment.provider';
import { PlatformFeePaymentApplication } from '../models/PlatformFeePaymentApplication.entity';
import { ExtendDirectPaymentV2Phase31791420000000 } from '../migrations/ExtendDirectPaymentV2Phase3';

describe('Direct Payment V2 Phase 3', () => {
  test('Vietnam billing month uses UTC+7 boundaries without DST assumptions', () => {
    const period = getHoChiMinhBillingMonth(2026, 9);
    expect(period.logicalStart.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(period.logicalEnd.toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(period.queryStartUtc.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(period.queryEndExclusiveUtc.toISOString()).toBe('2026-09-30T17:00:00.000Z');

    const previous = getPreviousCompletedHoChiMinhMonth(
      new Date('2026-10-08T10:00:00.000Z')
    );
    expect(previous.year).toBe(2026);
    expect(previous.month).toBe(9);
  });

  test('timestamped HMAC rejects tampered body and replayed timestamp', () => {
    const secret = '12345678901234567890123456789012';
    const rawBody = Buffer.from(JSON.stringify({ eventId: 'evt-12345678' }));
    const now = 1_800_000_000_000;
    const timestamp = String(now);

    const signature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.concat([
        Buffer.from(timestamp),
        Buffer.from('.'),
        rawBody,
      ]))
      .digest('hex');

    expect(verifyTimestampedHmacWebhook({
      rawBody,
      headers: {
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
      secret,
      signatureHeader: 'x-signature',
      timestampHeader: 'x-timestamp',
      maxAgeSeconds: 300,
      nowMs: now,
    })).toBe(now);

    expect(() => verifyTimestampedHmacWebhook({
      rawBody: Buffer.from('{"tampered":true}'),
      headers: {
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
      secret,
      signatureHeader: 'x-signature',
      timestampHeader: 'x-timestamp',
      maxAgeSeconds: 300,
      nowMs: now,
    })).toThrow();

    expect(() => verifyTimestampedHmacWebhook({
      rawBody,
      headers: {
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
      secret,
      signatureHeader: 'x-signature',
      timestampHeader: 'x-timestamp',
      maxAgeSeconds: 300,
      nowMs: now + 301_000,
    })).toThrow();
  });

  test('mock fee provider is deterministic by idempotency key', async () => {
    const provider = new MockFeePaymentProvider();
    const request = {
      orderCode: 'PFTEST001',
      amount: 2_000_000,
      currency: 'VND' as const,
      transferContent: 'PRNFEEPFTEST001',
      idempotencyKey: 'fee:0123456789abcdef',
    };

    const first = await provider.createPayment(request);
    const second = await provider.createPayment(request);

    expect(first.providerPaymentId).toBe(second.providerPaymentId);
    expect(first.provider).toBe('mock');
    expect(first.paymentUrl?.startsWith('https://')).toBe(true);
  });

  test('payment application metadata enforces payment/ledger relation entity', () => {
    const tables = getMetadataArgsStorage().tables.map((item) => item.target);
    expect(tables).toContain(PlatformFeePaymentApplication);

    const indices = getMetadataArgsStorage().indices
      .filter((item) => item.target === PlatformFeePaymentApplication)
      .map((item) => item.name);

    expect(indices).toContain(
      'UX_PlatformFeePaymentApplications_Payment_Ledger'
    );
  });

  test('Phase 3 migration does not modify legacy escrow/wallet tables', () => {
    const source = new ExtendDirectPaymentV2Phase31791420000000().up.toString();
    expect(source).toContain('PlatformFeePaymentApplications');
    expect(source).toContain('amount_mismatch');
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/DROP\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.PaymentTransactions/i);
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.Users/i);
  });
});
