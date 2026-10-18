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
import {
  BankTransferFeePaymentProvider,
  validateBankTransferFeePaymentConfiguration,
} from '../modules/direct-payment-v2/providers/bank-transfer/bank-transfer-fee-payment.provider';
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

  test('bank-transfer fee provider creates an HTTPS QR instruction without exposing a wallet', async () => {
    const previous = {
      account: process.env.FEE_PAYMENT_BANK_ACCOUNT_NUMBER,
      bank: process.env.FEE_PAYMENT_BANK_CODE,
      holder: process.env.FEE_PAYMENT_BANK_ACCOUNT_HOLDER,
      qr: process.env.FEE_PAYMENT_QR_BASE_URL,
      secret: process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET,
      ttl: process.env.FEE_PAYMENT_QR_TTL_MINUTES,
    };
    process.env.FEE_PAYMENT_BANK_ACCOUNT_NUMBER = '0123456789';
    process.env.FEE_PAYMENT_BANK_CODE = 'MBBank';
    process.env.FEE_PAYMENT_BANK_ACCOUNT_HOLDER = 'PREONIC';
    process.env.FEE_PAYMENT_QR_BASE_URL = 'https://qr.sepay.vn/img';
    process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET = '12345678901234567890123456789012';
    process.env.FEE_PAYMENT_QR_TTL_MINUTES = '10';
    try {
      expect(() => validateBankTransferFeePaymentConfiguration()).not.toThrow();
      const result = await new BankTransferFeePaymentProvider().createPayment({
        orderCode: 'PFTEST0002', amount: 125_000, currency: 'VND',
        transferContent: 'PRNFEEPFTEST0002', idempotencyKey: 'fee:fedcba9876543210',
      });
      const url = new URL(result.paymentUrl!);
      expect(result.provider).toBe('bank_transfer');
      expect(url.protocol).toBe('https:');
      expect(url.searchParams.get('amount')).toBe('125000');
      expect(url.searchParams.get('des')).toBe('PRNFEEPFTEST0002');
      expect(result.expiresAt!.getTime() - Date.now()).toBeGreaterThan(9 * 60 * 1000);
      expect(result.expiresAt!.getTime() - Date.now()).toBeLessThanOrEqual(10 * 60 * 1000);

      const rawBody = Buffer.from(JSON.stringify({
        id: 92704,
        gateway: 'MBBank',
        transactionDate: '2026-10-18 22:30:00',
        accountNumber: '0123456789',
        code: 'PRNFEEPFTEST0002',
        content: 'PRNFEEPFTEST0002 chuyen tien',
        transferType: 'in',
        transferAmount: 125_000,
        referenceCode: 'FT24012345678',
      }));
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = `sha256=${crypto
        .createHmac('sha256', process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET)
        .update(`${timestamp}.${rawBody.toString('utf8')}`)
        .digest('hex')}`;
      const event = await new BankTransferFeePaymentProvider().verifyAndNormalizeWebhook(rawBody, {
        'x-sepay-signature': signature,
        'x-sepay-timestamp': timestamp,
      });
      expect(event).toMatchObject({
        provider: 'bank_transfer',
        providerEventId: 'sepay:92704',
        orderCode: 'PFTEST0002',
        status: 'paid',
        amount: 125_000,
      });
    } finally {
      if (previous.account === undefined) delete process.env.FEE_PAYMENT_BANK_ACCOUNT_NUMBER; else process.env.FEE_PAYMENT_BANK_ACCOUNT_NUMBER = previous.account;
      if (previous.bank === undefined) delete process.env.FEE_PAYMENT_BANK_CODE; else process.env.FEE_PAYMENT_BANK_CODE = previous.bank;
      if (previous.holder === undefined) delete process.env.FEE_PAYMENT_BANK_ACCOUNT_HOLDER; else process.env.FEE_PAYMENT_BANK_ACCOUNT_HOLDER = previous.holder;
      if (previous.qr === undefined) delete process.env.FEE_PAYMENT_QR_BASE_URL; else process.env.FEE_PAYMENT_QR_BASE_URL = previous.qr;
      if (previous.secret === undefined) delete process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET; else process.env.FEE_PAYMENT_BANK_WEBHOOK_SECRET = previous.secret;
      if (previous.ttl === undefined) delete process.env.FEE_PAYMENT_QR_TTL_MINUTES; else process.env.FEE_PAYMENT_QR_TTL_MINUTES = previous.ttl;
    }
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
