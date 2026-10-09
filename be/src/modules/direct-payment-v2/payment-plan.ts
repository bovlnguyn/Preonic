import { Contract } from '../../models/Contract.entity';
import { toWholeVnd, fromWholeVnd } from './fee-calculator';
import { GoodsPaymentTrigger } from './types';

export interface DirectPaymentInstallmentPlan {
  sequence: number;
  amount: number;
  trigger: GoodsPaymentTrigger;
}

const DENOMINATOR = 10_000n;

const roundByBps = (total: bigint, bps: number): bigint => {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error('Installment basis points must be an integer between 0 and 10000');
  }
  return (total * BigInt(bps) + DENOMINATOR / 2n) / DENOMINATOR;
};

const allocateByBps = (totalAmount: number, parts: number[]): number[] => {
  if (!parts.length || parts.some((part) => !Number.isInteger(part) || part <= 0)) {
    throw new Error('Installment percentages must be positive integer basis points');
  }
  if (parts.reduce((sum, part) => sum + part, 0) !== 10_000) {
    throw new Error('Installment percentages must total exactly 10000 basis points');
  }

  const total = toWholeVnd(totalAmount);
  if (total <= 0n) throw new Error('Contract total value must be greater than zero');

  let allocated = 0n;
  return parts.map((part, index) => {
    const amount = index === parts.length - 1
      ? total - allocated
      : roundByBps(total, part);
    allocated += amount;
    return fromWholeVnd(amount);
  });
};

const percentageToBps = (percentage: number): number => {
  if (!Number.isFinite(percentage)) {
    throw new Error('Custom deposit percentage is invalid');
  }
  const bps = Math.round(percentage * 100);
  if (bps < 0 || bps > 10_000) {
    throw new Error('Custom deposit percentage must be between 0 and 100');
  }
  return bps;
};

export const buildDirectPaymentPlan = (
  contract: Pick<Contract, 'totalValue' | 'paymentTerms' | 'depositPercentage'>
): DirectPaymentInstallmentPlan[] => {
  const total = fromWholeVnd(toWholeVnd(contract.totalValue));
  if (total <= 0) throw new Error('Contract total value must be greater than zero');

  if (contract.paymentTerms === '50_50') {
    const [first, second] = allocateByBps(total, [5_000, 5_000]);
    return [
      { sequence: 1, amount: first, trigger: 'contract_active' },
      { sequence: 2, amount: second, trigger: 'goods_accepted' },
    ];
  }

  if (contract.paymentTerms === '30_70') {
    const [first, second] = allocateByBps(total, [3_000, 7_000]);
    return [
      { sequence: 1, amount: first, trigger: 'contract_active' },
      { sequence: 2, amount: second, trigger: 'goods_accepted' },
    ];
  }

  if (contract.paymentTerms === '100_upfront') {
    return [{ sequence: 1, amount: total, trigger: 'contract_active' }];
  }

  if (contract.paymentTerms === '100_delivery') {
    return [{ sequence: 1, amount: total, trigger: 'goods_accepted' }];
  }

  if (contract.paymentTerms === 'custom') {
    const depositBps = percentageToBps(Number(contract.depositPercentage));

    if (depositBps === 0) {
      return [{ sequence: 1, amount: total, trigger: 'goods_accepted' }];
    }
    if (depositBps === 10_000) {
      return [{ sequence: 1, amount: total, trigger: 'contract_active' }];
    }

    const [first, second] = allocateByBps(total, [depositBps, 10_000 - depositBps]);
    return [
      { sequence: 1, amount: first, trigger: 'contract_active' },
      { sequence: 2, amount: second, trigger: 'goods_accepted' },
    ];
  }

  throw new Error(`Unsupported payment terms: ${String(contract.paymentTerms)}`);
};
