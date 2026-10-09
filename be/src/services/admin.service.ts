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
import { logAction } from './systemLog.service';
import { notifyContractEmail as notifyEmail } from '../utils/notify.util';
import {
  lockByIdOrFail,
  lockOne,
  runLockedTransaction,
} from '../utils/transaction-lock.util';
import {
  cancelOpenDirectPaymentsForContractWithManager,
} from '../modules/direct-payment-v2/direct-goods-payment.service';

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
      'user.totalRatings',
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

  qb.orderBy('user.createdAt', 'DESC');
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
      totalRatings: true,
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

export const toggleUserStatus = async (
  userId: string,
  actorAdminId?: string
) => {
  if (actorAdminId && userId === actorAdminId) {
    throw new AppError('Bạn không thể tự khóa hoặc mở khóa tài khoản admin đang đăng nhập', 400);
  }

  const result = await runLockedTransaction(
    async (manager) => {
      const txUserRepo = manager.getRepository(User);
      const user = await lockByIdOrFail(
        manager,
        User,
        userId,
        () => new AppError('Không tìm thấy người dùng', 404)
      );

      user.isActive = !user.isActive;

      // Khi khóa tài khoản, thu hồi luôn refresh token. Access token còn lại cũng sẽ
      // bị protect() từ chối ở request kế tiếp vì IsActive=false.
      if (!user.isActive) {
        user.refreshToken = null as any;
      }

      await txUserRepo.save(user);

      return {
        userId: user.id,
        isActive: user.isActive,
      };
    },
    { label: 'admin.toggleUserStatus' }
  );

  logAction({
    category: 'auth',
    action: result.isActive ? 'user_activated' : 'user_deactivated',
    message: `Admin ${result.isActive ? 'đã kích hoạt' : 'đã vô hiệu hóa'} tài khoản ${result.userId}`,
    userId: actorAdminId,
    targetType: 'User',
    targetId: result.userId,
  });

  return {
    user: {
      id: result.userId,
      isActive: result.isActive,
    },
  };
};

/**
 * Endpoint DELETE được giữ để tương thích client cũ, nhưng KHÔNG hard-delete User.
 * User là gốc của hợp đồng, escrow, dispute, rating, notification... nên xóa vật lý
 * có thể phá foreign key và làm mất audit trail. Thao tác này chỉ vô hiệu hóa tài
 * khoản + thu hồi refresh token; dữ liệu lịch sử vẫn nguyên vẹn.
 */
export const deleteUser = async (
  userId: string,
  actorAdminId?: string
) => {
  if (actorAdminId && userId === actorAdminId) {
    throw new AppError('Bạn không thể tự xóa/vô hiệu hóa tài khoản admin đang đăng nhập', 400);
  }

  const result = await runLockedTransaction(
    async (manager) => {
      const txUserRepo = manager.getRepository(User);
      const user = await lockByIdOrFail(
        manager,
        User,
        userId,
        () => new AppError('Không tìm thấy người dùng', 404)
      );

      user.isActive = false;
      user.refreshToken = null as any;
      await txUserRepo.save(user);

      return { userId: user.id };
    },
    { label: 'admin.safeDeleteUser' }
  );

  logAction({
    category: 'auth',
    action: 'user_deactivated_legacy_delete',
    message: `Admin đã vô hiệu hóa tài khoản ${result.userId} qua endpoint DELETE; dữ liệu lịch sử được giữ lại`,
    userId: actorAdminId,
    targetType: 'User',
    targetId: result.userId,
  });

  return {
    user: {
      id: result.userId,
      isActive: false,
    },
    hardDeleted: false,
  };
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

  qb.orderBy('contract.createdAt', 'DESC');
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
  search?: string;
  page?: number;
  limit?: number;
}

const DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'closed'];

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

  if (filters.search) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere(
      '(contract.ContractCode LIKE :search OR raisedByUser.FullName LIKE :search OR againstUser.FullName LIKE :search OR dispute.Reason LIKE :search)',
      { search }
    );
  }

  qb.orderBy('dispute.createdAt', 'DESC');
  qb.skip((page - 1) * limit).take(limit);

  const [disputes, total] = await qb.getManyAndCount();

  const statusCountsRaw = await disputeRepo()
    .createQueryBuilder('dispute')
    .select('dispute.Status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('dispute.Status')
    .getRawMany();

  const stats: Record<string, number> = Object.fromEntries(DISPUTE_STATUSES.map((s) => [s, 0]));
  let totalAll = 0;
  for (const row of statusCountsRaw) {
    const count = Number(row.count);
    stats[row.status] = count;
    totalAll += count;
  }

  return {
    disputes,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    stats: { ...stats, total: totalAll },
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

const resolveDirectV2Dispute = async (
  disputeId: string,
  contractId: string,
  resolution: 'farmer' | 'enterprise',
  normalizedAdminNotes?: string,
  adminId?: string
) => runLockedTransaction(
  async (manager) => {
    const txContractRepo = manager.getRepository(Contract);
    const txDisputeRepo = manager.getRepository(Dispute);
    const txNotificationRepo = manager.getRepository(Notification);

    const contract = await lockByIdOrFail(
      manager,
      Contract,
      contractId,
      () => new AppError('Không tìm thấy hợp đồng', 404)
    );

    if (contract.paymentFlow !== 'direct_v2') {
      throw new AppError('Hợp đồng không thuộc Direct Payment V2', 409);
    }

    const dispute = await lockByIdOrFail(
      manager,
      Dispute,
      disputeId,
      () => new AppError('Không tìm thấy khiếu nại', 404)
    );

    if (dispute.contractId !== contract.id || dispute.escrowId !== null) {
      throw new AppError('Dữ liệu tranh chấp Direct V2 không nhất quán', 409);
    }

    if (!RESOLVABLE_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new AppError('Khiếu nại này đã được giải quyết trước đó', 400);
    }

    if (contract.status !== 'disputed') {
      throw new AppError('Hợp đồng không ở trạng thái tranh chấp', 409);
    }

    const now = new Date();
    let manualSettlementRequired = false;

    if (resolution === 'farmer') {
      const fullyPaid =
        Math.max(0, Number(contract.remainingAmount || 0)) <= 0;
      contract.status =
        contract.deliveryStatus === 'delivered' && fullyPaid
          ? 'completed'
          : 'active';

      if (contract.status === 'completed') {
        contract.completedAt = contract.completedAt || now;
      }
    } else {
      // Preonic never pulls money back from Farmer in Direct V2. Any already
      // transferred amount must be handled externally according to the admin decision.
      manualSettlementRequired = Number(contract.paidAmount || 0) > 0;

      await cancelOpenDirectPaymentsForContractWithManager(
        manager,
        contract.id
      );

      contract.status = 'cancelled';
      contract.cancelledAt = contract.cancelledAt || now;
      contract.cancelReason =
        normalizedAdminNotes ||
        'Giải quyết tranh chấp Direct V2 nghiêng về doanh nghiệp; hoàn tiền (nếu có) xử lý ngoài Preonic.';
    }

    if (adminId) contract.updatedBy = adminId;
    await txContractRepo.save(contract);

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.adminNotes =
      normalizedAdminNotes ||
      dispute.adminNotes ||
      'Direct V2: Preonic không tự động di chuyển/thu hồi tiền đã chuyển trực tiếp.';
    dispute.resolvedAt = now;
    await txDisputeRepo.save(dispute);

    const siblingCloseResult = await txDisputeRepo
      .createQueryBuilder()
      .update(Dispute)
      .set({
        status: 'closed',
        resolvedAt: now,
        adminNotes: `Tự động đóng vì tranh chấp ${dispute.id} trên cùng hợp đồng đã được giải quyết.`,
      })
      .where('ContractId = :contractId', { contractId: contract.id })
      .andWhere('DisputeId <> :disputeId', { disputeId: dispute.id })
      .andWhere("Status IN ('open', 'under_review')")
      .execute();

    const message = resolution === 'farmer'
      ? `Tranh chấp hợp đồng ${contract.contractCode} đã được giải quyết nghiêng về nông dân. Preonic không thực hiện chuyển tiền vì hợp đồng dùng thanh toán trực tiếp.`
      : `Tranh chấp hợp đồng ${contract.contractCode} đã được giải quyết nghiêng về doanh nghiệp. Preonic không thể tự động thu hồi tiền đã chuyển trực tiếp; các khoản hoàn trả (nếu có) cần được xử lý giữa các bên.`;

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

    return {
      contractId: contract.id,
      contractCode: contract.contractCode,
      raisedBy: dispute.raisedBy,
      raisedByRole: dispute.raisedByRole,
      againstUserId: dispute.againstUserId,
      message,
      amountMoved: 0,
      commissionAmount: 0,
      closedSiblingCount: Number(siblingCloseResult.affected || 0),
      manualSettlementRequired,
    };
  },
  { label: 'admin.resolveDirectV2Dispute' }
);

export const resolveDispute = async (
  disputeId: string,
  resolution: string,
  adminNotes?: string,
  adminId?: string
) => {
  if (resolution !== 'farmer' && resolution !== 'enterprise') {
    throw new AppError('Phán quyết không hợp lệ', 400);
  }

  // Chỉ đọc sơ bộ để biết Contract/Escrow nào cần lock đầu tiên. Mọi dữ liệu dùng
  // để quyết định giải ngân/hoàn tiền sẽ được đọc lại SAU KHI row đã được khóa.
  const preliminaryDispute = await disputeRepo().findOne({
    where: { id: disputeId },
    select: {
      id: true,
      contractId: true,
      escrowId: true,
    },
  });

  if (!preliminaryDispute) {
    throw new AppError('Không tìm thấy khiếu nại', 404);
  }

  const normalizedAdminNotes = adminNotes?.trim() || undefined;

  const preliminaryContract = await contractRepo().findOne({
    where: { id: preliminaryDispute.contractId },
    select: {
      id: true,
      paymentFlow: true,
    },
  });

  if (!preliminaryContract) {
    throw new AppError('Không tìm thấy hợp đồng', 404);
  }

  const result = preliminaryContract.paymentFlow === 'direct_v2'
    ? await resolveDirectV2Dispute(
        disputeId,
        preliminaryDispute.contractId,
        resolution,
        normalizedAdminNotes,
        adminId
      )
    : await runLockedTransaction(
    async (manager) => {
      const txUserRepo = manager.getRepository(User);
      const txContractRepo = manager.getRepository(Contract);
      const txEscrowRepo = manager.getRepository(Escrow);
      const txMilestoneRepo = manager.getRepository(EscrowMilestone);
      const txTransactionRepo = manager.getRepository(EscrowTransaction);
      const txDisputeRepo = manager.getRepository(Dispute);
      const txNotificationRepo = manager.getRepository(Notification);

      // Giữ cùng thứ tự lock với escrow.service.ts:
      // Contract -> Escrow -> (Dispute) -> Milestone -> User.
      // Nhờ đó resolve dispute và confirm milestone trên cùng hợp đồng không thể
      // cùng dùng trạng thái/số dư cũ để giải ngân hai lần.
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        preliminaryDispute.contractId,
        () => new AppError('Không tìm thấy hợp đồng', 404)
      );

      if (!preliminaryDispute.escrowId) {
        throw new AppError('Khiếu nại Escrow V1 thiếu ký quỹ liên quan', 409);
      }

      const escrow = await lockByIdOrFail(
        manager,
        Escrow,
        preliminaryDispute.escrowId,
        () => new AppError('Không tìm thấy ký quỹ liên quan', 404)
      );

      const dispute = await lockByIdOrFail(
        manager,
        Dispute,
        disputeId,
        () => new AppError('Không tìm thấy khiếu nại', 404)
      );

      // Không tin các foreign key đã đọc trước transaction. Kiểm tra lại sau lock
      // để tránh xử lý nhầm dữ liệu nếu bản ghi không nhất quán.
      if (dispute.contractId !== contract.id || dispute.escrowId !== escrow.id) {
        throw new AppError('Dữ liệu khiếu nại không khớp với hợp đồng/ký quỹ', 409);
      }
      if (escrow.contractId !== contract.id) {
        throw new AppError('Dữ liệu ký quỹ không khớp với hợp đồng', 409);
      }

      // Đây là gate idempotency chính. Request resolve thứ hai phải chờ lock,
      // sau đó sẽ nhìn thấy status=resolved và dừng trước mọi thay đổi số dư.
      if (!RESOLVABLE_DISPUTE_STATUSES.includes(dispute.status)) {
        throw new AppError('Khiếu nại này đã được giải quyết trước đó', 400);
      }

      // Tranh chấp hợp lệ thông thường ở active/disputed. completed/refunded chỉ
      // được chấp nhận để đóng một dispute khác còn sót lại trên cùng escrow và
      // bắt buộc phải cùng hướng với kết quả tài chính đã chốt trước đó.
      const terminalEscrowStatus = escrow.status === 'completed' || escrow.status === 'refunded';
      if (!['active', 'disputed', 'completed', 'refunded'].includes(escrow.status)) {
        throw new AppError('Ký quỹ không ở trạng thái có thể giải quyết tranh chấp', 409);
      }
      if (escrow.status === 'completed' && resolution !== 'farmer') {
        throw new AppError('Ký quỹ đã được giải ngân; không thể đổi phán quyết sang hoàn tiền', 409);
      }
      if (escrow.status === 'refunded' && resolution !== 'enterprise') {
        throw new AppError('Ký quỹ đã được hoàn tiền; không thể đổi phán quyết sang giải ngân', 409);
      }

      const depositedAmount = Number(escrow.depositedAmount || 0);
      const releasedAmount = Number(escrow.releasedAmount || 0);
      const refundedAmount = Number(escrow.refundedAmount || 0);

      if (
        !Number.isFinite(depositedAmount) ||
        !Number.isFinite(releasedAmount) ||
        !Number.isFinite(refundedAmount) ||
        depositedAmount < 0 ||
        releasedAmount < 0 ||
        refundedAmount < 0
      ) {
        throw new AppError('Dữ liệu số tiền ký quỹ không hợp lệ', 500);
      }

      let remaining = depositedAmount - releasedAmount - refundedAmount;
      if (remaining < -0.01) {
        throw new AppError('Dữ liệu ký quỹ không nhất quán: tổng chi vượt số tiền đã nạp', 409);
      }
      if (Math.abs(remaining) <= 0.01) remaining = 0;

      if (terminalEscrowStatus && remaining > 0) {
        throw new AppError(
          'Dữ liệu ký quỹ không nhất quán: trạng thái đã kết thúc nhưng vẫn còn số dư chưa xử lý',
          409
        );
      }

      // Nếu dispute gắn với milestone, lock milestone trước User để giữ cùng thứ tự
      // với confirmMilestone(). Không để confirm và admin resolution chạy chồng nhau.
      let milestone: EscrowMilestone | null = null;
      if (dispute.milestoneStep) {
        milestone = await lockOne(manager, EscrowMilestone, {
          escrowId: escrow.id,
          step: dispute.milestoneStep,
        });
      }

      const now = new Date();

      let commissionAmount = 0;

      if (!terminalEscrowStatus && remaining > 0) {
        const beneficiaryId = resolution === 'farmer' ? escrow.farmerId : escrow.enterpriseId;
        const beneficiary = await lockByIdOrFail(
          manager,
          User,
          beneficiaryId,
          () => new AppError(
            resolution === 'farmer' ? 'Không tìm thấy nông dân' : 'Không tìm thấy doanh nghiệp',
            404
          )
        );

        const balanceBefore = Number(beneficiary.virtualBalance);
        if (!Number.isFinite(balanceBefore)) {
          throw new AppError('Số dư người nhận không hợp lệ', 500);
        }

        // Nghieng ve nong dan = hop dong hoan tat, thu phi hoa hong nen tang mot lan
        // tren phan con lai duoc giai ngan. Nghieng ve doanh nghiep la hoan tien nen
        // khong phat sinh hoa hong.
        if (resolution === 'farmer') {
          commissionAmount = Math.min(Math.max(Number(contract.commission) || 0, 0), remaining);
        }

        beneficiary.virtualBalance = balanceBefore + remaining - commissionAmount;
        await txUserRepo.save(beneficiary);

        if (resolution === 'farmer') {
          escrow.releasedAmount = releasedAmount + remaining;
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
          if (commissionAmount > 0) {
            await txTransactionRepo.save(
              txTransactionRepo.create({
                escrowId: escrow.id,
                type: 'commission',
                amount: commissionAmount,
                fromUserId: escrow.farmerId,
                milestoneStep: dispute.milestoneStep ?? undefined,
                description: `Phí hoa hồng nền tảng ${Number(contract.commissionRate) || 0}% (giải quyết khiếu nại) hợp đồng ${contract.contractCode}`,
              })
            );
          }
        } else {
          escrow.refundedAmount = refundedAmount + remaining;
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
      }

      if (resolution === 'farmer') {
        escrow.status = 'completed';
        contract.status = 'completed';
        contract.escrowStatus = 'released';
        contract.completedAt = contract.completedAt || now;
      } else {
        escrow.status = 'refunded';
        contract.status = 'cancelled';
        contract.escrowStatus = 'refunded';
        contract.cancelledAt = contract.cancelledAt || now;
        contract.cancelReason = normalizedAdminNotes || 'Giải quyết khiếu nại: hoàn tiền cho doanh nghiệp';
      }

      contract.paidAmount = Number(escrow.releasedAmount || 0);
      contract.remainingAmount = 0;
      if (adminId) contract.updatedBy = adminId;

      await txContractRepo.save(contract);
      await txEscrowRepo.save(escrow);

      if (milestone && milestone.status === 'disputed') {
        milestone.status = 'completed';
        milestone.completedAt = milestone.completedAt || now;
        await txMilestoneRepo.save(milestone);
      }

      dispute.status = 'resolved';
      dispute.resolution = resolution;
      dispute.adminNotes = normalizedAdminNotes || dispute.adminNotes;
      dispute.resolvedAt = now;
      await txDisputeRepo.save(dispute);

      // Fix 04: code cũ từng cho phép nhiều dispute active trên cùng Contract.
      // Khi một dispute được resolve, kết quả tài chính đã chốt toàn bộ Contract/Escrow,
      // vì vậy mọi dispute active còn sót trên cùng Contract phải được đóng để tránh
      // admin xử lý lần hai trên một trạng thái tài chính đã kết thúc.
      const siblingCloseResult = await txDisputeRepo
        .createQueryBuilder()
        .update(Dispute)
        .set({
          status: 'closed',
          resolvedAt: now,
          adminNotes: `Tự động đóng vì tranh chấp ${dispute.id} trên cùng hợp đồng đã được giải quyết.`,
        })
        .where('ContractId = :contractId', { contractId: contract.id })
        .andWhere('DisputeId <> :disputeId', { disputeId: dispute.id })
        .andWhere("Status IN ('open', 'under_review')")
        .execute();

      const closedSiblingCount = Number(siblingCloseResult.affected || 0);

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

      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        raisedBy: dispute.raisedBy,
        raisedByRole: dispute.raisedByRole,
        againstUserId: dispute.againstUserId,
        message,
        amountMoved: terminalEscrowStatus ? 0 : remaining,
        commissionAmount,
        closedSiblingCount,
      };
    },
    {
      label: 'admin.resolveDispute',
    }
  );

  // Email/log nằm ngoài transaction vì transaction helper có thể retry khi deadlock.
  // Nếu để side effect bên trong callback, một deadlock có thể làm gửi mail/log hai lần.
  const resolvedTitle = 'Khiếu nại đã được giải quyết';
  const raisedByRole = result.raisedByRole === 'farmer' ? 'farmer' : 'enterprise';
  const againstRole = raisedByRole === 'farmer' ? 'enterprise' : 'farmer';

  const [raisedByUser, againstUser] = await Promise.all([
    userRepo().findOne({ where: { id: result.raisedBy } }),
    userRepo().findOne({ where: { id: result.againstUserId } }),
  ]);

  await notifyEmail(
    raisedByUser,
    raisedByRole,
    resolvedTitle,
    result.message,
    result.contractId
  );
  await notifyEmail(
    againstUser,
    againstRole,
    resolvedTitle,
    result.message,
    result.contractId
  );

  logAction({
    category: 'dispute',
    action: 'dispute_resolved',
    message: `Admin da giai quyet tranh chap ${disputeId} (hop dong ${result.contractCode}) nghieng ve ${resolution === 'farmer' ? 'nong dan' : 'doanh nghiep'}`,
    userId: adminId,
    targetType: 'Dispute',
    targetId: disputeId,
    metadata: {
      resolution,
      contractCode: result.contractCode,
      amountMoved: result.amountMoved,
      commissionAmount: result.commissionAmount,
      closedSiblingDisputes: result.closedSiblingCount,
      ...('manualSettlementRequired' in result
        ? { manualSettlementRequired: result.manualSettlementRequired }
        : {}),
      ...(normalizedAdminNotes ? { adminNotes: normalizedAdminNotes } : {}),
    },
  });

  return getDisputeDetail(disputeId);
};


// ════════════════════════════════════════
// Commissions
// ════════════════════════════════════════
export interface AdminCommissionFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Danh sach hoa hong nen tang duoc snapshot ngay tren Contract.
 * Khong tu tao giao dich tien moi o day; endpoint nay chi doc/bao cao du lieu.
 */
export const getCommissions = async (filters: AdminCommissionFilters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

  const qb = contractRepo()
    .createQueryBuilder('contract')
    .where('COALESCE(contract.Commission, 0) > 0');

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere(
      '(contract.ContractCode LIKE :search OR contract.FarmerName LIKE :search OR contract.EnterpriseName LIKE :search OR contract.ProductName LIKE :search)',
      { search }
    );
  }

  if (filters.status?.trim()) {
    qb.andWhere('contract.Status = :status', { status: filters.status.trim() });
  }

  qb.orderBy('contract.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [contracts, total] = await qb.getManyAndCount();

  const aggregate = await contractRepo()
    .createQueryBuilder('contract')
    .select('COUNT(*)', 'totalContracts')
    .addSelect('COALESCE(SUM(contract.Commission), 0)', 'totalCommission')
    .addSelect(
      "COALESCE(SUM(CASE WHEN contract.Status = 'completed' THEN contract.Commission ELSE 0 END), 0)",
      'completedCommission'
    )
    .addSelect(
      "COALESCE(SUM(CASE WHEN contract.Status IN ('approved', 'active', 'cancel_pending', 'disputed') THEN contract.Commission ELSE 0 END), 0)",
      'inProgressCommission'
    )
    .addSelect(
      "COALESCE(SUM(CASE WHEN contract.Status = 'cancelled' THEN contract.Commission ELSE 0 END), 0)",
      'cancelledCommission'
    )
    .where('COALESCE(contract.Commission, 0) > 0')
    .getRawOne();

  const commissions = contracts.map((contract) => ({
    id: contract.id,
    contractId: contract.id,
    contractCode: contract.contractCode,
    farmerName: contract.farmerName,
    enterpriseName: contract.enterpriseName,
    productName: contract.productName,
    totalValue: Number(contract.totalValue || 0),
    commission: Number(contract.commission || 0),
    commissionRate: Number(contract.commissionRate || 0),
    status: contract.status,
    createdAt: contract.createdAt,
    completedAt: contract.completedAt,
  }));

  return {
    commissions,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    stats: {
      totalContracts: Number(aggregate?.totalContracts || 0),
      totalCommission: Number(aggregate?.totalCommission || 0),
      completedCommission: Number(aggregate?.completedCommission || 0),
      inProgressCommission: Number(aggregate?.inProgressCommission || 0),
      cancelledCommission: Number(aggregate?.cancelledCommission || 0),
    },
  };
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
  commission: 'commission',
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
    const relevantUser = t.type === 'deposit' || t.type === 'commission' ? t.fromUser : t.toUser;
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

  const statTypes = ['topup', 'escrow_deposit', 'escrow_release', 'refund', 'commission'];
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
