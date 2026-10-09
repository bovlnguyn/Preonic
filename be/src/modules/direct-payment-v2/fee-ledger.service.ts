import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { PlatformFeeAccount } from '../../models/PlatformFeeAccount.entity';
import { PlatformFeeLedgerEntry } from '../../models/PlatformFeeLedgerEntry.entity';
import { ContractFeeTerms } from '../../models/ContractFeeTerms.entity';
import { PlatformFeeStatement } from '../../models/PlatformFeeStatement.entity';
import { User } from '../../models/User.entity';
import { lockByIdOrFail, lockManyByIds, lockOne } from '../../utils/transaction-lock.util';
import { makeError } from '../../utils/error.util';
import { calculateFeeVnd, buildOutstandingFeePreview } from './fee-calculator';

const asMoney = (value: unknown): number => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) throw makeError('Dữ liệu công nợ không hợp lệ', 500);
  return Math.max(0, Math.round(number));
};

export const ensureFeeAccountWithManager = async (
  manager: EntityManager,
  userId: string
): Promise<PlatformFeeAccount> => {
  let account = await lockOne(manager, PlatformFeeAccount, { userId });

  if (!account) {
    account = manager.getRepository(PlatformFeeAccount).create({
      userId,
      outstandingAmount: 0,
      overdueAmount: 0,
      status: 'good_standing',
      restrictedAt: null,
      lastCalculatedAt: new Date(),
    });
    account = await manager.getRepository(PlatformFeeAccount).save(account);
  }

  return account;
};

const getPostedLedgerBalanceWithManager = async (
  manager: EntityManager,
  userId: string
): Promise<number> => {
  const raw = await manager
    .getRepository(PlatformFeeLedgerEntry)
    .createQueryBuilder('entry')
    .select(`
      COALESCE(SUM(
        CASE
          WHEN entry.Direction = 'debit' THEN entry.Amount
          WHEN entry.Direction = 'credit' THEN -entry.Amount
          ELSE 0
        END
      ), 0)
    `, 'balance')
    .where('entry.UserId = :userId', { userId })
    .andWhere("entry.Status = 'posted'")
    .getRawOne<{ balance: string | number }>();

  return asMoney(raw?.balance);
};

const getStatementAmountsWithManager = async (
  manager: EntityManager,
  userId: string
): Promise<{ due: number; overdue: number }> => {
  const raw = await manager
    .getRepository(PlatformFeeStatement)
    .createQueryBuilder('statement')
    .select(`
      COALESCE(SUM(
        CASE
          WHEN statement.Status IN ('open','partially_paid')
          THEN CASE
            WHEN statement.AmountDueSnapshot > statement.AmountPaid
            THEN statement.AmountDueSnapshot - statement.AmountPaid
            ELSE 0
          END
          ELSE 0
        END
      ), 0)
    `, 'due')
    .addSelect(`
      COALESCE(SUM(
        CASE
          WHEN statement.Status = 'overdue'
          THEN CASE
            WHEN statement.AmountDueSnapshot > statement.AmountPaid
            THEN statement.AmountDueSnapshot - statement.AmountPaid
            ELSE 0
          END
          ELSE 0
        END
      ), 0)
    `, 'overdue')
    .where('statement.UserId = :userId', { userId })
    .getRawOne<{ due: string | number; overdue: string | number }>();

  return {
    due: asMoney(raw?.due),
    overdue: asMoney(raw?.overdue),
  };
};

/**
 * Caller must hold the Users row lock for userId before invoking this helper.
 * That makes creation/update of the one-to-one fee account deterministic.
 */
export const recalculateFeeAccountWithManager = async (
  manager: EntityManager,
  userId: string
): Promise<PlatformFeeAccount> => {
  const account = await ensureFeeAccountWithManager(manager, userId);
  // Keep queries sequential on the same transaction/query runner.
  const outstandingAmount = await getPostedLedgerBalanceWithManager(manager, userId);
  const statementAmounts = await getStatementAmountsWithManager(manager, userId);

  account.outstandingAmount = outstandingAmount;
  account.overdueAmount = statementAmounts.overdue;
  account.lastCalculatedAt = new Date();

  if (account.restrictedAt && statementAmounts.overdue > 0) {
    account.status = 'restricted';
  } else if (statementAmounts.overdue > 0) {
    account.status = 'overdue';
    account.restrictedAt = null;
  } else if (statementAmounts.due > 0) {
    account.status = 'due';
    account.restrictedAt = null;
  } else {
    account.status = 'good_standing';
    account.restrictedAt = null;
  }

  return manager.getRepository(PlatformFeeAccount).save(account);
};

