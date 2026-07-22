import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Contract } from '../models/Contract.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { AppError } from '../middlewares/error.middleware';

const userRepo = () => AppDataSource.getRepository(User);
const contractRepo = () => AppDataSource.getRepository(Contract);
const paymentRepo = () => AppDataSource.getRepository(PaymentTransaction);

export interface AdminUserFilters {
  search?: string;
  role?: string;
  isActive?: string | boolean;
  page?: number;
  limit?: number;
}

export const getUsers = async (filters: AdminUserFilters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const qb = userRepo().createQueryBuilder('user')
    .select([
      'user.id',
      'user.email',
      'user.role',
      'user.firstName',
      'user.lastName',
      'user.fullName',
      'user.phone',
      'user.province',
      'user.district',
      'user.ward',
      'user.address',
      'user.avatar',
      'user.isActive',
      'user.isVerified',
      'user.virtualBalance',
      'user.reputationScore',
      'user.createdAt',
      'user.lastLogin',
    ]);

  if (filters.search) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere(
      '(user.FullName LIKE :search OR user.Email LIKE :search OR user.Phone LIKE :search)',
      { search }
    );
  }

  if (filters.role) {
    qb.andWhere('user.Role = :role', { role: filters.role });
  }

  if (filters.isActive !== undefined && filters.isActive !== '') {
    const isActive =
      filters.isActive === true || String(filters.isActive).toLowerCase() === 'true';
    qb.andWhere('user.IsActive = :isActive', { isActive });
  }

  qb.orderBy('user.CreatedAt', 'DESC');
  qb.skip((page - 1) * limit).take(limit);

  const [users, total] = await qb.getManyAndCount();

  return {
    users,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getUserDetail = async (userId: string) => {
  const user = await userRepo().findOne({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phone: true,
      avatar: true,
      province: true,
      district: true,
      ward: true,
      address: true,
      isActive: true,
      isVerified: true,
      virtualBalance: true,
      reputationScore: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404);
  }

  const contractCount = await contractRepo().count({
    where: [
      { farmerId: userId },
      { enterpriseId: userId },
    ],
  });

  const transactionCount = await paymentRepo().count({
    where: { userId },
  });

  return { user, contractCount, transactionCount };
};

export const toggleUserStatus = async (userId: string) => {
  const user = await userRepo().findOne({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404);
  }

  user.isActive = !user.isActive;
  await userRepo().save(user);

  return { user };
};

export const deleteUser = async (userId: string) => {
  const result = await userRepo().delete(userId);
  if (!result.affected) {
    throw new AppError('Không tìm thấy người dùng', 404);
  }
};
