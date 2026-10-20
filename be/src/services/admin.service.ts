import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Contract } from '../models/Contract.entity';
import { Dispute } from '../models/Dispute.entity';
import { Notification } from '../models/Notification.entity';
import { DirectGoodsPayment } from '../models/DirectGoodsPayment.entity';
import { PlatformFeeLedgerEntry } from '../models/PlatformFeeLedgerEntry.entity';
import { PlatformFeePayment } from '../models/PlatformFeePayment.entity';
import { AppError } from '../middlewares/error.middleware';
import { logAction } from './systemLog.service';
import { notifyContractEmail as notifyEmail } from '../utils/notify.util';
import { lockByIdOrFail, runLockedTransaction } from '../utils/transaction-lock.util';
import {
  cancelOpenDirectPaymentsForContractWithManager,
  disputeReportedDirectPaymentsForContractWithManager,
} from '../modules/direct-payment-v2/direct-goods-payment.service';
import { adjustContractProductInventoryWithManager } from './contract.service';
import { hasGoodsLeftFarm } from '../utils/contract-completion.util';

const userRepo = () => AppDataSource.getRepository(User);
const contractRepo = () => AppDataSource.getRepository(Contract);
const disputeRepo = () => AppDataSource.getRepository(Dispute);
const goodsPaymentRepo = () => AppDataSource.getRepository(DirectGoodsPayment);
const feeLedgerRepo = () => AppDataSource.getRepository(PlatformFeeLedgerEntry);
const feePaymentRepo = () => AppDataSource.getRepository(PlatformFeePayment);

const pageArgs = (page?: number, limit?: number) => ({
  page: Math.max(1, Number(page) || 1),
  limit: Math.min(100, Math.max(1, Number(limit) || 20)),
});

export interface AdminUserFilters {
  search?: string;
  role?: string;
  isActive?: string | boolean;
  page?: number;
  limit?: number;
}

