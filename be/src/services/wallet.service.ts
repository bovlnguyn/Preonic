import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';
import { Contract } from '../models/Contract.entity';
import { Escrow } from '../models/Escrow.entity';
import { logAction, logError } from './systemLog.service';
import {
  lockByIdOrFail,
  lockOneOrFail,
  runLockedTransaction,
} from '../utils/transaction-lock.util';
import crypto from 'crypto';
import { makeError } from '../utils/error.util';

const userRepo = () => AppDataSource.getRepository(User);
const paymentTransactionRepo = () => AppDataSource.getRepository(PaymentTransaction);
const escrowTransactionRepo = () => AppDataSource.getRepository(EscrowTransaction);
const contractRepo = () => AppDataSource.getRepository(Contract);
const escrowRepo = () => AppDataSource.getRepository(Escrow);

export interface WalletTransactionQuery {
  type?: string;
  page?: number;
  limit?: number;
}

const WALLET_TRANSACTION_TYPES = [
  'topup',
  'withdraw',
  'deposit',
  'release',
  // aliases cu de giu tuong thich neu client/admin cu van gui ten nay
  'escrow_deposit',
  'escrow_release',
  'refund',
] as const;

const PAYMENT_TRANSACTION_TYPES = new Set(['topup', 'withdraw', 'refund']);

const normalizeWalletFilterType = (type?: string) => {
  if (type === 'escrow_deposit') return 'deposit';
  if (type === 'escrow_release') return 'release';
  return type;
};

const normalizeTransactionType = (type: string) => {
  if (type === 'topup') return 'Nạp tiền';
  if (type === 'withdraw') return 'Rút tiền';
  // EscrowTransaction.type thuc te la 'deposit'/'release' (xem escrow.service.ts),
  // khong phai 'escrow_deposit'/'escrow_release' — giu ca hai de tuong thich nguoc.
  if (type === 'deposit' || type === 'escrow_deposit') return 'Đặt cọc / ký quỹ';
  if (type === 'release' || type === 'escrow_release') return 'Giải ngân';
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

  const normalizedFilterType = normalizeWalletFilterType(query.type);
  const isPaymentFilter = Boolean(
    normalizedFilterType && PAYMENT_TRANSACTION_TYPES.has(normalizedFilterType)
  );
  const isEscrowFilter = normalizedFilterType === 'deposit' || normalizedFilterType === 'release';

  const paymentQb = paymentTransactionRepo()
    .createQueryBuilder('payment')
    .where('payment.userId = :userId', { userId });

  if (normalizedFilterType) {
    if (isPaymentFilter) {
      paymentQb.andWhere('payment.type = :type', { type: normalizedFilterType });
    } else {
      // Khi lọc deposit/release thì không query nhầm PaymentTransactions.
      paymentQb.andWhere('1 = 0');
    }
  }

  const escrowQb = escrowTransactionRepo()
    .createQueryBuilder('escrowTx')
    .where(
      '(escrowTx.fromUserId = :userId OR escrowTx.toUserId = :userId)',
      { userId }
    );

  if (normalizedFilterType) {
    if (isEscrowFilter) {
      escrowQb.andWhere('escrowTx.type = :type', { type: normalizedFilterType });
    } else {
      // Khi lọc topup/withdraw/refund thì EscrowTransactions không có các type này.
      escrowQb.andWhere('1 = 0');
    }
  }

  const [paymentTransactions, escrowTransactions] = await Promise.all([
    paymentQb.orderBy('payment.createdAt', 'DESC').getMany(),
    escrowQb.orderBy('escrowTx.createdAt', 'DESC').getMany(),
  ]);

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
    bankName: item.bankName || null,
    bankAccountNumber: item.bankAccountNumber || null,
    bankAccountHolder: item.bankAccountHolder || null,
    rejectReason: item.rejectReason || null,
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

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const isWalletIncoming = (type: string) => ['topup', 'refund', 'escrow_release'].includes(type);
const isWalletOutgoing = (type: string) => ['withdraw', 'escrow_deposit'].includes(type);

const getTransactionTime = (item: { completedAt?: Date | null; createdAt: Date }) =>
  item.completedAt || item.createdAt;

const getMonthIndex = (date: Date) => new Date(date).getMonth();

const formatOverviewStatus = (status?: string | null) => status || 'pending';

const buildChartSkeleton = () =>
  MONTH_NAMES.map((month) => ({
    month,
    cost: 0,
  }));

// Dung chung cho getEnterpriseTransactionsOverview va getFarmerTransactionsOverview
// (truoc day bi copy y het, chi khac field so huu hop dong/escrow: enterpriseId/farmerId).
const fetchYearlyFinancialData = (
  userId: string,
  ownerField: 'enterpriseId' | 'farmerId',
  startDate: Date,
  endDate: Date
) =>
  Promise.all([
    paymentTransactionRepo()
      .createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.createdAt >= :startDate AND payment.createdAt < :endDate', {
        startDate,
        endDate,
      })
      .orderBy('payment.createdAt', 'DESC')
      .getMany(),

    escrowTransactionRepo()
      .createQueryBuilder('escrowTx')
      .leftJoinAndSelect('escrowTx.escrow', 'escrow')
      .leftJoinAndSelect('escrow.contract', 'contract')
      .where('(escrowTx.fromUserId = :userId OR escrowTx.toUserId = :userId)', { userId })
      .andWhere('escrowTx.createdAt >= :startDate AND escrowTx.createdAt < :endDate', {
        startDate,
        endDate,
      })
      .orderBy('escrowTx.createdAt', 'DESC')
      .getMany(),

    contractRepo()
      .createQueryBuilder('contract')
      .where(`contract.${ownerField} = :userId`, { userId })
      .andWhere("contract.status <> 'cancelled'")
      .andWhere('contract.createdAt >= :startDate AND contract.createdAt < :endDate', {
        startDate,
        endDate,
      })
      .orderBy('contract.createdAt', 'DESC')
      .getMany(),

    escrowRepo()
      .createQueryBuilder('escrow')
      .where(`escrow.${ownerField} = :userId`, { userId })
      .andWhere('escrow.createdAt >= :startDate AND escrow.createdAt < :endDate', {
        startDate,
        endDate,
      })
      .getMany(),
  ]);

