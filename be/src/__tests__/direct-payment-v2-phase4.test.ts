import { getMetadataArgsStorage } from 'typeorm';
import { Contract } from '../models/Contract.entity';
import { Dispute } from '../models/Dispute.entity';
import { buildDirectPaymentPlan } from '../modules/direct-payment-v2/payment-plan';
import { getConfiguredContractPaymentFlow } from '../modules/direct-payment-v2/payment-flow.config';
import { ExtendDirectPaymentV2Phase41791430000000 } from '../migrations/ExtendDirectPaymentV2Phase4';

describe('Direct Payment V2 Phase 4', () => {
  const originalFlow = process.env.CONTRACT_PAYMENT_FLOW;

  afterEach(() => {
    if (originalFlow === undefined) {
      delete process.env.CONTRACT_PAYMENT_FLOW;
    } else {
      process.env.CONTRACT_PAYMENT_FLOW = originalFlow;
    }
  });

  test('new contracts default to Direct V2 but rollback mode remains explicit', () => {
    delete process.env.CONTRACT_PAYMENT_FLOW;
    expect(getConfiguredContractPaymentFlow()).toBe('direct_v2');

    process.env.CONTRACT_PAYMENT_FLOW = 'escrow_v1';
    expect(getConfiguredContractPaymentFlow()).toBe('escrow_v1');

    process.env.CONTRACT_PAYMENT_FLOW = 'invalid';
    expect(() => getConfiguredContractPaymentFlow()).toThrow();
  });

  test('custom 0% and 100% remain compatible as one-installment plans', () => {
    expect(buildDirectPaymentPlan({
      totalValue: 100_000_000,
      paymentTerms: 'custom',
      depositPercentage: 0,
    } as Contract)).toEqual([
      { sequence: 1, amount: 100_000_000, trigger: 'goods_accepted' },
    ]);

    expect(buildDirectPaymentPlan({
      totalValue: 100_000_000,
      paymentTerms: 'custom',
      depositPercentage: 100,
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

  test('Direct V2 disputes can exist without Escrow', () => {
    const escrowColumn = getMetadataArgsStorage().columns
      .find(
        (item) =>
          item.target === Dispute &&
          item.propertyName === 'escrowId'
      );

    expect(escrowColumn).toBeDefined();
    expect((escrowColumn!.options as any).nullable).toBe(true);
  });

  test('Phase 4 migration preserves legacy rows as escrow_v1 and is non-destructive', () => {
    const source = new ExtendDirectPaymentV2Phase41791430000000().up.toString();

    expect(source).toContain("DEFAULT 'escrow_v1'");
    expect(source).toContain("'direct_v2'");
    expect(source).toContain("ALTER COLUMN EscrowId UNIQUEIDENTIFIER NULL");
    expect(source).not.toMatch(/DROP\s+TABLE\s+dbo\.Escrows/i);
    expect(source).not.toMatch(/DROP\s+TABLE\s+dbo\.Contracts/i);
  });
});