export const getUsers = async (filters: AdminUserFilters = {}) => {
  const { page, limit } = pageArgs(filters.page, filters.limit);
  const qb = userRepo().createQueryBuilder('user').select([
    'user.id', 'user.email', 'user.role', 'user.firstName', 'user.lastName',
    'user.fullName', 'user.phone', 'user.province', 'user.district', 'user.ward',
    'user.address', 'user.avatar', 'user.isActive', 'user.isVerified',
    'user.reputationScore', 'user.totalRatings', 'user.createdAt', 'user.lastLogin',
  ]);
  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere('(user.FullName LIKE :search OR user.Email LIKE :search OR user.Phone LIKE :search)', { search });
  }
  if (filters.role) qb.andWhere('user.Role = :role', { role: filters.role });
  if (filters.isActive !== undefined && filters.isActive !== '') {
    const isActive = filters.isActive === true || String(filters.isActive).toLowerCase() === 'true';
    qb.andWhere('user.IsActive = :isActive', { isActive });
  }
  const [users, total] = await qb.orderBy('user.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  return { users, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

export const getUserDetail = async (userId: string) => {
  const user = await userRepo().findOne({
    where: { id: userId },
    select: {
      id: true, email: true, role: true, firstName: true, lastName: true,
      fullName: true, phone: true, avatar: true, province: true, district: true,
      ward: true, address: true, isActive: true, isVerified: true,
      reputationScore: true, totalRatings: true, createdAt: true, lastLogin: true,
    },
  });
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  const [contractCount, asPayer, asPayee, feePayments] = await Promise.all([
    contractRepo().count({ where: [{ farmerId: userId }, { enterpriseId: userId }] }),
    goodsPaymentRepo().count({ where: { payerUserId: userId } }),
    goodsPaymentRepo().count({ where: { payeeUserId: userId } }),
    feePaymentRepo().count({ where: { userId } }),
  ]);
  return { user, contractCount, transactionCount: asPayer + asPayee + feePayments };
};

export const toggleUserStatus = async (userId: string, actorAdminId?: string) => {
  if (actorAdminId && userId === actorAdminId) throw new AppError('Bạn không thể tự khóa tài khoản admin đang đăng nhập', 400);
  const result = await runLockedTransaction(async manager => {
    const repo = manager.getRepository(User);
    const user = await lockByIdOrFail(manager, User, userId, () => new AppError('Không tìm thấy người dùng', 404));
    user.isActive = !user.isActive;
    if (!user.isActive) user.refreshToken = null as any;
    await repo.save(user);
    return { id: user.id, isActive: user.isActive };
  }, { label: 'admin.toggleUserStatus' });
  logAction({ category: 'auth', action: result.isActive ? 'user_activated' : 'user_deactivated', message: `Admin cập nhật trạng thái tài khoản ${result.id}`, userId: actorAdminId, targetType: 'User', targetId: result.id });
  const user = await userRepo().findOne({ where: { id: result.id } });
  if (!user) throw new AppError('Không tìm thấy người dùng sau khi cập nhật', 404);
  return { user };
};

export const deleteUser = async (userId: string, actorAdminId?: string) => {
  if (actorAdminId && userId === actorAdminId) throw new AppError('Bạn không thể tự vô hiệu hóa tài khoản admin đang đăng nhập', 400);
  const current = await userRepo().findOne({ where: { id: userId } });
  if (!current) throw new AppError('Không tìm thấy người dùng', 404);
  if (current.isActive) await toggleUserStatus(userId, actorAdminId);
  return { user: { id: userId, isActive: false }, hardDeleted: false };
};

export const getDashboardStats = async () => {
  const now = new Date();
  const monthStarts = Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  });
  const rangeStart = monthStarts[0];

  // Aggregate each table once. The former implementation issued a separate
  // COUNT query for every KPI and every month (20 queries for one dashboard).
  const [userStats, contractStats, disputeStats, goodsPaymentStats, feePaymentStats,
    monthlyUsers, recentUsers, recentContracts] = await Promise.all([
    userRepo().createQueryBuilder('user')
      .select('COUNT(*)', 'totalUsers')
      .addSelect("COALESCE(SUM(CASE WHEN user.Role = 'farmer' THEN 1 ELSE 0 END), 0)", 'totalFarmers')
      .addSelect("COALESCE(SUM(CASE WHEN user.Role = 'enterprise' THEN 1 ELSE 0 END), 0)", 'totalEnterprises')
      .getRawOne(),
    contractRepo().createQueryBuilder('contract')
      .select('COUNT(*)', 'totalContracts')
      .addSelect("COALESCE(SUM(CASE WHEN contract.Status = 'active' THEN 1 ELSE 0 END), 0)", 'activeContracts')
      .addSelect("COALESCE(SUM(CASE WHEN contract.Status = 'completed' THEN 1 ELSE 0 END), 0)", 'completedContracts')
      .addSelect("COALESCE(SUM(CASE WHEN contract.Status = 'cancelled' THEN 1 ELSE 0 END), 0)", 'cancelledContracts')
      .getRawOne(),
    disputeRepo().createQueryBuilder('dispute')
      .select("COALESCE(SUM(CASE WHEN dispute.Status IN ('open','under_review') THEN 1 ELSE 0 END), 0)", 'openDisputes')
      .getRawOne(),
    goodsPaymentRepo().createQueryBuilder('payment')
      .select('COUNT(*)', 'totalGoodsPayments')
      .getRawOne(),
    feePaymentRepo().createQueryBuilder('payment')
      .select('COUNT(*)', 'totalFeePayments')
      .addSelect("COALESCE(SUM(CASE WHEN payment.Status = 'paid' THEN payment.Amount ELSE 0 END), 0)", 'totalFeeCollected')
      .getRawOne(),
    userRepo().createQueryBuilder('user')
      .select('YEAR(user.CreatedAt)', 'year')
      .addSelect('MONTH(user.CreatedAt)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('user.CreatedAt >= :rangeStart', { rangeStart })
      .groupBy('YEAR(user.CreatedAt)')
      .addGroupBy('MONTH(user.CreatedAt)')
      .getRawMany(),
    userRepo().find({ select: { id: true, fullName: true, email: true, role: true }, order: { createdAt: 'DESC' }, take: 5 }),
    contractRepo().find({ order: { createdAt: 'DESC' }, take: 5 }),
  ]);

  const monthlyCount = new Map<string, number>(monthlyUsers.map((row: any) => [
    `${Number(row.year)}-${Number(row.month)}`,
    Number(row.count || 0),
  ]));
  const monthlyUserData = monthStarts.map((start) => ({
    month: `T${start.getUTCMonth() + 1}`,
    count: monthlyCount.get(`${start.getUTCFullYear()}-${start.getUTCMonth() + 1}`) || 0,
  }));

  const numberOf = (value: unknown): number => Number(value || 0);
  return {
    stats: {
      totalUsers: numberOf(userStats?.totalUsers),
      totalFarmers: numberOf(userStats?.totalFarmers),
      totalEnterprises: numberOf(userStats?.totalEnterprises),
      totalContracts: numberOf(contractStats?.totalContracts),
      activeContracts: numberOf(contractStats?.activeContracts),
      completedContracts: numberOf(contractStats?.completedContracts),
      cancelledContracts: numberOf(contractStats?.cancelledContracts),
      openDisputes: numberOf(disputeStats?.openDisputes),
      totalTransactions:
        numberOf(goodsPaymentStats?.totalGoodsPayments) +
        numberOf(feePaymentStats?.totalFeePayments),
      totalFeeCollected: numberOf(feePaymentStats?.totalFeeCollected),
    },
    monthlyUserData, recentUsers, recentContracts,
  };
};

