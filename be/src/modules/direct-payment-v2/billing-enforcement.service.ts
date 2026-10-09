import { AppDataSource } from '../../config/database';
import { PlatformFeeAccount } from '../../models/PlatformFeeAccount.entity';
import { PlatformFeeStatement } from '../../models/PlatformFeeStatement.entity';
import { PlatformFeePayment } from '../../models/PlatformFeePayment.entity';
import { User } from '../../models/User.entity';
import { makeError } from '../../utils/error.util';
import { lockByIdOrFail, runLockedTransaction } from '../../utils/transaction-lock.util';
import { recalculateFeeAccountWithManager } from './fee-ledger.service';

const getGraceDays = (): number => {
  const value = Number(process.env.FEE_RESTRICTION_GRACE_DAYS || 3);
  if (!Number.isInteger(value) || value < 0 || value > 60) {
    throw makeError('FEE_RESTRICTION_GRACE_DAYS phải nằm trong khoảng 0-60', 500);
  }
  return value;
};


const getUninitializedPaymentTtlMinutes = (): number => {
  const value = Number(process.env.FEE_PAYMENT_UNINITIALIZED_TTL_MINUTES || 30);
  if (!Number.isInteger(value) || value < 5 || value > 1440) {
    throw makeError('FEE_PAYMENT_UNINITIALIZED_TTL_MINUTES phải nằm trong khoảng 5-1440', 500);
  }
  return value;
};

const expireStaleFeePayments = async (now: Date): Promise<number> => {
  const repo = AppDataSource.getRepository(PlatformFeePayment);

  const providerExpired = await repo
    .createQueryBuilder()
    .update(PlatformFeePayment)
    .set({ status: 'expired' })
    .where("Status IN ('pending','processing')")
    .andWhere('ExpiresAt IS NOT NULL AND ExpiresAt < :now', { now })
    .execute();

  const uninitializedCutoff = new Date(
    now.getTime() - getUninitializedPaymentTtlMinutes() * 60 * 1000
  );

  const localExpired = await repo
    .createQueryBuilder()
    .update(PlatformFeePayment)
    .set({ status: 'expired' })
    .where("Status = 'pending'")
    .andWhere('ProviderPaymentId IS NULL')
    .andWhere('CreatedAt < :cutoff', { cutoff: uninitializedCutoff })
    .execute();

  return Number(providerExpired.affected || 0) + Number(localExpired.affected || 0);
};

export const refreshFeeBillingEnforcement = async (now = new Date()) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const expiredFeePayments = await expireStaleFeePayments(now);

  // First convert due statements to overdue. This update is idempotent.
  await AppDataSource
    .getRepository(PlatformFeeStatement)
    .createQueryBuilder()
    .update(PlatformFeeStatement)
    .set({ status: 'overdue' })
    .where("Status IN ('open','partially_paid')")
    .andWhere('DueAt IS NOT NULL AND DueAt < :now', { now })
    .andWhere('AmountPaid < AmountDueSnapshot')
    .execute();

  const overdueUsers = await AppDataSource
    .getRepository(PlatformFeeStatement)
    .createQueryBuilder('statement')
    .select('DISTINCT statement.UserId', 'userId')
    .where("statement.Status = 'overdue'")
    .andWhere('statement.AmountPaid < statement.AmountDueSnapshot')
    .getRawMany<{ userId: string }>();

  const restrictedUsers = await AppDataSource
    .getRepository(PlatformFeeAccount)
    .createQueryBuilder('account')
    .select('account.UserId', 'userId')
    .where("account.Status = 'restricted'")
    .getRawMany<{ userId: string }>();

  const userIds = Array.from(new Set([
    ...overdueUsers.map((item) => item.userId),
    ...restrictedUsers.map((item) => item.userId),
  ])).sort();

  let restricted = 0;
  let unrestricted = 0;

  for (const userId of userIds) {
    await runLockedTransaction(async (manager) => {
      await lockByIdOrFail(
        manager,
        User,
        userId,
        () => makeError('Không tìm thấy người dùng khi cập nhật công nợ', 404)
      );

      const account = await recalculateFeeAccountWithManager(manager, userId);
      const beforeRestricted = Boolean(account.restrictedAt);

      const oldest = await manager
        .getRepository(PlatformFeeStatement)
        .createQueryBuilder('statement')
        .where('statement.UserId = :userId', { userId })
        .andWhere("statement.Status = 'overdue'")
        .andWhere('statement.AmountPaid < statement.AmountDueSnapshot')
        .andWhere('statement.DueAt IS NOT NULL')
        .orderBy('statement.DueAt', 'ASC')
        .setLock('pessimistic_write')
        .getOne();

      if (!oldest?.dueAt) {
        if (account.restrictedAt) {
          account.restrictedAt = null;
          account.status = account.overdueAmount > 0 ? 'overdue' : 'good_standing';
          await manager.getRepository(PlatformFeeAccount).save(account);
          unrestricted += 1;
        }
        return;
      }

      const restrictionAt = new Date(
        oldest.dueAt.getTime() + getGraceDays() * 24 * 60 * 60 * 1000
      );

      if (now >= restrictionAt && account.overdueAmount > 0) {
        account.status = 'restricted';
        account.restrictedAt = account.restrictedAt || now;
        await manager.getRepository(PlatformFeeAccount).save(account);
        if (!beforeRestricted) restricted += 1;
      }
    }, { label: 'paymentV2.billingEnforcement' });
  }

  return {
    processedUsers: userIds.length,
    restricted,
    unrestricted,
    expiredFeePayments,
  };
};
