import { buildDirectPaymentPlan } from '../modules/direct-payment-v2/payment-plan';
import { calculateTransactionFees } from '../modules/direct-payment-v2/fee-calculator';
import { ContractFeeTerms } from '../models/ContractFeeTerms.entity';
import { DirectGoodsPayment } from '../models/DirectGoodsPayment.entity';
import { PlatformFeeLedgerEntry } from '../models/PlatformFeeLedgerEntry.entity';
import { getMetadataArgsStorage } from 'typeorm';
import { ExtendDirectPaymentV2Phase21791410000000 } from '../migrations/ExtendDirectPaymentV2Phase2';

const contract = (
  totalValue: number,
  paymentTerms: '50_50' | '30_70' | '100_delivery' | '100_upfront' | 'custom',
  depositPercentage: number | null = null
) => ({
  totalValue,
  paymentTerms,
  depositPercentage,
});

describe('Direct Payment V2 Phase 2', () => {
  test('30/70 plan sums exactly to contract amount and uses correct triggers', () => {
    const plan = buildDirectPaymentPlan(contract(100_000_001, '30_70') as any);
    expect(plan).toEqual([
      { sequence: 1, amount: 30_000_000, trigger: 'contract_active' },
      { sequence: 2, amount: 70_000_001, trigger: 'goods_accepted' },
    ]);
    expect(plan.reduce((sum, item) => sum + item.amount, 0)).toBe(100_000_001);
  });

  test('50/50 odd VND never loses one dong', () => {
    const plan = buildDirectPaymentPlan(contract(101, '50_50') as any);
    expect(plan[0].amount + plan[1].amount).toBe(101);
  });

test('custom plan preserves total and supports 0%, 20%, 100%', () => {
  const normalPlan = buildDirectPaymentPlan(
    contract(100_000_000, 'custom', 20) as any
  );

  expect(normalPlan).toEqual([
    {
      sequence: 1,
      amount: 20_000_000,
      trigger: 'contract_active',
    },
    {
      sequence: 2,
      amount: 80_000_000,
      trigger: 'goods_accepted',
    },
  ]);

  const zeroDepositPlan = buildDirectPaymentPlan(
    contract(100_000_000, 'custom', 0) as any
  );

  expect(zeroDepositPlan).toEqual([
    {
      sequence: 1,
      amount: 100_000_000,
      trigger: 'goods_accepted',
    },
  ]);

  const fullUpfrontPlan = buildDirectPaymentPlan(
    contract(100_000_000, 'custom', 100) as any
  );

  expect(fullUpfrontPlan).toEqual([
    {
      sequence: 1,
      amount: 100_000_000,
      trigger: 'contract_active',
    },
  ]);
});

  test('fee remains 0.5% buyer + 0.3% seller for each installment amount', () => {
    const fees = calculateTransactionFees(30_000_000);
    expect(fees.buyerFeeAmount).toBe(150_000);
    expect(fees.sellerFeeAmount).toBe(90_000);
    expect(fees.totalPlatformFeeAmount).toBe(240_000);
  });

  test('contract fee terms and payment trigger are present in TypeORM metadata', () => {
    const tables = getMetadataArgsStorage().tables.map((item) => item.target);
    expect(tables).toContain(ContractFeeTerms);

    const paymentColumns = getMetadataArgsStorage().columns
      .filter((item) => item.target === DirectGoodsPayment)
      .map((item) => item.propertyName);
    expect(paymentColumns).toContain('trigger');

    const ledgerIndexes = getMetadataArgsStorage().indices
      .filter((item) => item.target === PlatformFeeLedgerEntry)
      .map((item) => item.name);
    expect(ledgerIndexes).toContain('IX_PlatformFeeLedgerEntries_GoodsPayment');
  });

  test('Phase 2 migration is additive and does not touch legacy escrow/wallet', () => {
    const source = new ExtendDirectPaymentV2Phase21791410000000().up.toString();
    expect(source).toContain('ContractFeeTerms');
    expect(source).toContain('DirectGoodsPayments');
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/DROP\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.PaymentTransactions/i);
    expect(source).not.toMatch(/ALTER\s+TABLE\s+dbo\.Users/i);
  });
});