// Dung chung: build danh sach hien thi cho giao dich vi (nap/rut) trong tong quan nam.
const buildWalletItems = (walletTransactions: PaymentTransaction[]) =>
  walletTransactions.map((item) => {
    const incoming = isWalletIncoming(item.type);
    const outgoing = isWalletOutgoing(item.type);
    const signedAmount = outgoing ? -Number(item.amount || 0) : Number(item.amount || 0);

    return {
      id: item.id,
      referenceId: item.id,
      type: 'wallet',
      title: normalizeTransactionType(item.type),
      description: item.description || item.orderCode || 'Giao dich vi',
      amount: incoming || outgoing ? signedAmount : Number(item.amount || 0),
      status: formatOverviewStatus(item.status),
      createdAt: item.createdAt,
      detailUrl: null,
    };
  });

// Dung chung: build danh sach hien thi cho giao dich escrow, chi khac duong dan chi tiet
// theo role (enterprise/farmer) nen nhan vao 2 ham build URL.
const buildEscrowItems = (
  escrowTransactions: EscrowTransaction[],
  userId: string,
  buildContractDetailUrl: (contractId: string) => string,
  fallbackDetailUrl: string
) =>
  escrowTransactions.map((item: any) => {
    const contract = item.escrow?.contract;
    const isOutgoing = item.fromUserId === userId;
    const contractId = item.escrow?.contractId || contract?.id || null;

    return {
      id: `escrow-${item.id}`,
      referenceId: item.escrowId,
      contractId,
      type: 'escrow',
      title: normalizeTransactionType(item.type),
      description: item.description || `Escrow ${contract?.contractCode || item.escrowId}`,
      amount: isOutgoing ? -Number(item.amount || 0) : Number(item.amount || 0),
      status: item.escrow?.status || 'completed',
      createdAt: item.createdAt,
      detailUrl: contractId ? buildContractDetailUrl(contractId) : fallbackDetailUrl,
    };
  });