export interface AdminContractFilters { search?: string; status?: string; page?: number; limit?: number }
export const getContracts = async (filters: AdminContractFilters = {}) => {
  const { page, limit } = pageArgs(filters.page, filters.limit);
  const qb = contractRepo().createQueryBuilder('contract');
  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere('(contract.ContractCode LIKE :search OR contract.FarmerName LIKE :search OR contract.EnterpriseName LIKE :search)', { search });
  }
  if (filters.status) qb.andWhere('contract.Status = :status', { status: filters.status });
  const [contracts, total] = await qb.orderBy('contract.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  return { contracts, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

export const getContractDetail = async (contractId: string) => {
  const contract = await contractRepo().findOne({ where: { id: contractId } });
  if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);
  const [dispute, payments] = await Promise.all([
    disputeRepo().findOne({ where: { contractId }, order: { createdAt: 'DESC' } }),
    goodsPaymentRepo().find({ where: { contractId }, order: { installmentSequence: 'ASC' } }),
  ]);
  return { contract, dispute, payments };
};

export interface AdminDisputeFilters { status?: string; search?: string; page?: number; limit?: number }
const DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'closed'];
export const getDisputes = async (filters: AdminDisputeFilters = {}) => {
  const { page, limit } = pageArgs(filters.page, filters.limit);
  const qb = disputeRepo().createQueryBuilder('dispute').leftJoinAndSelect('dispute.contract', 'contract').leftJoinAndSelect('dispute.raisedByUser', 'raisedByUser').leftJoinAndSelect('dispute.againstUser', 'againstUser');
  if (filters.status) qb.andWhere('dispute.Status = :status', { status: filters.status });
  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere('(contract.ContractCode LIKE :search OR raisedByUser.FullName LIKE :search OR againstUser.FullName LIKE :search OR dispute.Reason LIKE :search)', { search });
  }
  const [disputes, total] = await qb.orderBy('dispute.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  const raw = await disputeRepo().createQueryBuilder('dispute').select('dispute.Status', 'status').addSelect('COUNT(*)', 'count').groupBy('dispute.Status').getRawMany();
  const stats: Record<string, number> = Object.fromEntries(DISPUTE_STATUSES.map(status => [status, 0]));
  raw.forEach(row => { stats[row.status] = Number(row.count); });
  return { disputes, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, stats: { ...stats, total: Object.values(stats).reduce((sum, count) => sum + count, 0) } };
};

