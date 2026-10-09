import crypto from 'crypto';
import { getMetadataArgsStorage } from 'typeorm';
import {
  DEFAULT_BUYER_FEE_BPS,
  DEFAULT_SELLER_FEE_BPS,
} from '../modules/direct-payment-v2/types';
import {
  buildOutstandingFeePreview,
  calculateTransactionFees,
} from '../modules/direct-payment-v2/fee-calculator';
import {
  decryptBankAccountNumber,
  encryptBankAccountNumber,
} from '../modules/direct-payment-v2/bank-account-crypto';
import { PlatformFeePolicy } from '../models/PlatformFeePolicy.entity';
import { UserSettlementBankAccount } from '../models/UserSettlementBankAccount.entity';
import { DirectGoodsPayment } from '../models/DirectGoodsPayment.entity';
import { PlatformFeeAccount } from '../models/PlatformFeeAccount.entity';
import { PlatformFeeStatement } from '../models/PlatformFeeStatement.entity';
import { PlatformFeeLedgerEntry } from '../models/PlatformFeeLedgerEntry.entity';
import { PlatformFeePayment } from '../models/PlatformFeePayment.entity';
import { PlatformFeePaymentEvent } from '../models/PlatformFeePaymentEvent.entity';
import { CreateDirectPaymentAndFeeBillingV21791400000000 } from '../migrations/CreateDirectPaymentAndFeeBillingV2';

describe('Direct Payment V2 foundation', () => {
  test('launch fee is below 1% and split 0.5% buyer / 0.3% seller', () => {
    expect(DEFAULT_BUYER_FEE_BPS).toBe(50);
    expect(DEFAULT_SELLER_FEE_BPS).toBe(30);
    expect(DEFAULT_BUYER_FEE_BPS + DEFAULT_SELLER_FEE_BPS).toBe(80);

    const result = calculateTransactionFees(100_000_000);
    expect(result.buyerFeeAmount).toBe(500_000);
    expect(result.sellerFeeAmount).toBe(300_000);
    expect(result.totalPlatformFeeAmount).toBe(800_000);
  });

  test('fee preview supports the UI pattern 1,500,000 (+500,000)', () => {
    expect(buildOutstandingFeePreview(1_500_000, 500_000)).toEqual({
      postedOutstanding: 1_500_000,
      currentTransactionFee: 500_000,
      projectedOutstanding: 2_000_000,
    });
  });

  test('bank account number is encrypted with AES-GCM and can be decrypted only with matching context', () => {
    const encryptionKeyBase64 = crypto.randomBytes(32).toString('base64');
    const hmacKeyBase64 = crypto.randomBytes(32).toString('base64');
    const accountNumber = '1234567890123';

    const encrypted = encryptBankAccountNumber({
      accountNumber,
      userId: 'user-a',
      bankCode: 'VCB',
      encryptionKeyBase64,
      hmacKeyBase64,
    });

    expect(encrypted.ciphertext).not.toContain(accountNumber);
    expect(encrypted.maskedAccountNumber.endsWith('0123')).toBe(true);
    expect(encrypted.fingerprint).toMatch(/^[a-f0-9]{64}$/);

    expect(decryptBankAccountNumber({
      ...encrypted,
      userId: 'user-a',
      bankCode: 'VCB',
      encryptionKeyBase64,
    })).toBe(accountNumber);

    expect(() => decryptBankAccountNumber({
      ...encrypted,
      userId: 'user-b',
      bankCode: 'VCB',
      encryptionKeyBase64,
    })).toThrow();
  });

  test('bank-account entity never defines a plaintext account-number column', () => {
    const columns = getMetadataArgsStorage().columns
      .filter((item) => item.target === UserSettlementBankAccount)
      .map((item) => String(item.propertyName).toLowerCase());

    expect(columns).not.toContain('accountnumber');
    expect(columns).toContain('accountnumberciphertext');
    expect(columns).toContain('maskedaccountnumber');
  });

  test('all new direct-payment and billing entities are registered by TypeORM decorators', () => {
    const targets = new Set(
      getMetadataArgsStorage().tables.map((table) => table.target)
    );

    [
      PlatformFeePolicy,
      UserSettlementBankAccount,
      DirectGoodsPayment,
      PlatformFeeAccount,
      PlatformFeeStatement,
      PlatformFeeLedgerEntry,
      PlatformFeePayment,
      PlatformFeePaymentEvent,
    ].forEach((entity) => expect(targets.has(entity)).toBe(true));
  });

  test('migration is additive and never alters/drops legacy escrow or wallet tables', () => {
    const migration = new CreateDirectPaymentAndFeeBillingV21791400000000();
    const source = migration.up.toString();

    expect(source).toContain('PlatformFeeLedgerEntries');
    expect(source).toContain('DirectGoodsPayments');
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/DROP\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.PaymentTransactions/i);
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.Users/i);
  });
});
