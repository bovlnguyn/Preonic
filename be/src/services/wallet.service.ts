import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { PaymentTransaction } from '../models/PaymentTransaction.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';
import { logAction, logError } from './systemLog.service';
import crypto from 'crypto';

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
  'withdraw',
  'escrow_deposit',
  'escrow_release',
  'refund',
] as const;

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

  const user = await userRepo().findOne({
    where: { id: userId },
  });

  if (!user) {
    throw makeError('Khong tim thay nguoi dung', 404);
  }

  if (!TOPUP_ALLOWED_ROLES.includes(user.role)) {
    throw makeError('Vai tro nay khong the nap tien demo', 403);
  }

  const balanceBefore = Number(user.virtualBalance || 0);
  const balanceAfter = balanceBefore + amount;
  const orderCode = `TOPUP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let savedTransaction: PaymentTransaction;
  try {
    savedTransaction = await AppDataSource.transaction(async (manager) => {
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

      return manager.getRepository(PaymentTransaction).save(transaction);
    });
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'wallet_topup_failed',
      message: `Loi nap tien vi cho user ${user.email}: ${err.message || err}`,
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
      metadata: { amount, orderCode },
      error: err,
    });
    throw err;
  }

  logAction({
    category: 'payment',
    action: 'wallet_topup',
    message: `${user.email} nap ${amount.toLocaleString('vi-VN')} VND vao vi (demo)`,
    userId: user.id,
    targetType: 'PaymentTransaction',
    targetId: savedTransaction.id,
    metadata: { amount, orderCode },
  });

  return {
    wallet: {
      balance: balanceAfter,
      currency: 'VND',
    },
    transaction: {
      id: savedTransaction.id,
      type: savedTransaction.type,
      amount: Number(savedTransaction.amount || 0),
      status: savedTransaction.status,
      paymentMethod: savedTransaction.paymentMethod,
      orderCode: savedTransaction.orderCode,
      description: savedTransaction.description,
      balanceBefore: Number(savedTransaction.balanceBefore || 0),
      balanceAfter: Number(savedTransaction.balanceAfter || 0),
      createdAt: savedTransaction.createdAt,
      completedAt: savedTransaction.completedAt,
    },
  };
};

export const demoWithdrawWallet = async (
  userId: string,
  role: string,
  dto: { amount: number; note?: string }
) => {
  if (!TOPUP_ALLOWED_ROLES.includes(role)) {
    throw makeError('Vai tro nay khong the rut tien demo', 403);
  }

  const amount = Number(dto.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw makeError('So tien rut khong hop le', 400);
  }

  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung', 404);
  }

  const balanceBefore = Number(user.virtualBalance || 0);
  if (amount > balanceBefore) {
    throw makeError('So du vi khong du de rut', 400);
  }

  const balanceAfter = balanceBefore - amount;
  const orderCode = `RUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let savedTransaction: PaymentTransaction;
  try {
    savedTransaction = await AppDataSource.transaction(async (manager) => {
      user.virtualBalance = balanceAfter;
      await manager.getRepository(User).save(user);

      const transaction = manager.getRepository(PaymentTransaction).create({
        userId: user.id,
        type: 'withdraw',
        amount,
        status: 'completed',
        paymentMethod: 'demo',
        gatewayRef: orderCode,
        orderCode,
        description: dto.note?.trim() || 'Rut tien demo tu vi ao',
        balanceBefore,
        balanceAfter,
        metadata: JSON.stringify({ source: 'demo_withdraw', createdBy: user.id }),
        completedAt: new Date(),
      } as Partial<PaymentTransaction>);

      return manager.getRepository(PaymentTransaction).save(transaction);
    });
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'wallet_withdraw_failed',
      message: `Loi rut tien vi cho user ${user.email}: ${err.message || err}`,
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
      metadata: { amount, orderCode },
      error: err,
    });
    throw err;
  }

  logAction({
    category: 'payment',
    action: 'wallet_withdraw',
    message: `${user.email} rut ${amount.toLocaleString('vi-VN')} VND khoi vi (demo)`,
    userId: user.id,
    targetType: 'PaymentTransaction',
    targetId: savedTransaction.id,
    metadata: { amount, orderCode },
  });

  return {
    wallet: {
      balance: balanceAfter,
      currency: 'VND',
    },
    transaction: {
      id: savedTransaction.id,
      type: savedTransaction.type,
      amount: Number(savedTransaction.amount || 0),
      status: savedTransaction.status,
      paymentMethod: savedTransaction.paymentMethod,
      orderCode: savedTransaction.orderCode,
      description: savedTransaction.description,
      balanceBefore: Number(savedTransaction.balanceBefore || 0),
      balanceAfter: Number(savedTransaction.balanceAfter || 0),
      createdAt: savedTransaction.createdAt,
      completedAt: savedTransaction.completedAt,
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
  const transaction = await paymentTransactionRepo().findOne({
    where: { userId, orderCode, paymentMethod: 'demo' },
  });

  if (!transaction) {
    throw makeError('Khong tim thay lenh nap tien demo', 404);
  }

  if (transaction.status === 'completed') {
    return { success: true, orderCode, alreadyProcessed: true };
  }

  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung', 404);
  }

  const balanceBefore = Number(user.virtualBalance || 0);
  const balanceAfter = balanceBefore + Number(transaction.amount || 0);

  await AppDataSource.transaction(async (manager) => {
    user.virtualBalance = balanceAfter;
    await manager.getRepository(User).save(user);

    transaction.status = 'completed';
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceAfter;
    transaction.gatewayRef = 'demo_qr';
    transaction.completedAt = new Date();
    await manager.getRepository(PaymentTransaction).save(transaction);
  });

  logAction({
    category: 'payment',
    action: 'wallet_topup_sepay_demo',
    message: `${user.email} nap ${Number(transaction.amount).toLocaleString('vi-VN')} VND vao vi qua QR demo (${orderCode})`,
    userId: user.id,
    targetType: 'PaymentTransaction',
    targetId: transaction.id,
    metadata: { amount: transaction.amount, orderCode },
  });

  return { success: true, orderCode, amount: Number(transaction.amount || 0) };
};

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

  const match = content.match(/NAP[A-Z0-9]{6,}/);
  if (!match || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    logAction({
      category: 'payment',
      action: 'wallet_topup_sepay_unmatched',
      message: `Webhook SePay khong khop duoc lenh nap tien nao. content="${payload?.content || ''}"`,
      metadata: { payload },
    });
    return { success: false, matched: false };
  }

  const orderCode = match[0];

  const transaction = await paymentTransactionRepo().findOne({
    where: { orderCode, paymentMethod: 'sepay' },
  });

  if (!transaction) {
    logAction({
      category: 'payment',
      action: 'wallet_topup_sepay_unmatched',
      message: `Webhook SePay tham chieu lenh khong ton tai: ${orderCode}`,
      metadata: { payload, orderCode },
    });
    return { success: false, matched: false };
  }

  if (transaction.status === 'completed') {
    return { success: true, matched: true, orderCode, alreadyProcessed: true };
  }

  const user = await userRepo().findOne({ where: { id: transaction.userId } });
  if (!user) {
    throw makeError('Khong tim thay nguoi dung cho lenh nap tien nay', 404);
  }

  const balanceBefore = Number(user.virtualBalance || 0);
  const balanceAfter = balanceBefore + transferAmount;

  await AppDataSource.transaction(async (manager) => {
    user.virtualBalance = balanceAfter;
    await manager.getRepository(User).save(user);

    transaction.status = 'completed';
    transaction.amount = transferAmount;
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceAfter;
    transaction.gatewayRef = referenceCode || null as any;
    transaction.completedAt = new Date();
    transaction.metadata = JSON.stringify({ source: 'sepay_topup', webhook: payload });
    await manager.getRepository(PaymentTransaction).save(transaction);
  });

  logAction({
    category: 'payment',
    action: 'wallet_topup_sepay',
    message: `${user.email} nap ${transferAmount.toLocaleString('vi-VN')} VND vao vi qua SePay (${orderCode})`,
    userId: user.id,
    targetType: 'PaymentTransaction',
    targetId: transaction.id,
    metadata: { amount: transferAmount, orderCode, referenceCode },
  });

  return { success: true, matched: true, orderCode, amount: transferAmount };
};
