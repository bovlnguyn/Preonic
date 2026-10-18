import { getMetadataArgsStorage } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { Contract } from '../models/Contract.entity';
import { Dispute } from '../models/Dispute.entity';
import { buildDirectPaymentPlan } from '../modules/direct-payment-v2/payment-plan';
import { getConfiguredContractPaymentFlow } from '../modules/direct-payment-v2/payment-flow.config';

describe('Direct Payment V2 Phase 4', () => {
  const originalFlow = process.env.CONTRACT_PAYMENT_FLOW;

  afterEach(() => {
    if (originalFlow === undefined) {
      delete process.env.CONTRACT_PAYMENT_FLOW;
    } else {
      process.env.CONTRACT_PAYMENT_FLOW = originalFlow;
    }
  });

  test('new contracts always use Direct V2 and env cannot re-enable Escrow', () => {
    delete process.env.CONTRACT_PAYMENT_FLOW;
    expect(getConfiguredContractPaymentFlow()).toBe('direct_v2');

    process.env.CONTRACT_PAYMENT_FLOW = 'escrow_v1';
    expect(getConfiguredContractPaymentFlow()).toBe('direct_v2');
  });

  test('custom 0% and 100% remain compatible as one-installment plans', () => {
    expect(buildDirectPaymentPlan({
      totalValue: 100_000_000,
      paymentTerms: 'custom',
      firstPaymentPercentage: 0,
    } as Contract)).toEqual([
      { sequence: 1, amount: 100_000_000, trigger: 'goods_accepted' },
    ]);

    expect(buildDirectPaymentPlan({
      totalValue: 100_000_000,
      paymentTerms: 'custom',
      firstPaymentPercentage: 100,
    } as Contract)).toEqual([
      { sequence: 1, amount: 100_000_000, trigger: 'contract_active' },
    ]);
  });

  test('Contract metadata carries payment-flow discriminator', () => {
    const columns = getMetadataArgsStorage().columns
      .filter((item) => item.target === Contract)
      .map((item) => item.propertyName);
    expect(columns).toContain('paymentFlow');
  });

  test('Disputes no longer carry legacy escrow references', () => {
    const columns = getMetadataArgsStorage().columns
      .filter((item) => item.target === Dispute)
      .map((item) => item.propertyName);
    expect(columns).not.toContain('escrowId');
    expect(columns).not.toContain('milestoneStep');
  });

  test('fresh schema is direct-only and contains no legacy finance tables', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../Preonic Database/01_Preonic_V2_CreateDatabase.sql'),
      'utf8'
    );
    expect(source).toContain("CHECK (PaymentFlow = 'direct_v2')");
    expect(source).toContain('CREATE TABLE dbo.DirectGoodsPayments');
    expect(source).not.toContain('CREATE TABLE dbo.Escrows');
    expect(source).not.toContain('CREATE TABLE dbo.PaymentTransactions');
  });
});
