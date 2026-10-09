import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { PlatformFeeLedgerEntry } from '../../models/PlatformFeeLedgerEntry.entity';
import { PlatformFeePaymentApplication } from '../../models/PlatformFeePaymentApplication.entity';
import { PlatformFeeStatement } from '../../models/PlatformFeeStatement.entity';
import { User } from '../../models/User.entity';
import { lockByIdOrFail, lockOne, runLockedTransaction } from '../../utils/transaction-lock.util';
import { makeError } from '../../utils/error.util';
import {
  BillingMonthPeriod,
  formatBillingPeriodCode,
  getPreviousCompletedHoChiMinhMonth,
} from './billing-period';
import { recalculateFeeAccountWithManager } from './fee-ledger.service';

const money = (value: unknown): number => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) {
    throw makeError('Dữ liệu bảng kê phí không hợp lệ', 500);
  }
  return Math.round(parsed);
};

const getDueDays = (): number => {
  const value = Number(process.env.FEE_STATEMENT_DUE_DAYS || 7);
  if (!Number.isInteger(value) || value < 1 || value > 60) {
    throw makeError('FEE_STATEMENT_DUE_DAYS phải nằm trong khoảng 1-60', 500);
  }
  return value;
};

const addUtcDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const getOpeningBalanceWithManager = async (
  manager: EntityManager,
  userId: string,
  before: Date
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
    .andWhere('entry.PostedAt IS NOT NULL AND entry.PostedAt < :before', { before })
    .getRawOne<{ balance: string | number }>();

  return Math.max(0, money(raw?.balance));
};

const getAppliedAmountForEntriesWithManager = async (
  manager: EntityManager,
  ledgerEntryIds: string[]
): Promise<number> => {
  if (ledgerEntryIds.length === 0) return 0;

  const raw = await manager
    .getRepository(PlatformFeePaymentApplication)
    .createQueryBuilder('application')
    .select('COALESCE(SUM(application.Amount), 0)', 'amount')
    .where('application.FeeLedgerEntryId IN (:...ledgerEntryIds)', { ledgerEntryIds })
    .getRawOne<{ amount: string | number }>();

  return Math.max(0, money(raw?.amount));
};

const buildStatementCode = (
  userId: string,
  period: BillingMonthPeriod
): string => {
  const compactUser = userId.replace(/-/g, '').toUpperCase().slice(0, 16);
  return `PFS-${formatBillingPeriodCode(period)}-${compactUser}`;
};

export const generateFeeStatementForUser = async (
  userId: string,
  period: BillingMonthPeriod,
  issuedAt = new Date()
): Promise<PlatformFeeStatement | null> => runLockedTransaction(async (manager) => {
  await lockByIdOrFail(
    manager,
    User,
    userId,
    () => makeError('Không tìm thấy người dùng', 404)
  );

  const statementRepo = manager.getRepository(PlatformFeeStatement);
  const existing = await lockOne(manager, PlatformFeeStatement, {
    userId,
    periodStart: period.logicalStart,
    periodEnd: period.logicalEnd,
  });

  if (existing) return existing;

  const entries = await manager
    .getRepository(PlatformFeeLedgerEntry)
    .createQueryBuilder('entry')
    .where('entry.UserId = :userId', { userId })
    .andWhere("entry.Status = 'posted'")
    .andWhere("entry.Direction = 'debit'")
    .andWhere(
      "entry.EntryType IN ('buyer_transaction_fee','seller_transaction_fee','adjustment')"
    )
    .andWhere('entry.PostedAt IS NOT NULL')
    .andWhere('entry.PostedAt >= :start AND entry.PostedAt < :end', {
      start: period.queryStartUtc,
      end: period.queryEndExclusiveUtc,
    })
    .andWhere('entry.FeeStatementId IS NULL')
    .orderBy('entry.PostedAt', 'ASC')
    .addOrderBy('entry.CreatedAt', 'ASC')
    .addOrderBy('entry.FeeLedgerEntryId', 'ASC')
    .setLock('pessimistic_write')
    .getMany();

  if (entries.length === 0) return null;

  const charges = entries.reduce((sum, entry) => sum + money(entry.amount), 0);
  const appliedBeforeStatement = Math.min(
    charges,
    await getAppliedAmountForEntriesWithManager(
      manager,
      entries.map((entry) => entry.id)
    )
  );
  const openingBalance = await getOpeningBalanceWithManager(
    manager,
    userId,
    period.queryStartUtc
  );

  const remaining = Math.max(0, charges - appliedBeforeStatement);
  const status = remaining === 0 ? 'paid' : 'open';
  const dueAt = remaining === 0 ? null : addUtcDays(issuedAt, getDueDays());

  let statement = statementRepo.create({
    statementCode: buildStatementCode(userId, period),
    userId,
    periodStart: period.logicalStart,
    periodEnd: period.logicalEnd,
    openingBalanceSnapshot: openingBalance,
    currentPeriodCharges: charges,
    // Fee payments are tracked via AmountPaid / payment applications.
    // CurrentPeriodCredits is reserved for future waivers/discounts/refunds.
    currentPeriodCredits: 0,
    amountDueSnapshot: charges,
    amountPaid: appliedBeforeStatement,
    status,
    issuedAt,
    dueAt,
    paidAt: remaining === 0 ? issuedAt : null,
  });

  statement = await statementRepo.save(statement);

  const entryRepo = manager.getRepository(PlatformFeeLedgerEntry);
  for (const entry of entries) {
    entry.statementId = statement.id;
    await entryRepo.save(entry);
  }

  // Payments made before month-end already have applications to these fee entries.
  // Attach those applications to the newly-created statement for audit/reporting.
  await manager
    .getRepository(PlatformFeePaymentApplication)
    .createQueryBuilder()
    .update(PlatformFeePaymentApplication)
    .set({ feeStatementId: statement.id })
    .where('FeeStatementId IS NULL')
    .andWhere('FeeLedgerEntryId IN (:...ids)', { ids: entries.map((entry) => entry.id) })
    .execute();

  await recalculateFeeAccountWithManager(manager, userId);
  return statement;
}, { label: 'paymentV2.generateFeeStatementForUser' });