const createPendingEntryIfNeeded = async (
  manager: EntityManager,
  params: {
    userId: string;
    contractId: string;
    goodsPaymentId: string;
    feePolicyId: string;
    entryType: 'buyer_transaction_fee' | 'seller_transaction_fee';
    amount: number;
    feeRateBps: number;
    idempotencyKey: string;
    description: string;
  }
): Promise<PlatformFeeLedgerEntry | null> => {
  if (params.amount <= 0) return null;

  const repo = manager.getRepository(PlatformFeeLedgerEntry);
  const existing = await repo.findOne({
    where: { idempotencyKey: params.idempotencyKey },
  });

  if (existing) {
    const sameBusinessMeaning =
      existing.userId === params.userId &&
      existing.contractId === params.contractId &&
      existing.goodsPaymentId === params.goodsPaymentId &&
      existing.feePolicyId === params.feePolicyId &&
      existing.entryType === params.entryType &&
      existing.direction === 'debit' &&
      Math.round(Number(existing.amount)) === Math.round(params.amount) &&
      existing.feeRateBps === params.feeRateBps;

    if (!sameBusinessMeaning) {
      throw makeError('Idempotency key của phí đã được dùng cho dữ liệu khác', 409);
    }
    return existing;
  }

  return repo.save(repo.create({
    userId: params.userId,
    contractId: params.contractId,
    goodsPaymentId: params.goodsPaymentId,
    feePolicyId: params.feePolicyId,
    statementId: null,
    entryType: params.entryType,
    direction: 'debit',
    amount: params.amount,
    feeRateBps: params.feeRateBps,
    status: 'pending',
    idempotencyKey: params.idempotencyKey,
    description: params.description,
    postedAt: null,
    voidedAt: null,
  }));
};

export const createPendingTransactionFeesWithManager = async (
  manager: EntityManager,
  payment: DirectGoodsPayment,
  terms: ContractFeeTerms
): Promise<PlatformFeeLedgerEntry[]> => {
  const buyerFeeAmount = calculateFeeVnd(payment.amount, terms.buyerFeeBps);
  const sellerFeeAmount = calculateFeeVnd(payment.amount, terms.sellerFeeBps);

  // Keep writes sequential on the same SQL transaction/query runner.
  const buyerEntry = await createPendingEntryIfNeeded(manager, {
    userId: payment.payerUserId,
    contractId: payment.contractId,
    goodsPaymentId: payment.id,
    feePolicyId: terms.feePolicyId,
    entryType: 'buyer_transaction_fee',
    amount: buyerFeeAmount,
    feeRateBps: terms.buyerFeeBps,
    idempotencyKey: `direct-fee:buyer:${payment.contractId}:${payment.installmentSequence}`,
    description: `Phí giao dịch doanh nghiệp - đợt ${payment.installmentSequence}`,
  });

  const sellerEntry = await createPendingEntryIfNeeded(manager, {
    userId: payment.payeeUserId,
    contractId: payment.contractId,
    goodsPaymentId: payment.id,
    feePolicyId: terms.feePolicyId,
    entryType: 'seller_transaction_fee',
    amount: sellerFeeAmount,
    feeRateBps: terms.sellerFeeBps,
    idempotencyKey: `direct-fee:seller:${payment.contractId}:${payment.installmentSequence}`,
    description: `Phí giao dịch nông dân - đợt ${payment.installmentSequence}`,
  });

  return [buyerEntry, sellerEntry]
    .filter((entry): entry is PlatformFeeLedgerEntry => Boolean(entry));
};

const lockFeeEntriesForPayment = async (
  manager: EntityManager,
  goodsPaymentId: string
): Promise<PlatformFeeLedgerEntry[]> => (
  manager
    .getRepository(PlatformFeeLedgerEntry)
    .createQueryBuilder('entry')
    .where('entry.GoodsPaymentId = :goodsPaymentId', { goodsPaymentId })
    .setLock('pessimistic_write')
    .getMany()
);

