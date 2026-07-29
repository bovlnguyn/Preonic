import { Between } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Contract } from '../models/Contract.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { Dispute } from '../models/Dispute.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';
import { Notification } from '../models/Notification.entity';
import { AppError } from '../middlewares/error.middleware';

const userRepo = () => AppDataSource.getRepository(User);
const contractRepo = () => AppDataSource.getRepository(Contract);
const paymentRepo = () => AppDataSource.getRepository(PaymentTransaction);
const disputeRepo = () => AppDataSource.getRepository(Dispute);
const escrowRepo = () => AppDataSource.getRepository(Escrow);
const escrowTransactionRepo = () => AppDataSource.getRepository(EscrowTransaction);

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

// ════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════
export const getDashboardStats = async () => {
  const [totalUsers, totalFarmers, totalEnterprises] = await Promise.all([
    userRepo().count(),
    userRepo().count({ where: { role: 'farmer' } }),
    userRepo().count({ where: { role: 'enterprise' } }),
  ]);

  const [totalContracts, activeContracts, completedContracts, cancelledContracts] = await Promise.all([
    contractRepo().count(),
    contractRepo().count({ where: { status: 'active' } }),
    contractRepo().count({ where: { status: 'completed' } }),
    contractRepo().count({ where: { status: 'cancelled' } }),
  ]);

  const [openDisputes, underReviewDisputes] = await Promise.all([
    disputeRepo().count({ where: { status: 'open' } }),
    disputeRepo().count({ where: { status: 'under_review' } }),
  ]);

  const [totalPaymentTransactions, totalEscrowTransactions] = await Promise.all([
    paymentRepo().count(),
    escrowTransactionRepo().count(),
  ]);

  const topupAgg = await paymentRepo()
    .createQueryBuilder('payment')
    .select('SUM(payment.Amount)', 'sum')
    .where('payment.Type = :type', { type: 'topup' })
    .andWhere('payment.Status = :status', { status: 'completed' })
    .getRawOne();

  const now = new Date();
  const monthlyUserData: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = await userRepo().count({ where: { createdAt: Between(start, end) } });
    monthlyUserData.push({ month: `T${start.getMonth() + 1}`, count });
  }

  const recentUsers = await userRepo().find({
    select: { id: true, fullName: true, email: true, role: true },
    order: { createdAt: 'DESC' },
    take: 5,
  });

  const recentContracts = await contractRepo().find({
    order: { createdAt: 'DESC' },
    take: 5,
  });

  return {
    stats: {
      totalUsers,
      totalFarmers,
      totalEnterprises,
      totalContracts,
      activeContracts,
      completedContracts,
      cancelledContracts,
      openDisputes: openDisputes + underReviewDisputes,
      totalTransactions: totalPaymentTransactions + totalEscrowTransactions,
      totalTopupRevenue: Number(topupAgg?.sum || 0),
    },
    monthlyUserData,
    recentUsers,
    recentContracts,
  };
};

