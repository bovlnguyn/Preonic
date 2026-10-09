import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { PlatformFeePolicy } from '../../models/PlatformFeePolicy.entity';
import { makeError } from '../../utils/error.util';

const getManager = (manager?: EntityManager): EntityManager => {
  if (manager) return manager;
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }
  return AppDataSource.manager;
};

export const resolveActiveFeePolicy = async (
  at = new Date(),
  manager?: EntityManager
): Promise<PlatformFeePolicy> => {
  const db = getManager(manager);

  const rows = await db
    .getRepository(PlatformFeePolicy)
    .createQueryBuilder('policy')
    .where('policy.IsActive = :active', { active: true })
    .andWhere('policy.EffectiveFrom <= :at', { at })
    .andWhere('(policy.EffectiveTo IS NULL OR policy.EffectiveTo > :at)', { at })
    .orderBy('policy.EffectiveFrom', 'DESC')
    .addOrderBy('policy.CreatedAt', 'DESC')
    .getMany();

  if (rows.length === 0) {
    throw makeError('Không tìm thấy chính sách phí đang có hiệu lực', 503);
  }

  if (rows.length > 1) {
    throw makeError(
      'Có nhiều chính sách phí cùng hiệu lực. Cần xử lý cấu hình trước khi tạo giao dịch.',
      500
    );
  }

  const policy = rows[0];

  if (
    !Number.isInteger(policy.buyerFeeBps) ||
    !Number.isInteger(policy.sellerFeeBps) ||
    policy.buyerFeeBps < 0 ||
    policy.sellerFeeBps < 0 ||
    policy.buyerFeeBps + policy.sellerFeeBps >= 10_000
  ) {
    throw makeError('Chính sách phí có cấu hình không hợp lệ', 500);
  }

  if (String(policy.currency).toUpperCase() !== 'VND') {
    throw makeError('Payment V2 hiện chỉ hỗ trợ VND', 500);
  }

  return policy;
};
