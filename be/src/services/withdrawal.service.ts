import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { logAction, logError } from './systemLog.service';
import { makeError } from '../utils/error.util';

const userRepo = () => AppDataSource.getRepository(User);
const paymentTransactionRepo = () => AppDataSource.getRepository(PaymentTransaction);

const WITHDRAW_ALLOWED_ROLES = ['farmer', 'enterprise'];

const formatTransactionForUser = (tx: PaymentTransaction) => ({
  id: tx.id,
  type: tx.type,
  amount: Number(tx.amount || 0),
  status: tx.status,
  paymentMethod: tx.paymentMethod,
  orderCode: tx.orderCode,
  description: tx.description,
  bankName: tx.bankName,
  bankAccountNumber: tx.bankAccountNumber,
  bankAccountHolder: tx.bankAccountHolder,
  rejectReason: tx.rejectReason,
  balanceBefore: Number(tx.balanceBefore || 0),
  balanceAfter: tx.balanceAfter != null ? Number(tx.balanceAfter) : null,
  createdAt: tx.createdAt,
  completedAt: tx.completedAt,
});

export interface CreateWithdrawalRequestDto {
  amount: number;
  note?: string;
  isDemo?: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
}

// Tao yeu cau rut tien o trang thai 'pending' — KHONG tru so du ngay, chi tru khi
// admin xac nhan da chuyen khoan (xem approveWithdrawalRequest).
export const createWithdrawalRequest = async (
  userId: string,
  role: string,
  dto: CreateWithdrawalRequestDto
) => {
  if (!WITHDRAW_ALLOWED_ROLES.includes(role)) {
    throw makeError('Vai tro nay khong the rut tien', 403);
  }

  const amount = Number(dto.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw makeError('So tien rut khong hop le', 400);
  }

  const isDemo = !!dto.isDemo;

  if (!isDemo) {
    if (!dto.bankName?.trim()) throw makeError('Vui long chon ngan hang nhan tien', 400);
    if (!dto.bankAccountNumber?.trim()) throw makeError('Vui long nhap so tai khoan', 400);
    if (!dto.bankAccountHolder?.trim()) throw makeError('Vui long nhap ten chu tai khoan', 400);
  }

  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung', 404);
  }

  const balance = Number(user.virtualBalance || 0);

  const { pendingTotal } = await paymentTransactionRepo()
    .createQueryBuilder('payment')
    .select('COALESCE(SUM(payment.amount), 0)', 'pendingTotal')
    .where('payment.userId = :userId', { userId })
    .andWhere("payment.type = 'withdraw'")
    .andWhere("payment.status = 'pending'")
    .getRawOne();

  const availableBalance = balance - Number(pendingTotal || 0);

  if (amount > availableBalance) {
    throw makeError('So du kha dung khong du de tao yeu cau rut tien nay', 400);
  }

  const orderCode = `RUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const transaction = paymentTransactionRepo().create({
    userId: user.id,
    type: 'withdraw',
    amount,
    status: 'pending',
    paymentMethod: isDemo ? 'demo' : 'bank_transfer',
    orderCode,
    description: dto.note?.trim() || (isDemo ? 'Yeu cau rut tien demo' : 'Yeu cau rut tien qua ngan hang'),
    bankName: isDemo ? null : dto.bankName!.trim(),
    bankAccountNumber: isDemo ? null : dto.bankAccountNumber!.trim(),
    bankAccountHolder: isDemo ? null : dto.bankAccountHolder!.trim().toUpperCase(),
    balanceBefore: balance,
    metadata: JSON.stringify({ source: isDemo ? 'demo_withdraw' : 'bank_withdraw', createdBy: user.id }),
  } as Partial<PaymentTransaction>);

  const saved = await paymentTransactionRepo().save(transaction);

  logAction({
    category: 'payment',
    action: 'wallet_withdraw_requested',
    message: `${user.email} tao yeu cau rut ${amount.toLocaleString('vi-VN')} VND (${orderCode})`,
    userId: user.id,
    targetType: 'PaymentTransaction',
    targetId: saved.id,
    metadata: { amount, orderCode, isDemo },
  });

  return {
    wallet: { balance, currency: 'VND' },
    transaction: formatTransactionForUser(saved),
  };
};

export interface AdminWithdrawalQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export const listWithdrawalRequestsForAdmin = async (query: AdminWithdrawalQuery = {}) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Number(query.limit), 100)
    : 20;

  const qb = paymentTransactionRepo()
    .createQueryBuilder('payment')
    .leftJoinAndSelect('payment.user', 'user')
    .leftJoinAndSelect('payment.processedByUser', 'processedByUser')
    .where("payment.type = 'withdraw'");

  if (query.status) {
    qb.andWhere('payment.status = :status', { status: query.status });
  }

  qb.orderBy('payment.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [items, total] = await qb.getManyAndCount();

  const requests = items.map((tx: any) => ({
    id: tx.id,
    amount: Number(tx.amount || 0),
    status: tx.status,
    paymentMethod: tx.paymentMethod,
    bankName: tx.bankName,
    bankAccountNumber: tx.bankAccountNumber,
    bankAccountHolder: tx.bankAccountHolder,
    note: tx.description,
    rejectReason: tx.rejectReason,
    createdAt: tx.createdAt,
    processedAt: tx.processedAt,
    userId: tx.user
      ? {
          id: tx.user.id,
          fullName: tx.user.fullName,
          email: tx.user.email,
          virtualBalance: Number(tx.user.virtualBalance || 0),
        }
      : null,
    processedBy: tx.processedByUser
      ? { id: tx.processedByUser.id, fullName: tx.processedByUser.fullName }
      : null,
  }));

  return {
    requests,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

// Admin xac nhan DA CHUYEN KHOAN — tai thoi diem nay moi thuc su tru so du nguoi dung.
export const approveWithdrawalRequest = async (adminId: string, id: string) => {
  const transaction = await paymentTransactionRepo().findOne({ where: { id, type: 'withdraw' } });
  if (!transaction) {
    throw makeError('Khong tim thay yeu cau rut tien', 404);
  }
  if (transaction.status !== 'pending') {
    throw makeError('Yeu cau nay da duoc xu ly', 400);
  }

  const user = await userRepo().findOne({ where: { id: transaction.userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung cho yeu cau nay', 404);
  }

  const balanceBefore = Number(user.virtualBalance || 0);
  const amount = Number(transaction.amount || 0);

  if (amount > balanceBefore) {
    throw makeError('So du hien tai cua nguoi dung khong du de hoan tat rut tien', 400);
  }

  const balanceAfter = balanceBefore - amount;

  try {
    await AppDataSource.transaction(async (manager) => {
      user.virtualBalance = balanceAfter;
      await manager.getRepository(User).save(user);

      transaction.status = 'completed';
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = balanceAfter;
      transaction.processedBy = adminId;
      transaction.processedAt = new Date();
      transaction.completedAt = new Date();
      await manager.getRepository(PaymentTransaction).save(transaction);
    });
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'wallet_withdraw_approve_failed',
      message: `Loi xac nhan rut tien cho user ${user.email}: ${err.message || err}`,
      userId: adminId,
      targetType: 'PaymentTransaction',
      targetId: transaction.id,
      error: err,
    });
    throw err;
  }

  logAction({
    category: 'payment',
    action: 'wallet_withdraw_approved',
    message: `Admin xac nhan da chuyen ${amount.toLocaleString('vi-VN')} VND cho ${user.email}`,
    userId: adminId,
    targetType: 'PaymentTransaction',
    targetId: transaction.id,
    metadata: { amount, targetUserId: user.id },
  });

  return formatTransactionForUser(transaction);
};

export const rejectWithdrawalRequest = async (adminId: string, id: string, reason?: string) => {
  const transaction = await paymentTransactionRepo().findOne({ where: { id, type: 'withdraw' } });
  if (!transaction) {
    throw makeError('Khong tim thay yeu cau rut tien', 404);
  }
  if (transaction.status !== 'pending') {
    throw makeError('Yeu cau nay da duoc xu ly', 400);
  }

  transaction.status = 'rejected';
  transaction.rejectReason = reason?.trim() || null as any;
  transaction.processedBy = adminId;
  transaction.processedAt = new Date();
  await paymentTransactionRepo().save(transaction);

  logAction({
    category: 'payment',
    action: 'wallet_withdraw_rejected',
    message: `Admin tu choi yeu cau rut ${Number(transaction.amount).toLocaleString('vi-VN')} VND (${transaction.id})`,
    userId: adminId,
    targetType: 'PaymentTransaction',
    targetId: transaction.id,
    metadata: { reason: reason || null, targetUserId: transaction.userId },
  });

  return formatTransactionForUser(transaction);
};