export const postPendingFeesForPaymentWithManager = async (
  manager: EntityManager,
  payment: DirectGoodsPayment,
  postedAt = new Date()
): Promise<PlatformFeeLedgerEntry[]> => {
  if (payment.status !== 'confirmed') {
    throw makeError('Chỉ được ghi nhận phí sau khi thanh toán tiền hàng đã được xác nhận', 409);
  }

  const entries = await lockFeeEntriesForPayment(manager, payment.id);
  const relevant = entries.filter((entry) =>
    entry.entryType === 'buyer_transaction_fee' ||
    entry.entryType === 'seller_transaction_fee'
  );

  const userIds = Array.from(new Set(relevant.map((entry) => entry.userId)));
  await lockManyByIds(manager, User, userIds);

  for (const entry of relevant) {
    if (entry.status === 'pending') {
      entry.status = 'posted';
      entry.postedAt = postedAt;
      entry.voidedAt = null;
      await manager.getRepository(PlatformFeeLedgerEntry).save(entry);
    }
  }

  for (const userId of userIds.sort()) {
    await recalculateFeeAccountWithManager(manager, userId);
  }

  return relevant;
};

export const voidPendingFeesForPaymentWithManager = async (
  manager: EntityManager,
  payment: DirectGoodsPayment,
  voidedAt = new Date()
): Promise<PlatformFeeLedgerEntry[]> => {
  if (payment.status === 'confirmed') {
    throw makeError('Không thể hủy phí của giao dịch tiền hàng đã được xác nhận', 409);
  }

  const entries = await lockFeeEntriesForPayment(manager, payment.id);
  const relevant = entries.filter((entry) =>
    entry.entryType === 'buyer_transaction_fee' ||
    entry.entryType === 'seller_transaction_fee'
  );

  for (const entry of relevant) {
    if (entry.status === 'pending') {
      entry.status = 'voided';
      entry.voidedAt = voidedAt;
      await manager.getRepository(PlatformFeeLedgerEntry).save(entry);
    }
  }

  return relevant;
};

export const getFeePreview = async (
  userId: string,
  goodsPaymentId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const manager = AppDataSource.manager;
  const payment = await manager.getRepository(DirectGoodsPayment).findOne({
    where: { id: goodsPaymentId },
  });
  if (!payment) throw makeError('Không tìm thấy giao dịch tiền hàng', 404);

  if (userId !== payment.payerUserId && userId !== payment.payeeUserId) {
    throw makeError('Bạn không có quyền xem phí của giao dịch này', 403);
  }

  const postedOutstanding = await getPostedLedgerBalanceWithManager(manager, userId);
  const pending = await manager
    .getRepository(PlatformFeeLedgerEntry)
    .createQueryBuilder('entry')
    .select('COALESCE(SUM(entry.Amount), 0)', 'amount')
    .where('entry.UserId = :userId', { userId })
    .andWhere('entry.GoodsPaymentId = :goodsPaymentId', { goodsPaymentId })
    .andWhere("entry.Status = 'pending'")
    .andWhere("entry.Direction = 'debit'")
    .getRawOne<{ amount: string | number }>();

  return buildOutstandingFeePreview(postedOutstanding, asMoney(pending?.amount));
};

export const getFeeAccountSummary = async (userId: string) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const account = await AppDataSource.getRepository(PlatformFeeAccount).findOne({
    where: { userId },
  });

  if (!account) {
    return {
      outstandingAmount: 0,
      overdueAmount: 0,
      status: 'good_standing' as const,
      restrictedAt: null,
    };
  }

  return {
    outstandingAmount: asMoney(account.outstandingAmount),
    overdueAmount: asMoney(account.overdueAmount),
    status: account.status,
    restrictedAt: account.restrictedAt,
  };
};

export const assertUserCanStartNewCommercialTransaction = async (
  userId: string
): Promise<void> => {
  const summary = await getFeeAccountSummary(userId);
  if (summary.status === 'restricted') {
    throw makeError(
      'Tài khoản đang bị giới hạn do phí dịch vụ quá hạn. Vui lòng thanh toán phí để tạo giao dịch mới.',
      403
    );
  }
};

export const recalculateFeeAccount = async (userId: string) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  return AppDataSource.transaction('READ COMMITTED', async (manager) => {
    await lockByIdOrFail(
      manager,
      User,
      userId,
      () => makeError('Không tìm thấy người dùng', 404)
    );
    return recalculateFeeAccountWithManager(manager, userId);
  });
};
