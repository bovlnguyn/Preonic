import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { logAction, logError } from './systemLog.service';
import { makeError } from '../utils/error.util';
import {
  lockByIdOrFail,
  lockOneOrFail,
  runLockedTransaction,
} from '../utils/transaction-lock.util';

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

/**
 * Tạo yêu cầu rút tiền ở trạng thái pending.
 *
 * Không trừ số dư ngay. Tuy nhiên User được khóa trước khi tính tổng các yêu cầu pending,
 * nhờ đó hai request tạo withdrawal chạy đồng thời cho cùng một user không thể cùng đọc
 * một availableBalance cũ rồi tạo tổng số tiền pending vượt quá số dư ví.
 */
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

  // Giữ cùng một orderCode khi transaction bị retry do deadlock.
  const orderCode = `RUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const result = await runLockedTransaction(
    async (manager) => {
      // User là "account lock" gốc cho mọi thao tác withdrawal của cùng một người dùng.
      const user = await lockByIdOrFail(
        manager,
        User,
        userId,
        () => makeError('Khong tim thay nguoi dung', 404)
      );

      const txRepo = manager.getRepository(PaymentTransaction);
      const balance = Number(user.virtualBalance || 0);

      // Query này chạy SAU khi đã lock User. Mọi create/approve/reject withdrawal trong
      // service này đều khóa User trước, vì vậy pendingTotal không còn bị race cùng user.
      const pendingRow = await txRepo
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'pendingTotal')
        .where('payment.userId = :userId', { userId })
        .andWhere("payment.type = 'withdraw'")
        .andWhere("payment.status = 'pending'")
        .getRawOne<{ pendingTotal: string | number }>();

      const pendingTotal = Number(pendingRow?.pendingTotal || 0);
      const availableBalance = balance - pendingTotal;

      if (amount > availableBalance) {
        throw makeError('So du kha dung khong du de tao yeu cau rut tien nay', 400);
      }

      const transaction = txRepo.create({
        userId: user.id,
        type: 'withdraw',
        amount,
        status: 'pending',
        paymentMethod: isDemo ? 'demo' : 'bank_transfer',
        orderCode,
        description:
          dto.note?.trim() ||
          (isDemo ? 'Yeu cau rut tien demo' : 'Yeu cau rut tien qua ngan hang'),
        bankName: isDemo ? null : dto.bankName!.trim(),
        bankAccountNumber: isDemo ? null : dto.bankAccountNumber!.trim(),
        bankAccountHolder: isDemo ? null : dto.bankAccountHolder!.trim().toUpperCase(),
        balanceBefore: balance,
        metadata: JSON.stringify({
          source: isDemo ? 'demo_withdraw' : 'bank_withdraw',
          createdBy: user.id,
        }),
      } as Partial<PaymentTransaction>);

      const saved = await txRepo.save(transaction);

      return {
        userId: user.id,
        userEmail: user.email,
        balance,
        transaction: saved,
      };
    },
    { label: 'withdrawal.create' }
  );

  // Log sau COMMIT. Không log bên trong transaction vì transaction có thể retry.
  logAction({
    category: 'payment',
    action: 'wallet_withdraw_requested',
    message: `${result.userEmail} tao yeu cau rut ${amount.toLocaleString('vi-VN')} VND (${orderCode})`,
    userId: result.userId,
    targetType: 'PaymentTransaction',
    targetId: result.transaction.id,
    metadata: { amount, orderCode, isDemo },
  });

  return {
    wallet: { balance: result.balance, currency: 'VND' },
    transaction: formatTransactionForUser(result.transaction),
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

/**
 * Admin xác nhận đã chuyển khoản.
 *
 * Lock order cố định: User -> PaymentTransaction.
 * create / approve / reject đều dùng cùng thứ tự này để hạn chế deadlock.
 * Chỉ sau khi lock mới re-check status và số dư rồi mới trừ tiền.
 */
export const approveWithdrawalRequest = async (adminId: string, id: string) => {
  // Chỉ đọc sơ bộ userId để biết account lock cần lấy. Mọi dữ liệu nghiệp vụ quan trọng
  // (status, amount, balance) đều được đọc lại sau khi đã lock trong transaction.
  const lookup = await paymentTransactionRepo().findOne({
    where: { id, type: 'withdraw' },
    select: { id: true, userId: true },
  });

  if (!lookup) {
    throw makeError('Khong tim thay yeu cau rut tien', 404);
  }

  try {
    const result = await runLockedTransaction(
      async (manager) => {
        const user = await lockByIdOrFail(
          manager,
          User,
          lookup.userId,
          () => makeError('Khong tim thay nguoi dung cho yeu cau nay', 404)
        );

        const transaction = await lockOneOrFail(
          manager,
          PaymentTransaction,
          { id, type: 'withdraw' },
          () => makeError('Khong tim thay yeu cau rut tien', 404)
        );

        // Phòng trường hợp dữ liệu bất thường bị đổi UserId giữa lookup và lúc lock.
        if (transaction.userId !== user.id) {
          throw makeError('Yeu cau rut tien da thay doi, vui long tai lai du lieu', 409);
        }

        if (transaction.status !== 'pending') {
          throw makeError('Yeu cau nay da duoc xu ly', 400);
        }

        const balanceBefore = Number(user.virtualBalance || 0);
        const amount = Number(transaction.amount || 0);

        if (!Number.isFinite(amount) || amount <= 0) {
          throw makeError('So tien rut khong hop le', 400);
        }

        if (amount > balanceBefore) {
          throw makeError('So du hien tai cua nguoi dung khong du de hoan tat rut tien', 400);
        }

        const balanceAfter = balanceBefore - amount;
        const now = new Date();

        user.virtualBalance = balanceAfter;
        await manager.getRepository(User).save(user);

        transaction.status = 'completed';
        transaction.balanceBefore = balanceBefore;
        transaction.balanceAfter = balanceAfter;
        transaction.processedBy = adminId;
        transaction.processedAt = now;
        transaction.completedAt = now;
        await manager.getRepository(PaymentTransaction).save(transaction);

        return {
          transaction,
          amount,
          targetUserId: user.id,
          userEmail: user.email,
        };
      },
      { label: 'withdrawal.approve' }
    );

    logAction({
      category: 'payment',
      action: 'wallet_withdraw_approved',
      message: `Admin xac nhan da chuyen ${result.amount.toLocaleString('vi-VN')} VND cho ${result.userEmail}`,
      userId: adminId,
      targetType: 'PaymentTransaction',
      targetId: result.transaction.id,
      metadata: { amount: result.amount, targetUserId: result.targetUserId },
    });

    return formatTransactionForUser(result.transaction);
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'wallet_withdraw_approve_failed',
      message: `Loi xac nhan rut tien ${id}: ${err.message || err}`,
      userId: adminId,
      targetType: 'PaymentTransaction',
      targetId: id,
      error: err,
    });
    throw err;
  }
};

/**
 * Admin từ chối yêu cầu rút tiền.
 *
 * Reject cũng lock User -> PaymentTransaction giống approve. Nhờ vậy approve và reject
 * không thể cùng đọc status=pending rồi ghi hai kết quả mâu thuẫn cho cùng một request.
 */
export const rejectWithdrawalRequest = async (adminId: string, id: string, reason?: string) => {
  const lookup = await paymentTransactionRepo().findOne({
    where: { id, type: 'withdraw' },
    select: { id: true, userId: true },
  });

  if (!lookup) {
    throw makeError('Khong tim thay yeu cau rut tien', 404);
  }

  const result = await runLockedTransaction(
    async (manager) => {
      const user = await lockByIdOrFail(
        manager,
        User,
        lookup.userId,
        () => makeError('Khong tim thay nguoi dung cho yeu cau nay', 404)
      );

      const transaction = await lockOneOrFail(
        manager,
        PaymentTransaction,
        { id, type: 'withdraw' },
        () => makeError('Khong tim thay yeu cau rut tien', 404)
      );

      if (transaction.userId !== user.id) {
        throw makeError('Yeu cau rut tien da thay doi, vui long tai lai du lieu', 409);
      }

      if (transaction.status !== 'pending') {
        throw makeError('Yeu cau nay da duoc xu ly', 400);
      }

      transaction.status = 'rejected';
      transaction.rejectReason = reason?.trim() || (null as any);
      transaction.processedBy = adminId;
      transaction.processedAt = new Date();

      const saved = await manager.getRepository(PaymentTransaction).save(transaction);

      return {
        transaction: saved,
        targetUserId: user.id,
      };
    },
    { label: 'withdrawal.reject' }
  );

  logAction({
    category: 'payment',
    action: 'wallet_withdraw_rejected',
    message: `Admin tu choi yeu cau rut ${Number(result.transaction.amount).toLocaleString('vi-VN')} VND (${result.transaction.id})`,
    userId: adminId,
    targetType: 'PaymentTransaction',
    targetId: result.transaction.id,
    metadata: { reason: reason || null, targetUserId: result.targetUserId },
  });

  return formatTransactionForUser(result.transaction);
};
