import {
  BASIS_POINTS_DENOMINATOR,
  DEFAULT_BUYER_FEE_BPS,
  DEFAULT_SELLER_FEE_BPS,
  FeeParty,
} from './types';

const MAX_SAFE_VND = BigInt(Number.MAX_SAFE_INTEGER);

const assertBps = (bps: number): void => {
  if (!Number.isInteger(bps) || bps < 0 || bps > BASIS_POINTS_DENOMINATOR) {
    throw new Error('Fee basis points must be an integer between 0 and 10000');
  }
};

export const toWholeVnd = (value: number | string | bigint): bigint => {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error('Money amount cannot be negative');
    return value;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error('Money amount must be a finite non-negative number');
  }

  if (!Number.isSafeInteger(Math.round(numeric))) {
    throw new Error('Money amount exceeds JavaScript safe integer range');
  }

  return BigInt(Math.round(numeric));
};

export const fromWholeVnd = (value: bigint): number => {
  if (value < 0n || value > MAX_SAFE_VND) {
    throw new Error('VND amount is outside the supported safe integer range');
  }
  return Number(value);
};

/**
 * Round-half-up to the nearest whole VND.
 * All fee math is performed with BigInt so 0.5%/0.3% never depends on
 * binary floating-point multiplication.
 */
export const calculateFeeVnd = (
  goodsAmount: number | string | bigint,
  feeBps: number
): number => {
  assertBps(feeBps);
  const amount = toWholeVnd(goodsAmount);
  const numerator = amount * BigInt(feeBps);
  const rounded = (numerator + BigInt(BASIS_POINTS_DENOMINATOR / 2))
    / BigInt(BASIS_POINTS_DENOMINATOR);
  return fromWholeVnd(rounded);
};

export const calculateTransactionFees = (
  goodsAmount: number | string | bigint,
  buyerFeeBps = DEFAULT_BUYER_FEE_BPS,
  sellerFeeBps = DEFAULT_SELLER_FEE_BPS
) => {
  const normalizedGoodsAmount = fromWholeVnd(toWholeVnd(goodsAmount));
  const buyerFeeAmount = calculateFeeVnd(normalizedGoodsAmount, buyerFeeBps);
  const sellerFeeAmount = calculateFeeVnd(normalizedGoodsAmount, sellerFeeBps);

  return {
    goodsAmount: normalizedGoodsAmount,
    buyerFeeBps,
    sellerFeeBps,
    buyerFeeAmount,
    sellerFeeAmount,
    totalPlatformFeeAmount: buyerFeeAmount + sellerFeeAmount,
  };
};

export const calculatePartyFee = (
  goodsAmount: number | string | bigint,
  party: FeeParty,
  buyerFeeBps = DEFAULT_BUYER_FEE_BPS,
  sellerFeeBps = DEFAULT_SELLER_FEE_BPS
): number => (
  party === 'buyer'
    ? calculateFeeVnd(goodsAmount, buyerFeeBps)
    : calculateFeeVnd(goodsAmount, sellerFeeBps)
);

export const buildOutstandingFeePreview = (
  postedOutstanding: number | string | bigint,
  currentTransactionFee: number | string | bigint
) => {
  const outstanding = toWholeVnd(postedOutstanding);
  const current = toWholeVnd(currentTransactionFee);
  const projected = outstanding + current;

  return {
    postedOutstanding: fromWholeVnd(outstanding),
    currentTransactionFee: fromWholeVnd(current),
    projectedOutstanding: fromWholeVnd(projected),
  };
};
