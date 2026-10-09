export const DEFAULT_BUYER_FEE_BPS = 50;
export const DEFAULT_SELLER_FEE_BPS = 30;
export const BASIS_POINTS_DENOMINATOR = 10_000;

export type FeeParty = 'buyer' | 'seller';

export type DirectGoodsPaymentStatus =
  | 'planned'
  | 'payable'
  | 'awaiting_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'disputed';

export type GoodsPaymentConfirmationMethod =
  | 'farmer_manual'
  | 'provider_webhook'
  | 'admin_review';

export type FeeLedgerEntryType =
  | 'buyer_transaction_fee'
  | 'seller_transaction_fee'
  | 'payment'
  | 'discount'
  | 'waiver'
  | 'adjustment'
  | 'refund';

export type FeeLedgerDirection = 'debit' | 'credit';
export type FeeLedgerStatus = 'pending' | 'posted' | 'voided';

export type FeeAccountStatus =
  | 'good_standing'
  | 'due'
  | 'overdue'
  | 'restricted';

export type FeeStatementStatus =
  | 'draft'
  | 'open'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'voided';

export type FeePaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'amount_mismatch';

export type SettlementBankAccountStatus = 'active' | 'disabled';

export type GoodsPaymentTrigger =
  | 'contract_active'
  | 'goods_accepted'
  | 'manual';