export const getDisputeDetail = async (id: string) => {
  const dispute = await disputeRepo().findOne({ where: { id }, relations: ['contract', 'raisedByUser', 'againstUser', 'evidences'] });
  if (!dispute) throw new AppError('Không tìm thấy khiếu nại', 404);
  return dispute;
};

export const resolveDispute = async (disputeId: string, resolution: string, adminNotes?: string, adminId?: string) => {
  if (resolution !== 'farmer' && resolution !== 'enterprise') throw new AppError('Phán quyết không hợp lệ', 400);
  const preliminary = await disputeRepo().findOne({ where: { id: disputeId }, select: { id: true, contractId: true } });
  if (!preliminary) throw new AppError('Không tìm thấy khiếu nại', 404);
  const notes = adminNotes?.trim() || undefined;
  const result = await runLockedTransaction(async manager => {
    const contracts = manager.getRepository(Contract);
    const disputes = manager.getRepository(Dispute);
    const notifications = manager.getRepository(Notification);
    const contract = await lockByIdOrFail(manager, Contract, preliminary.contractId, () => new AppError('Không tìm thấy hợp đồng', 404));
    const dispute = await lockByIdOrFail(manager, Dispute, disputeId, () => new AppError('Không tìm thấy khiếu nại', 404));
    if (dispute.contractId !== contract.id) throw new AppError('Dữ liệu tranh chấp không nhất quán', 409);
    if (!['open', 'under_review'].includes(dispute.status)) throw new AppError('Khiếu nại này đã được giải quyết', 400);
    if (contract.status !== 'disputed') throw new AppError('Hợp đồng không ở trạng thái tranh chấp', 409);
    const now = new Date();
    const goodsAlreadyLeftFarm = hasGoodsLeftFarm(contract.deliveryStatus);
    const manualSettlementRequired = resolution === 'enterprise' && (
      Number(contract.paidAmount || 0) > 0 || goodsAlreadyLeftFarm
    );
    if (resolution === 'farmer') {
      contract.status = contract.deliveryStatus === 'delivered' && Number(contract.remainingAmount || 0) <= 0 ? 'completed' : 'active';
      if (contract.status === 'completed') contract.completedAt = contract.completedAt || now;
    } else {
      await cancelOpenDirectPaymentsForContractWithManager(manager, contract.id);
      await disputeReportedDirectPaymentsForContractWithManager(manager, contract.id);
      if (!goodsAlreadyLeftFarm) {
        await adjustContractProductInventoryWithManager(manager, contract, 'restore');
      }
      contract.status = 'cancelled'; contract.cancelledAt = contract.cancelledAt || now;
      contract.cancelReason = notes || 'Tranh chấp được xử lý nghiêng về doanh nghiệp; khoản đã chuyển trực tiếp phải hoàn trả ngoài PreOnic.';
    }
    if (adminId) contract.updatedBy = adminId;
    await contracts.save(contract);
    dispute.status = 'resolved'; dispute.resolution = resolution; dispute.adminNotes = notes || dispute.adminNotes || 'PreOnic không tự động di chuyển hoặc thu hồi tiền đã chuyển trực tiếp.'; dispute.resolvedAt = now;
    await disputes.save(dispute);
    const siblings = await disputes.createQueryBuilder().update(Dispute).set({ status: 'closed', resolvedAt: now, adminNotes: `Tự động đóng vì tranh chấp ${dispute.id} đã được giải quyết.` }).where('ContractId = :contractId', { contractId: contract.id }).andWhere('DisputeId <> :disputeId', { disputeId }).andWhere("Status IN ('open', 'under_review')").execute();
    const message = resolution === 'farmer' ? `Tranh chấp hợp đồng ${contract.contractCode} đã được giải quyết nghiêng về nông dân.` : `Tranh chấp hợp đồng ${contract.contractCode} đã được giải quyết nghiêng về doanh nghiệp. PreOnic không thể tự động thu hồi tiền đã chuyển trực tiếp.`;
    await notifications.save([dispute.raisedBy, dispute.againstUserId].map(userId => notifications.create({ userId, type: 'dispute_resolved', title: 'Khiếu nại đã được giải quyết', message, relatedId: dispute.id, relatedModel: 'Dispute', severity: 'info', isRead: false, emailSent: false })));
    return { contractId: contract.id, contractCode: contract.contractCode, raisedBy: dispute.raisedBy, raisedByRole: dispute.raisedByRole, againstUserId: dispute.againstUserId, message, manualSettlementRequired, closedSiblingCount: Number(siblings.affected || 0) };
  }, { label: 'admin.resolveDirectDispute' });
  const [raisedBy, against] = await Promise.all([userRepo().findOne({ where: { id: result.raisedBy } }), userRepo().findOne({ where: { id: result.againstUserId } })]);
  const raisedRole = result.raisedByRole === 'farmer' ? 'farmer' : 'enterprise';
  await Promise.all([notifyEmail(raisedBy, raisedRole, 'Khiếu nại đã được giải quyết', result.message, result.contractId), notifyEmail(against, raisedRole === 'farmer' ? 'enterprise' : 'farmer', 'Khiếu nại đã được giải quyết', result.message, result.contractId)]);
  logAction({ category: 'dispute', action: 'dispute_resolved', message: `Admin đã giải quyết tranh chấp ${disputeId}`, userId: adminId, targetType: 'Dispute', targetId: disputeId, metadata: { resolution, contractCode: result.contractCode, manualSettlementRequired: result.manualSettlementRequired, closedSiblingDisputes: result.closedSiblingCount } });
  return getDisputeDetail(disputeId);
};

