import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';

const userRepo = () => AppDataSource.getRepository(User);
const paymentTransactionRepo = () => AppDataSource.getRepository(PaymentTransaction);
const escrowTransactionRepo = () => AppDataSource.getRepository(EscrowTransaction);

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export interface WalletTransactionQuery {
  type?: string;
  page?: number;
  limit?: number;
}

const WALLET_TRANSACTION_TYPES = [
  'topup',
  'escrow_deposit',
  'escrow_release',
  'refund',
] as const;

const normalizeTransactionType = (type: string) => {
  if (type === 'topup') return 'Nạp tiền';
  if (type === 'escrow_deposit') return 'Đặt cọc / ký quỹ';
  if (type === 'escrow_release') return 'Giải ngân';
  if (type === 'refund') return 'Hoàn tiền';
  return type;
};

export const getWalletOverview = async (userId: string) => {
  const user = await userRepo().findOne({
    where: { id: userId },
  });

  if (!user) {
    throw makeError('Không tìm thấy người dùng', 404);
  }

  return {
    balance: Number(user.virtualBalance || 0),
    currency: 'VND',
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
};

export const getWalletTransactions = async (
  userId: string,
  query: WalletTransactionQuery = {}
) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Number(query.page)
    : 1;

  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Number(query.limit), 100)
    : 10;

  const skip = (page - 1) * limit;

  if (query.type && !WALLET_TRANSACTION_TYPES.includes(query.type as any)) {
    throw makeError('Loại giao dịch không hợp lệ', 400);
  }

  const paymentQb = paymentTransactionRepo()
    .createQueryBuilder('payment')
    .where('payment.userId = :userId', { userId });

  if (query.type) {
    paymentQb.andWhere('payment.type = :type', { type: query.type });
  }

  const paymentTransactions = await paymentQb
    .orderBy('payment.createdAt', 'DESC')
    .getMany();

  const escrowQb = escrowTransactionRepo()
    .createQueryBuilder('escrowTx')
    .where(
      '(escrowTx.fromUserId = :userId OR escrowTx.toUserId = :userId)',
      { userId }
    );

  if (query.type) {
    escrowQb.andWhere('escrowTx.type = :type', { type: query.type });
  }

  const escrowTransactions = await escrowQb
    .orderBy('escrowTx.createdAt', 'DESC')
    .getMany();

  const normalizedPaymentTransactions = paymentTransactions.map((item: any) => ({
    id: item.id,
    source: 'payment',
    type: item.type,
    typeLabel: normalizeTransactionType(item.type),
    amount: Number(item.amount || 0),
    status: item.status,
    description: item.description,
    paymentMethod: item.paymentMethod,
    transactionCode: item.transactionCode,
    contractId: item.contractId || null,
    createdAt: item.createdAt,
  }));

  const normalizedEscrowTransactions = escrowTransactions.map((item: any) => {
    const isIncoming = item.toUserId === userId;

    return {
      id: item.id,
      source: 'escrow',
      type: item.type,
      typeLabel: normalizeTransactionType(item.type),
      amount: Number(item.amount || 0),
      direction: isIncoming ? 'in' : 'out',
      status: item.status,
      description: item.description,
      escrowId: item.escrowId,
      contractId: item.contractId || null,
      createdAt: item.createdAt,
    };
  });

  const allTransactions = [
    ...normalizedPaymentTransactions,
    ...normalizedEscrowTransactions,
  ].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const paginated = allTransactions.slice(skip, skip + limit);

  return {
    transactions: paginated,
    pagination: {
      page,
      limit,
      total: allTransactions.length,
      totalPages: Math.ceil(allTransactions.length / limit),
    },
    filters: {
      type: query.type || null,
    },
  };
};