export const generateFeeStatementsForPeriod = async (
  period: BillingMonthPeriod,
  issuedAt = new Date()
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const rows = await AppDataSource
    .getRepository(PlatformFeeLedgerEntry)
    .createQueryBuilder('entry')
    .select('DISTINCT entry.UserId', 'userId')
    .where("entry.Status = 'posted'")
    .andWhere("entry.Direction = 'debit'")
    .andWhere(
      "entry.EntryType IN ('buyer_transaction_fee','seller_transaction_fee','adjustment')"
    )
    .andWhere('entry.PostedAt IS NOT NULL')
    .andWhere('entry.PostedAt >= :start AND entry.PostedAt < :end', {
      start: period.queryStartUtc,
      end: period.queryEndExclusiveUtc,
    })
    .getRawMany<{ userId: string }>();

  let created = 0;
  let existingOrEmpty = 0;

  for (const row of rows) {
    const existedBefore = await AppDataSource
      .getRepository(PlatformFeeStatement)
      .findOne({
        where: {
          userId: row.userId,
          periodStart: period.logicalStart,
          periodEnd: period.logicalEnd,
        },
      });

    const result = await generateFeeStatementForUser(row.userId, period, issuedAt);

    if (result && !existedBefore) created += 1;
    else existingOrEmpty += 1;
  }

  return { users: rows.length, created, existingOrEmpty };
};

export const generatePreviousMonthFeeStatements = async (now = new Date()) =>
  generateFeeStatementsForPeriod(getPreviousCompletedHoChiMinhMonth(now), now);

export const listFeeStatementsForUser = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, 100)
    : 20;

  const [items, total] = await AppDataSource.getRepository(PlatformFeeStatement).findAndCount({
    where: { userId },
    order: { periodStart: 'DESC', createdAt: 'DESC' },
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  });

  return {
    statements: items.map((item) => ({
      id: item.id,
      statementCode: item.statementCode,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      openingBalanceSnapshot: money(item.openingBalanceSnapshot),
      currentPeriodCharges: money(item.currentPeriodCharges),
      currentPeriodCredits: money(item.currentPeriodCredits),
      amountDueSnapshot: money(item.amountDueSnapshot),
      amountPaid: money(item.amountPaid),
      remainingAmount: Math.max(0, money(item.amountDueSnapshot) - money(item.amountPaid)),
      status: item.status,
      issuedAt: item.issuedAt,
      dueAt: item.dueAt,
      paidAt: item.paidAt,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};