export interface AdminFeeFilters { search?: string; status?: string; page?: number; limit?: number }
export const getFees = async (filters: AdminFeeFilters = {}) => {
  const { page, limit } = pageArgs(filters.page, filters.limit);
  const qb = feeLedgerRepo().createQueryBuilder('entry').leftJoinAndSelect('entry.user', 'user').leftJoinAndSelect('entry.contract', 'contract');
  if (filters.search?.trim()) { const search = `%${filters.search.trim()}%`; qb.andWhere('(user.FullName LIKE :search OR user.Email LIKE :search OR contract.ContractCode LIKE :search OR entry.Description LIKE :search)', { search }); }
  if (filters.status) qb.andWhere('entry.Status = :status', { status: filters.status });
  const [entries, total] = await qb.orderBy('entry.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  const aggregate = await feeLedgerRepo().createQueryBuilder('entry').select("COALESCE(SUM(CASE WHEN entry.Direction = 'debit' AND entry.Status = 'posted' THEN entry.Amount ELSE 0 END), 0)", 'billed').addSelect("COALESCE(SUM(CASE WHEN entry.Direction = 'credit' AND entry.Status = 'posted' THEN entry.Amount ELSE 0 END), 0)", 'credited').addSelect("COALESCE(SUM(CASE WHEN entry.Direction = 'debit' AND entry.Status = 'pending' THEN entry.Amount ELSE 0 END), 0)", 'pending').getRawOne();
  const collected = await feePaymentRepo().createQueryBuilder('payment').select('COALESCE(SUM(payment.Amount), 0)', 'amount').where("payment.Status = 'paid'").getRawOne();
  const billed = Number(aggregate?.billed || 0); const credited = Number(aggregate?.credited || 0);
  const fees = entries.map(entry => ({ id: entry.id, entryType: entry.entryType, direction: entry.direction, amount: Number(entry.amount || 0), feeRate: entry.feeRateBps == null ? null : Number(entry.feeRateBps) / 100, status: entry.status, description: entry.description, postedAt: entry.postedAt, createdAt: entry.createdAt, user: entry.user ? { id: entry.user.id, fullName: entry.user.fullName, email: entry.user.email } : null, contract: entry.contract ? { id: entry.contract.id, contractCode: entry.contract.contractCode } : null }));
  return { fees, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, stats: { billed, credited, outstanding: Math.max(0, billed - credited), pending: Number(aggregate?.pending || 0), collected: Number(collected?.amount || 0) } };
};

export interface AdminTransactionFilters { type?: string; status?: string; page?: number; limit?: number }
export const getTransactions = async (filters: AdminTransactionFilters = {}) => {
  const { page, limit } = pageArgs(filters.page, filters.limit); const take = page * limit;
  const includeGoods = !filters.type || filters.type === 'goods_payment'; const includeFees = !filters.type || filters.type === 'fee_payment';
  const goodsQb = goodsPaymentRepo().createQueryBuilder('payment').leftJoinAndSelect('payment.payer', 'payer').leftJoinAndSelect('payment.payee', 'payee').leftJoinAndSelect('payment.contract', 'contract').orderBy('payment.createdAt', 'DESC').take(take);
  const feeQb = feePaymentRepo().createQueryBuilder('payment').leftJoinAndSelect('payment.user', 'user').orderBy('payment.createdAt', 'DESC').take(take);
  if (filters.status) { goodsQb.andWhere('payment.Status = :status', { status: filters.status }); feeQb.andWhere('payment.Status = :status', { status: filters.status }); }
  const [[goods, goodsTotal], [feePayments, feeTotal]] = await Promise.all([includeGoods ? goodsQb.getManyAndCount() : Promise.resolve([[], 0] as [DirectGoodsPayment[], number]), includeFees ? feeQb.getManyAndCount() : Promise.resolve([[], 0] as [PlatformFeePayment[], number])]);
  const transactions = [...goods.map(p => ({ id: p.id, type: 'goods_payment', amount: Number(p.amount || 0), status: p.status, paymentMethod: 'bank_transfer', transferContent: p.transferContent, createdAt: p.createdAt, payer: p.payer ? { id: p.payer.id, fullName: p.payer.fullName, email: p.payer.email } : null, payee: p.payee ? { id: p.payee.id, fullName: p.payee.fullName, email: p.payee.email } : null })), ...feePayments.map(p => ({ id: p.id, type: 'fee_payment', amount: Number(p.amount || 0), status: p.status, paymentMethod: p.provider, transferContent: p.transferContent, createdAt: p.createdAt, payer: p.user ? { id: p.user.id, fullName: p.user.fullName, email: p.user.email } : null, payee: null }))].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice((page - 1) * limit, page * limit);
  const [confirmedGoods, paidFees] = await Promise.all([goodsPaymentRepo().createQueryBuilder('payment').select('COALESCE(SUM(payment.Amount), 0)', 'amount').addSelect('COUNT(*)', 'count').where("payment.Status = 'confirmed'").getRawOne(), feePaymentRepo().createQueryBuilder('payment').select('COALESCE(SUM(payment.Amount), 0)', 'amount').addSelect('COUNT(*)', 'count').where("payment.Status = 'paid'").getRawOne()]);
  const total = goodsTotal + feeTotal;
  return { transactions, pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, stats: { goods_payment: { totalAmount: Number(confirmedGoods?.amount || 0), count: Number(confirmedGoods?.count || 0) }, fee_payment: { totalAmount: Number(paidFees?.amount || 0), count: Number(paidFees?.count || 0) } } };
};