const ENTERPRISE_TRANSACTION_TYPES = ['wallet', 'contract', 'escrow'] as const;

export interface EnterpriseTransactionsOverviewQuery {
  page?: number;
  limit?: number;
  type?: string;
}

export const getEnterpriseTransactionsOverview = async (
  userId: string,
  role: string,
  year = new Date().getFullYear(),
  options: EnterpriseTransactionsOverviewQuery = {}
) => {
  if (role !== 'enterprise') {
    throw makeError('Chi doanh nghiep moi co the xem tong quan giao dich', 403);
  }

  if (options.type && !ENTERPRISE_TRANSACTION_TYPES.includes(options.type as any)) {
    throw makeError('Loai giao dich khong hop le', 400);
  }

  const page = Number.isFinite(Number(options.page)) && Number(options.page) > 0
    ? Number(options.page)
    : 1;

  const limit = Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : 10;

  const skip = (page - 1) * limit;

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const [walletTransactions, escrowTransactions, contracts, escrows] =
    await fetchYearlyFinancialData(userId, 'enterpriseId', startDate, endDate);

  const chart = buildChartSkeleton();

  walletTransactions.forEach((transaction) => {
    const amount = Number(transaction.amount || 0);
    const monthIndex = getMonthIndex(getTransactionTime(transaction));

    if (isWalletOutgoing(transaction.type) && transaction.status === 'completed') {
      chart[monthIndex].cost += amount;
    }
  });

  escrowTransactions.forEach((transaction) => {
    const amount = Number(transaction.amount || 0);
    const monthIndex = getMonthIndex(transaction.createdAt);

    if (transaction.fromUserId === userId) {
      chart[monthIndex].cost += amount;
    }
  });

  const walletItems = buildWalletItems(walletTransactions);

  const escrowItems = buildEscrowItems(
    escrowTransactions,
    userId,
    (contractId) => `/enterprise/escrow?contractId=${contractId}`,
    '/enterprise/escrow'
  );

  const contractItems = contracts.map((item) => ({
    id: item.id,
    referenceId: item.id,
    type: 'contract',
    title: item.contractCode,
    description: item.productName || 'Hop dong mua ban nong san',
    amount: -Number(item.totalValue || 0),
    status: item.status,
    createdAt: item.createdAt,
    detailUrl: `/enterprise/contracts/${item.id}`,
  }));

  const allTransactions = [
    ...walletItems,
    ...escrowItems,
    ...contractItems,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredTransactions = options.type
    ? allTransactions.filter((item) => item.type === options.type)
    : allTransactions;

  const recentTransactions = filteredTransactions.slice(skip, skip + limit);

  const totalCost = chart.reduce((sum, item) => sum + item.cost, 0);

  return {
    year,
    summary: {
      totalCost,
      totalWalletTransactions: walletTransactions.length,
      totalContracts: contracts.length,
      totalEscrows: escrows.length,
    },
    chart,
    recentTransactions,
    pagination: {
      page,
      limit,
      total: filteredTransactions.length,
      totalPages: Math.max(1, Math.ceil(filteredTransactions.length / limit)),
    },
    filters: {
      type: options.type || null,
    },
  };
};

const FARMER_TRANSACTION_TYPES = ['wallet', 'contract', 'escrow'] as const;

export interface FarmerTransactionsOverviewQuery {
  page?: number;
  limit?: number;
  type?: string;
}

const buildRevenueChartSkeleton = () =>
  MONTH_NAMES.map((month) => ({ month, revenue: 0 }));

// Tuong tu getEnterpriseTransactionsOverview nhung dao chieu ngu nghia: hop dong/escrow
// la doanh thu (+) chu khong phai chi phi (-), vi nong dan la ben nhan tien.
export const getFarmerTransactionsOverview = async (
  userId: string,
  role: string,
  year = new Date().getFullYear(),
  options: FarmerTransactionsOverviewQuery = {}
) => {
  if (role !== 'farmer') {
    throw makeError('Chi nong dan moi co the xem tong quan doanh thu', 403);
  }

  if (options.type && !FARMER_TRANSACTION_TYPES.includes(options.type as any)) {
    throw makeError('Loai giao dich khong hop le', 400);
  }

  const page = Number.isFinite(Number(options.page)) && Number(options.page) > 0
    ? Number(options.page)
    : 1;

  const limit = Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : 10;

  const skip = (page - 1) * limit;

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const [walletTransactions, escrowTransactions, contracts, escrows] =
    await fetchYearlyFinancialData(userId, 'farmerId', startDate, endDate);

  const chart = buildRevenueChartSkeleton();

  // Doanh thu thuc nhan theo thang duoc tinh tu tien giai ngan escrow (toUserId = nong dan),
  // chinh xac hon la lay ngay tao hop dong vi mot hop dong co the giai ngan qua nhieu thang.
  escrowTransactions.forEach((transaction) => {
    const amount = Number(transaction.amount || 0);
    const monthIndex = getMonthIndex(transaction.createdAt);

    if (transaction.toUserId === userId) {
      chart[monthIndex].revenue += amount;
    }
  });

  const walletItems = buildWalletItems(walletTransactions);

  const escrowItems = buildEscrowItems(
    escrowTransactions,
    userId,
    (contractId) => `/farmer/contracts/${contractId}`,
    '/farmer/escrow'
  );

  const contractItems = contracts.map((item) => ({
    id: item.id,
    referenceId: item.id,
    type: 'contract',
    title: item.contractCode,
    description: item.productName || 'Hop dong bao tieu nong san',
    amount: Number(item.totalValue || 0),
    status: item.status,
    createdAt: item.createdAt,
    detailUrl: `/farmer/contracts/${item.id}`,
  }));

  const allTransactions = [
    ...walletItems,
    ...escrowItems,
    ...contractItems,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredTransactions = options.type
    ? allTransactions.filter((item) => item.type === options.type)
    : allTransactions;

  const recentTransactions = filteredTransactions.slice(skip, skip + limit);

  const totalRevenue = chart.reduce((sum, item) => sum + item.revenue, 0);
  const totalContractValue = contracts.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);

  return {
    year,
    summary: {
      totalRevenue,
      totalContractValue,
      totalWalletTransactions: walletTransactions.length,
      totalContracts: contracts.length,
      totalEscrows: escrows.length,
    },
    chart,
    recentTransactions,
    pagination: {
      page,
      limit,
      total: filteredTransactions.length,
      totalPages: Math.max(1, Math.ceil(filteredTransactions.length / limit)),
    },
    filters: {
      type: options.type || null,
    },
  };
};

const TOPUP_ALLOWED_ROLES = ['farmer', 'enterprise'];
const MAX_TOPUP_AMOUNT = 100_000_000;

export const demoTopupWallet = async (
  userId: string,
  role: string,
  dto: { amount: number; note?: string }
) => {
  if (!TOPUP_ALLOWED_ROLES.includes(role)) {
    throw makeError('Vai tro nay khong the nap tien demo', 403);
  }

  const amount = Number(dto.amount);

  if (!Number.isFinite(amount)) {
    throw makeError('So tien nap khong hop le', 400);
  }

  if (amount <= 0) {
    throw makeError('So tien nap phai lon hon 0', 400);
  }

  if (amount > MAX_TOPUP_AMOUNT) {
    throw makeError('So tien nap demo khong duoc vuot qua 100,000,000 VND', 400);
  }

  // Tao ma mot lan ben ngoai transaction. Neu transaction bi deadlock va retry,
  // cung orderCode se duoc dung lai; attempt truoc da rollback nen khong tao ban ghi trung.
  const orderCode = `TOPUP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let result: {
    savedTransaction: PaymentTransaction;
    balanceAfter: number;
    userId: string;
    userEmail: string;
  };

  try {
    result = await runLockedTransaction(
      async (manager) => {
        const user = await lockByIdOrFail(
          manager,
          User,
          userId,
          () => makeError('Khong tim thay nguoi dung', 404)
        );

        if (!TOPUP_ALLOWED_ROLES.includes(user.role)) {
          throw makeError('Vai tro nay khong the nap tien demo', 403);
        }

        // So du phai duoc doc SAU khi User row da bi lock.
        const balanceBefore = Number(user.virtualBalance || 0);
        const balanceAfter = balanceBefore + amount;

        user.virtualBalance = balanceAfter;
        await manager.getRepository(User).save(user);

        const transaction = manager.getRepository(PaymentTransaction).create({
          userId: user.id,
          type: 'topup',
          amount,
          status: 'completed',
          paymentMethod: 'demo',
          gatewayRef: orderCode,
          orderCode,
          description: dto.note?.trim() || 'Nap tien demo vao vi ao',
          balanceBefore,
          balanceAfter,
          metadata: JSON.stringify({
            source: 'demo_topup',
            createdBy: user.id,
          }),
          completedAt: new Date(),
        } as Partial<PaymentTransaction>);

        const savedTransaction = await manager
          .getRepository(PaymentTransaction)
          .save(transaction);

        return {
          savedTransaction,
          balanceAfter,
          userId: user.id,
          userEmail: user.email,
        };
      },
      { label: 'wallet.demoTopup' }
    );
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'wallet_topup_failed',
      message: `Loi nap tien vi cho user ${userId}: ${err.message || err}`,
      userId,
      targetType: 'User',
      targetId: userId,
      metadata: { amount, orderCode },
      error: err,
    });
    throw err;
  }

  logAction({
    category: 'payment',
    action: 'wallet_topup',
    message: `${result.userEmail} nap ${amount.toLocaleString('vi-VN')} VND vao vi (demo)`,
    userId: result.userId,
    targetType: 'PaymentTransaction',
    targetId: result.savedTransaction.id,
    metadata: { amount, orderCode },
  });

  return {
    wallet: {
      balance: result.balanceAfter,
      currency: 'VND',
    },
    transaction: {
      id: result.savedTransaction.id,
      type: result.savedTransaction.type,
      amount: Number(result.savedTransaction.amount || 0),
      status: result.savedTransaction.status,
      paymentMethod: result.savedTransaction.paymentMethod,
      orderCode: result.savedTransaction.orderCode,
      description: result.savedTransaction.description,
      balanceBefore: Number(result.savedTransaction.balanceBefore || 0),
      balanceAfter: Number(result.savedTransaction.balanceAfter || 0),
      createdAt: result.savedTransaction.createdAt,
      completedAt: result.savedTransaction.completedAt,
    },
  };
};

const getSepayBankConfig = () => {
  const accountNumber = process.env.SEPAY_BANK_ACCOUNT_NUMBER;
  const bankCode = process.env.SEPAY_BANK_CODE;
  const accountHolder = process.env.SEPAY_ACCOUNT_HOLDER;

  if (!accountNumber || !bankCode || !accountHolder) {
    throw makeError(
      'SePay chua duoc cau hinh tren he thong. Vui long dung "Nap demo" hoac lien he quan tri vien.',
      503
    );
  }

  return { accountNumber, bankCode, accountHolder };
};

const generateSepayOrderCode = () => {
  const time = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `NAP${time}${rand}`;
};

export const createSepayTopupOrder = async (
  userId: string,
  role: string,
  dto: { amount: number }
) => {
  if (!TOPUP_ALLOWED_ROLES.includes(role)) {
    throw makeError('Vai tro nay khong the nap tien qua SePay', 403);
  }

  const amount = Number(dto.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw makeError('So tien nap khong hop le', 400);
  }

  if (amount > MAX_TOPUP_AMOUNT) {
    throw makeError('So tien nap khong duoc vuot qua 100,000,000 VND', 400);
  }

  const bank = getSepayBankConfig();

  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung', 404);
  }

  const orderCode = generateSepayOrderCode();
  const balanceBefore = Number(user.virtualBalance || 0);

  const transaction = paymentTransactionRepo().create({
    userId: user.id,
    type: 'topup',
    amount,
    status: 'pending',
    paymentMethod: 'sepay',
    orderCode,
    description: `Nap tien qua SePay - ${orderCode}`,
    balanceBefore,
    metadata: JSON.stringify({ source: 'sepay_topup' }),
  } as Partial<PaymentTransaction>);

  const saved = await paymentTransactionRepo().save(transaction);

  const qrBaseUrl = process.env.SEPAY_QR_BASE_URL || 'https://qr.sepay.vn/img';
  const qrUrl = `${qrBaseUrl}?acc=${encodeURIComponent(bank.accountNumber)}&bank=${encodeURIComponent(bank.bankCode)}&amount=${amount}&des=${encodeURIComponent(orderCode)}`;

  logAction({
    category: 'payment',
    action: 'wallet_topup_sepay_created',
    message: `${user.email} tao lenh nap SePay ${amount.toLocaleString('vi-VN')} VND (${orderCode})`,
    userId: user.id,
    targetType: 'PaymentTransaction',
    targetId: saved.id,
    metadata: { amount, orderCode },
  });

  return {
    orderCode,
    transactionId: saved.id,
    amount,
    status: saved.status,
    transferContent: orderCode,
    bank,
    qrUrl,
  };
};

export const getSepayTopupStatus = async (userId: string, orderCode: string) => {
  const transaction = await paymentTransactionRepo().findOne({
    where: { userId, orderCode },
  });

  if (!transaction) {
    throw makeError('Khong tim thay lenh nap tien', 404);
  }

  return {
    orderCode: transaction.orderCode,
    status: transaction.status,
    amount: Number(transaction.amount || 0),
    balanceAfter: transaction.balanceAfter != null ? Number(transaction.balanceAfter) : null,
    completedAt: transaction.completedAt,
  };
};

// Ban demo cua lenh SePay: khong can cau hinh ngan hang that, khong can webhook/tunnel.
// Dung de trai nghiem dung UI quet ma QR ma khong phai chuyen khoan that.
const DEMO_QR_BANK = { accountNumber: '0000000000', bankCode: 'DEMO', accountHolder: 'PREONIC DEMO' };

export const createDemoQrTopupOrder = async (
  userId: string,
  role: string,
  dto: { amount: number }
) => {
  if (!TOPUP_ALLOWED_ROLES.includes(role)) {
    throw makeError('Vai tro nay khong the nap tien demo', 403);
  }

  const amount = Number(dto.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw makeError('So tien nap khong hop le', 400);
  }

  if (amount > MAX_TOPUP_AMOUNT) {
    throw makeError('So tien nap khong duoc vuot qua 100,000,000 VND', 400);
  }

  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung', 404);
  }

  const orderCode = `DEMOQR${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const balanceBefore = Number(user.virtualBalance || 0);

  const transaction = paymentTransactionRepo().create({
    userId: user.id,
    type: 'topup',
    amount,
    status: 'pending',
    paymentMethod: 'demo',
    orderCode,
    description: `Nap tien demo qua QR - ${orderCode}`,
    balanceBefore,
    metadata: JSON.stringify({ source: 'sepay_demo_topup' }),
  } as Partial<PaymentTransaction>);

  const saved = await paymentTransactionRepo().save(transaction);

  const qrBaseUrl = process.env.SEPAY_QR_BASE_URL || 'https://qr.sepay.vn/img';
  const qrUrl = `${qrBaseUrl}?acc=${DEMO_QR_BANK.accountNumber}&bank=${DEMO_QR_BANK.bankCode}&amount=${amount}&des=${encodeURIComponent(orderCode)}`;

  return {
    orderCode,
    transactionId: saved.id,
    amount,
    status: saved.status,
    transferContent: orderCode,
    bank: DEMO_QR_BANK,
    qrUrl,
    isDemo: true,
  };
};

export const confirmDemoQrTopup = async (userId: string, orderCode: string) => {
  const result = await runLockedTransaction(
    async (manager) => {
      // Tat ca thao tac thay doi so du cua User dung cung thu tu lock: User -> PaymentTransaction.
      // Thu tu on dinh nay giup giam deadlock khi nhieu request den dong thoi.
      const user = await lockByIdOrFail(
        manager,
        User,
        userId,
        () => makeError('Khong tim thay nguoi dung', 404)
      );

      const transaction = await lockOneOrFail(
        manager,
        PaymentTransaction,
        {
          userId,
          orderCode,
          paymentMethod: 'demo',
          type: 'topup',
        },
        () => makeError('Khong tim thay lenh nap tien demo', 404)
      );

      if (transaction.status === 'completed') {
        return {
          alreadyProcessed: true,
          orderCode,
          amount: Number(transaction.amount || 0),
          transactionId: transaction.id,
          userId: user.id,
          userEmail: user.email,
        };
      }

      if (transaction.status !== 'pending') {
        throw makeError(
          `Lenh nap tien demo da o trang thai ${transaction.status} va khong the xac nhan`,
          409
        );
      }

      const amount = Number(transaction.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw makeError('So tien cua lenh nap demo khong hop le', 409);
      }

      const balanceBefore = Number(user.virtualBalance || 0);
      const balanceAfter = balanceBefore + amount;

      user.virtualBalance = balanceAfter;
      await manager.getRepository(User).save(user);

      transaction.status = 'completed';
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = balanceAfter;
      transaction.gatewayRef = 'demo_qr';
      transaction.completedAt = new Date();
      await manager.getRepository(PaymentTransaction).save(transaction);

      return {
        alreadyProcessed: false,
        orderCode,
        amount,
        transactionId: transaction.id,
        userId: user.id,
        userEmail: user.email,
      };
    },
    { label: 'wallet.confirmDemoQrTopup' }
  );

  if (result.alreadyProcessed) {
    return { success: true, orderCode, alreadyProcessed: true };
  }

  // Log sau COMMIT de transaction retry do deadlock khong tao log trung.
  logAction({
    category: 'payment',
    action: 'wallet_topup_sepay_demo',
    message: `${result.userEmail} nap ${result.amount.toLocaleString('vi-VN')} VND vao vi qua QR demo (${orderCode})`,
    userId: result.userId,
    targetType: 'PaymentTransaction',
    targetId: result.transactionId,
    metadata: { amount: result.amount, orderCode },
  });

  return { success: true, orderCode, amount: result.amount };
};

const sanitizeSepayWebhookPayload = (payload: any) => ({
  id: payload?.id ?? null,
  gateway: payload?.gateway ?? null,
  transactionDate: payload?.transactionDate ?? payload?.transaction_date ?? null,
  transferType: payload?.transferType ?? payload?.transfer_type ?? null,
  transferAmount: Number(payload?.transferAmount ?? payload?.amount ?? 0) || 0,
  referenceCode: String(
    payload?.referenceCode || payload?.id || payload?.transactionId || ''
  ).slice(0, 255),
  content: String(payload?.content || payload?.description || '').slice(0, 500),
});

const timingSafeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const handleSepayWebhook = async (payload: any, apiKey: string | undefined) => {
  const expectedApiKey = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!expectedApiKey) {
    throw makeError('SePay webhook chua duoc cau hinh API Key', 503);
  }

  if (!apiKey || !timingSafeEqual(apiKey, expectedApiKey)) {
    throw makeError('SePay webhook API Key khong hop le', 401);
  }

  const content: string = String(payload?.content || payload?.description || '').toUpperCase();
  const transferAmount = Number(payload?.transferAmount ?? payload?.amount ?? 0);
  const referenceCode = String(payload?.referenceCode || payload?.id || payload?.transactionId || '');
  const safeWebhook = sanitizeSepayWebhookPayload(payload);

  const match = content.match(/NAP[A-Z0-9]{6,}/);
  if (!match || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    logAction({
      category: 'payment',
      action: 'wallet_topup_sepay_unmatched',
      message: `Webhook SePay khong khop duoc lenh nap tien nao. content="${String(payload?.content || '').slice(0, 200)}"`,
      metadata: { webhook: safeWebhook },
    });
    return { success: false, matched: false };
  }

  const orderCode = match[0];

  // Chi doc so bo de biet User can lock truoc. Trang thai/so tien KHONG duoc tin tu ban doc nay.
  // Moi quyet dinh nghiep vu se duoc re-check sau khi User + PaymentTransaction da bi lock.
  const preliminaryTransaction = await paymentTransactionRepo().findOne({
    where: { orderCode, paymentMethod: 'sepay', type: 'topup' },
  });

  if (!preliminaryTransaction) {
    logAction({
      category: 'payment',
      action: 'wallet_topup_sepay_unmatched',
      message: `Webhook SePay tham chieu lenh khong ton tai: ${orderCode}`,
      metadata: { webhook: safeWebhook, orderCode },
    });
    return { success: false, matched: false };
  }

  const result = await runLockedTransaction(
    async (manager) => {
      // Cung thu tu lock voi cac nghiep vu wallet khac: User -> PaymentTransaction.
      const user = await lockByIdOrFail(
        manager,
        User,
        preliminaryTransaction.userId,
        () => makeError('Khong tim thay nguoi dung cho lenh nap tien nay', 404)
      );

      const transaction = await lockOneOrFail(
        manager,
        PaymentTransaction,
        {
          id: preliminaryTransaction.id,
          orderCode,
          paymentMethod: 'sepay',
          type: 'topup',
        },
        () => makeError('Lenh nap tien SePay khong con ton tai', 404)
      );

      // Bao ve truong hop du lieu bi thay doi bat thuong giua ban doc so bo va transaction.
      if (transaction.userId !== user.id) {
        throw makeError('Lenh nap tien khong khop nguoi dung', 409);
      }

      // Idempotency: webhook thu hai phai doi lock cua webhook thu nhat,
      // sau do doc lai completed va KHONG cong tien lan nua.
      if (transaction.status === 'completed') {
        return {
          alreadyProcessed: true,
          transactionId: transaction.id,
          userId: user.id,
          userEmail: user.email,
          amount: Number(transaction.amount || 0),
          expectedAmount: Number(transaction.amount || 0),
          balanceAfter:
            transaction.balanceAfter != null ? Number(transaction.balanceAfter) : null,
        };
      }

      if (transaction.status !== 'pending') {
        throw makeError(
          `Lenh nap tien SePay da o trang thai ${transaction.status} va khong the xu ly`,
          409
        );
      }

      const expectedAmount = Number(transaction.amount || 0);
      const balanceBefore = Number(user.virtualBalance || 0);
      const balanceAfter = balanceBefore + transferAmount;

      user.virtualBalance = balanceAfter;
      await manager.getRepository(User).save(user);

      transaction.status = 'completed';
      // SePay la nguon su that cua so tien da chuyen. Neu nguoi dung chuyen lech so tien QR,
      // van ghi nhan dung so tien ngan hang thong bao va luu expectedAmount de doi soat.
      transaction.amount = transferAmount;
      transaction.balanceBefore = balanceBefore;
      transaction.balanceAfter = balanceAfter;
      transaction.gatewayRef = referenceCode || (null as any);
      transaction.completedAt = new Date();
      transaction.metadata = JSON.stringify({
        source: 'sepay_topup',
        expectedAmount,
        receivedAmount: transferAmount,
        amountMatched: expectedAmount === transferAmount,
        referenceCode: referenceCode || null,
        webhook: safeWebhook,
      });
      await manager.getRepository(PaymentTransaction).save(transaction);

      return {
        alreadyProcessed: false,
        transactionId: transaction.id,
        userId: user.id,
        userEmail: user.email,
        amount: transferAmount,
        expectedAmount,
        balanceAfter,
      };
    },
    { label: 'wallet.sepayWebhook' }
  );

  if (result.alreadyProcessed) {
    return { success: true, matched: true, orderCode, alreadyProcessed: true };
  }

  // Log sau COMMIT. Khong log payload ngan hang day du de tranh luu thong tin nhay cam khong can thiet.
  logAction({
    category: 'payment',
    action: 'wallet_topup_sepay',
    message: `${result.userEmail} nap ${result.amount.toLocaleString('vi-VN')} VND vao vi qua SePay (${orderCode})`,
    userId: result.userId,
    targetType: 'PaymentTransaction',
    targetId: result.transactionId,
    metadata: {
      amount: result.amount,
      expectedAmount: result.expectedAmount,
      amountMatched: result.amount === result.expectedAmount,
      orderCode,
      referenceCode,
    },
  });

  return { success: true, matched: true, orderCode, amount: result.amount };
};
