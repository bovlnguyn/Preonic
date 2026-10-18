import { getMetadataArgsStorage } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { Contract } from '../models/Contract.entity';
import { DirectGoodsPayment } from '../models/DirectGoodsPayment.entity';
import {
  hasGoodsLeftFarm,
  isDirectContractFulfilled,
} from '../utils/contract-completion.util';

describe('Direct payment core hardening', () => {
  test('fulfillment requires delivery and the whole contract value confirmed', () => {
    const base = {
      status: 'completed',
      deliveryStatus: 'delivered',
      totalValue: 10_000_000,
      paidAmount: 10_000_000,
      remainingAmount: 0,
    } as Contract;

    expect(isDirectContractFulfilled(base)).toBe(true);
    expect(isDirectContractFulfilled({ ...base, paidAmount: 9_000_000 })).toBe(false);
    expect(isDirectContractFulfilled({ ...base, deliveryStatus: 'shipping' })).toBe(false);
    expect(isDirectContractFulfilled({ ...base, status: 'active' })).toBe(false);
  });

  test('inventory is never restored by a normal cancellation after goods left the farm', () => {
    expect(hasGoodsLeftFarm('pending')).toBe(false);
    expect(hasGoodsLeftFarm('preparing')).toBe(false);
    expect(hasGoodsLeftFarm('shipping')).toBe(true);
    expect(hasGoodsLeftFarm('delivered')).toBe(true);
  });

  test('entities declare indexes used by payment and review queries', () => {
    const indexes = getMetadataArgsStorage().indices;
    const contractIndexes = indexes
      .filter((item) => item.target === Contract)
      .map((item) => item.name);
    const paymentIndexes = indexes
      .filter((item) => item.target === DirectGoodsPayment)
      .map((item) => item.name);

    expect(contractIndexes).toContain('IX_Contracts_Product_Enterprise_Status_Delivery');
    expect(paymentIndexes).toContain('IX_DirectGoodsPayments_Contract_Status');
  });

  test('fresh database bootstrap contains the payment hardening constraints', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../Preonic Database/01_Preonic_V2_CreateDatabase.sql'),
      'utf8'
    );

    expect(source).toContain("DEFAULT 'direct_v2'");
    expect(source).toContain('CK_DirectGoodsPayments_DifferentParties');
    expect(source).toContain('CK_DirectGoodsPayments_ConfirmedMetadata');
    expect(source).toContain('CK_PlatformFeePolicies_TotalFee');
    expect(source).toContain('CK_Contracts_DeliveryStatus_Direct');
    expect(source).toContain('IX_PlatformFeeLedgerEntries_User_Status_PostedAt');
    expect(source).not.toContain('CREATE TABLE Escrows');
    expect(source).not.toContain('CREATE TABLE PaymentTransactions');
  });
});