// ════════════════════════════════════════
// Contracts
// ════════════════════════════════════════
export interface AdminContractFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const getContracts = async (filters: AdminContractFilters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;

  const qb = contractRepo().createQueryBuilder('contract');

  if (filters.search) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere(
      '(contract.ContractCode LIKE :search OR contract.FarmerName LIKE :search OR contract.EnterpriseName LIKE :search)',
      { search }
    );
  }

  if (filters.status) {
    qb.andWhere('contract.Status = :status', { status: filters.status });
  }

  qb.orderBy('contract.CreatedAt', 'DESC');
  qb.skip((page - 1) * limit).take(limit);

  const [contracts, total] = await qb.getManyAndCount();

  return {
    contracts,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getContractDetail = async (contractId: string) => {
  const contract = await contractRepo().findOne({ where: { id: contractId } });
  if (!contract) {
    throw new AppError('Không tìm thấy hợp đồng', 404);
  }

  const dispute = await disputeRepo().findOne({
    where: { contractId },
    order: { createdAt: 'DESC' },
  });

  return { contract, dispute };
};

// ════════════════════════════════════════
// Disputes
// ════════════════════════════════════════
export interface AdminDisputeFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export const getDisputes = async (filters: AdminDisputeFilters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;

  const qb = disputeRepo()
    .createQueryBuilder('dispute')
    .leftJoinAndSelect('dispute.contract', 'contract')
    .leftJoinAndSelect('dispute.raisedByUser', 'raisedByUser')
    .leftJoinAndSelect('dispute.againstUser', 'againstUser');

  if (filters.status) {
    qb.andWhere('dispute.Status = :status', { status: filters.status });
  }

  qb.orderBy('dispute.CreatedAt', 'DESC');
  qb.skip((page - 1) * limit).take(limit);

  const [disputes, total] = await qb.getManyAndCount();

  return {
    disputes,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getDisputeDetail = async (id: string) => {
  const dispute = await disputeRepo().findOne({
    where: { id },
    relations: ['contract', 'raisedByUser', 'againstUser', 'evidences'],
  });

  if (!dispute) {
    throw new AppError('Không tìm thấy khiếu nại', 404);
  }

  return dispute;
};

const RESOLVABLE_DISPUTE_STATUSES = ['open', 'under_review'];

export const resolveDispute = async (
  disputeId: string,
  resolution: string,
  adminNotes?: string
) => {
  if (resolution !== 'farmer' && resolution !== 'enterprise') {
    throw new AppError('Phán quyết không hợp lệ', 400);
  }

  const dispute = await disputeRepo().findOne({ where: { id: disputeId } });
  if (!dispute) {
    throw new AppError('Không tìm thấy khiếu nại', 404);
  }
  if (!RESOLVABLE_DISPUTE_STATUSES.includes(dispute.status)) {
    throw new AppError('Khiếu nại này đã được giải quyết trước đó', 400);
  }

  const escrow = await escrowRepo().findOne({ where: { id: dispute.escrowId } });
  if (!escrow) {
    throw new AppError('Không tìm thấy ký quỹ liên quan', 404);
  }

  const contract = await contractRepo().findOne({ where: { id: dispute.contractId } });
  if (!contract) {
    throw new AppError('Không tìm thấy hợp đồng', 404);
  }

  const remaining =
    Number(escrow.depositedAmount) - Number(escrow.releasedAmount) - Number(escrow.refundedAmount || 0);

  await AppDataSource.transaction(async (manager) => {
    const txUserRepo = manager.getRepository(User);
    const txEscrowRepo = manager.getRepository(Escrow);
    const txContractRepo = manager.getRepository(Contract);
    const txMilestoneRepo = manager.getRepository(EscrowMilestone);
    const txTransactionRepo = manager.getRepository(EscrowTransaction);
    const txDisputeRepo = manager.getRepository(Dispute);
    const txNotificationRepo = manager.getRepository(Notification);

    const now = new Date();

    if (resolution === 'farmer') {
      if (remaining > 0) {
        const farmer = await txUserRepo.findOne({ where: { id: escrow.farmerId } });
        if (!farmer) throw new AppError('Không tìm thấy nông dân', 404);
        farmer.virtualBalance = Number(farmer.virtualBalance) + remaining;
        await txUserRepo.save(farmer);

        escrow.releasedAmount = Number(escrow.releasedAmount) + remaining;

        await txTransactionRepo.save(
          txTransactionRepo.create({
            escrowId: escrow.id,
            type: 'release',
            amount: remaining,
            fromUserId: escrow.enterpriseId,
            toUserId: escrow.farmerId,
            milestoneStep: dispute.milestoneStep ?? undefined,
            description: `Giải quyết khiếu nại: giải ngân số dư còn lại cho nông dân (hợp đồng ${contract.contractCode})`,
          })
        );
      }
      escrow.status = 'completed';
      contract.status = 'completed';
      contract.completedAt = now;
    } else {
      if (remaining > 0) {
        const enterprise = await txUserRepo.findOne({ where: { id: escrow.enterpriseId } });
        if (!enterprise) throw new AppError('Không tìm thấy doanh nghiệp', 404);
        enterprise.virtualBalance = Number(enterprise.virtualBalance) + remaining;
        await txUserRepo.save(enterprise);

        escrow.refundedAmount = Number(escrow.refundedAmount || 0) + remaining;

        await txTransactionRepo.save(
          txTransactionRepo.create({
            escrowId: escrow.id,
            type: 'refund',
            amount: remaining,
            fromUserId: escrow.farmerId,
            toUserId: escrow.enterpriseId,
            milestoneStep: dispute.milestoneStep ?? undefined,
            description: `Giải quyết khiếu nại: hoàn tiền số dư còn lại cho doanh nghiệp (hợp đồng ${contract.contractCode})`,
          })
        );
      }
      escrow.status = 'refunded';
      contract.status = 'cancelled';
      contract.cancelledAt = now;
      contract.cancelReason = adminNotes?.trim() || 'Giải quyết khiếu nại: hoàn tiền cho doanh nghiệp';
    }

    contract.paidAmount = Number(escrow.releasedAmount);
    contract.remainingAmount = 0;
    await txContractRepo.save(contract);
    await txEscrowRepo.save(escrow);

    if (dispute.milestoneStep) {
      const milestone = await txMilestoneRepo.findOne({
        where: { escrowId: escrow.id, step: dispute.milestoneStep },
      });
      if (milestone && milestone.status === 'disputed') {
        milestone.status = 'completed';
        milestone.completedAt = now;
        await txMilestoneRepo.save(milestone);
      }
    }

    dispute.status = resolution === 'farmer' ? 'resolved_farmer' : 'resolved_enterprise';
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes?.trim() || dispute.adminNotes;
    dispute.resolvedAt = now;
    await txDisputeRepo.save(dispute);

    const message =
      resolution === 'farmer'
        ? `Tranh chấp hợp đồng ${contract.contractCode} đã được giải quyết: giải ngân số dư còn lại cho nông dân.`
        : `Tranh chấp hợp đồng ${contract.contractCode} đã được giải quyết: hoàn tiền số dư còn lại cho doanh nghiệp.`;

    await txNotificationRepo.save([
      txNotificationRepo.create({
        userId: dispute.raisedBy,
        type: 'dispute_resolved',
        title: 'Khiếu nại đã được giải quyết',
        message,
        relatedId: dispute.id,
        relatedModel: 'Dispute',
        severity: 'info',
        isRead: false,
        emailSent: false,
      }),
      txNotificationRepo.create({
        userId: dispute.againstUserId,
        type: 'dispute_resolved',
        title: 'Khiếu nại đã được giải quyết',
        message,
        relatedId: dispute.id,
        relatedModel: 'Dispute',
        severity: 'info',
        isRead: false,
        emailSent: false,
      }),
    ]);
  });

  return getDisputeDetail(disputeId);
};

// ════════════════════════════════════════
// Transactions
// ════════════════════════════════════════
export interface AdminTransactionFilters {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

const ESCROW_TX_TYPE_MAP: Record<string, string> = {
  deposit: 'escrow_deposit',
  release: 'escrow_release',
  refund: 'refund',
};

export const getTransactions = async (filters: AdminTransactionFilters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;

  const paymentTransactions = await paymentRepo()
    .createQueryBuilder('payment')
    .leftJoinAndSelect('payment.user', 'user')
    .getMany();

  const escrowTransactions = await escrowTransactionRepo()
    .createQueryBuilder('tx')
    .leftJoinAndSelect('tx.fromUser', 'fromUser')
    .leftJoinAndSelect('tx.toUser', 'toUser')
    .getMany();

  const normalizedPayments = paymentTransactions.map((p) => ({
    id: p.id,
    type: p.type,
    userId: p.user ? { id: p.user.id, fullName: p.user.fullName, email: p.user.email } : null,
    amount: Number(p.amount || 0),
    paymentMethod: p.paymentMethod,
    description: p.description,
    status: p.status,
    createdAt: p.createdAt,
  }));

  const normalizedEscrow = escrowTransactions.map((t) => {
    const relevantUser = t.type === 'deposit' ? t.fromUser : t.toUser;
    return {
      id: `esc-${t.id}`,
      type: ESCROW_TX_TYPE_MAP[t.type] || t.type,
      userId: relevantUser
        ? { id: relevantUser.id, fullName: relevantUser.fullName, email: relevantUser.email }
        : null,
      amount: Number(t.amount || 0),
      paymentMethod: 'internal',
      description: t.description,
      status: 'completed',
      createdAt: t.createdAt,
    };
  });

  const fullList = [...normalizedPayments, ...normalizedEscrow];

  let filtered = fullList;
  if (filters.type) filtered = filtered.filter((t) => t.type === filters.type);
  if (filters.status) filtered = filtered.filter((t) => t.status === filters.status);

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  const statTypes = ['topup', 'escrow_deposit', 'escrow_release', 'refund'];
  const stats: Record<string, { totalAmount: number; count: number }> = {};
  for (const type of statTypes) {
    const items = fullList.filter((t) => t.type === type && t.status === 'completed');
    stats[type] = {
      totalAmount: items.reduce((sum, t) => sum + t.amount, 0),
      count: items.length,
    };
  }

  return {
    transactions: data,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    stats,
  };
};
