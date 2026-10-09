import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { User } from '../../models/User.entity';
import { UserSettlementBankAccount } from '../../models/UserSettlementBankAccount.entity';
import { makeError } from '../../utils/error.util';
import {
  lockByIdOrFail,
  lockOneOrFail,
  runLockedTransaction,
} from '../../utils/transaction-lock.util';
import {
  decryptBankAccountNumber,
  encryptBankAccountNumber,
} from './bank-account-crypto';

export interface SaveFarmerBankAccountInput {
  bankCode: string;
  bankName?: string;
  accountHolder: string;
  accountNumber: string;
  makeDefault?: boolean;
}

const normalizeText = (value: string, field: string, maxLength: number): string => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw makeError(`${field} không hợp lệ`, 400);
  }
  return normalized;
};

const normalizeBankCode = (value: string): string => {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9._-]{2,30}$/.test(code)) {
    throw makeError('Mã ngân hàng không hợp lệ', 400);
  }
  return code;
};

const getCryptoConfig = () => {
  const encryptionKeyBase64 = process.env.PAYMENT_BANK_DATA_ENCRYPTION_KEY || '';
  const hmacKeyBase64 = process.env.PAYMENT_BANK_DATA_HMAC_KEY || '';
  const keyVersion = Number(process.env.PAYMENT_BANK_DATA_ACTIVE_KEY_VERSION || 1);

  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw makeError('PAYMENT_BANK_DATA_ACTIVE_KEY_VERSION không hợp lệ', 500);
  }

  return { encryptionKeyBase64, hmacKeyBase64, keyVersion };
};

const sanitize = (account: UserSettlementBankAccount) => ({
  id: account.id,
  userId: account.userId,
  bankCode: account.bankCode,
  bankName: account.bankName,
  accountHolder: account.accountHolder,
  maskedAccountNumber: account.maskedAccountNumber,
  isDefault: account.isDefault,
  status: account.status,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

const assertFarmer = async (manager: EntityManager, userId: string): Promise<User> => {
  const user = await lockByIdOrFail(
    manager,
    User,
    userId,
    () => makeError('Không tìm thấy người dùng', 404)
  );

  if (user.role !== 'farmer') {
    throw makeError('Chỉ tài khoản nông dân mới cấu hình tài khoản nhận tiền hàng', 403);
  }

  if (!user.isActive) {
    throw makeError('Tài khoản người dùng đang bị vô hiệu hóa', 403);
  }

  return user;
};


const hasInFlightPaymentUsingAccount = async (
  manager: EntityManager,
  bankAccountId: string
): Promise<boolean> => {
  const count = await manager
    .getRepository(DirectGoodsPayment)
    .createQueryBuilder('payment')
    .where('payment.BankAccountId = :bankAccountId', { bankAccountId })
    .andWhere(
      "payment.Status IN ('planned','payable','awaiting_payment','awaiting_confirmation','disputed')"
    )
    .getCount();

  return count > 0;
};

export const saveFarmerSettlementBankAccount = async (
  userId: string,
  input: SaveFarmerBankAccountInput
) => runLockedTransaction(async (manager) => {
  await assertFarmer(manager, userId);

  const bankCode = normalizeBankCode(input.bankCode);
  const bankName = input.bankName
    ? normalizeText(input.bankName, 'Tên ngân hàng', 100)
    : null;
  const accountHolder = normalizeText(input.accountHolder, 'Tên chủ tài khoản', 150);
  const cryptoConfig = getCryptoConfig();

  let encrypted;
  try {
    encrypted = encryptBankAccountNumber({
      accountNumber: input.accountNumber,
      userId,
      bankCode,
      encryptionKeyBase64: cryptoConfig.encryptionKeyBase64,
      hmacKeyBase64: cryptoConfig.hmacKeyBase64,
      encryptionKeyVersion: cryptoConfig.keyVersion,
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('PAYMENT_BANK_DATA_')) {
      throw makeError('Cấu hình mã hóa dữ liệu ngân hàng chưa hợp lệ', 500);
    }
    throw makeError('Số tài khoản ngân hàng không hợp lệ', 400);
  }

  const repo = manager.getRepository(UserSettlementBankAccount);
  let account = await repo.findOne({
    where: {
      userId,
      accountNumberFingerprint: encrypted.fingerprint,
    },
  });

  const activeCount = await repo.count({
    where: { userId, status: 'active' },
  });
  const shouldBeDefault = Boolean(input.makeDefault) || activeCount === 0;

  if (shouldBeDefault) {
    await repo
      .createQueryBuilder()
      .update(UserSettlementBankAccount)
      .set({ isDefault: false })
      .where('UserId = :userId', { userId })
      .execute();
  }

  if (!account) {
    account = repo.create({
      userId,
      bankCode,
      bankName,
      accountHolder,
      accountNumberCiphertext: encrypted.ciphertext,
      accountNumberIv: encrypted.iv,
      accountNumberAuthTag: encrypted.authTag,
      encryptionKeyVersion: encrypted.encryptionKeyVersion,
      accountNumberFingerprint: encrypted.fingerprint,
      maskedAccountNumber: encrypted.maskedAccountNumber,
      isDefault: shouldBeDefault,
      status: 'active',
    });
  } else {
    if (
      account.accountHolder !== accountHolder &&
      await hasInFlightPaymentUsingAccount(manager, account.id)
    ) {
      throw makeError(
        'Không thể đổi tên chủ tài khoản khi tài khoản đang được dùng cho khoản thanh toán chưa hoàn tất',
        409
      );
    }

    account.bankCode = bankCode;
    account.bankName = bankName;
    account.accountHolder = accountHolder;
    account.accountNumberCiphertext = encrypted.ciphertext;
    account.accountNumberIv = encrypted.iv;
    account.accountNumberAuthTag = encrypted.authTag;
    account.encryptionKeyVersion = encrypted.encryptionKeyVersion;
    account.maskedAccountNumber = encrypted.maskedAccountNumber;
    account.status = 'active';
    if (shouldBeDefault) account.isDefault = true;
  }

  return sanitize(await repo.save(account));
}, { label: 'paymentV2.saveFarmerBankAccount' });

export const listFarmerSettlementBankAccounts = async (userId: string) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
  if (!user) throw makeError('Không tìm thấy người dùng', 404);
  if (user.role !== 'farmer') {
    throw makeError('Chỉ tài khoản nông dân mới có tài khoản nhận tiền hàng', 403);
  }

  const accounts = await AppDataSource.getRepository(UserSettlementBankAccount).find({
    where: { userId },
    order: { isDefault: 'DESC', createdAt: 'DESC' },
  });

  return accounts.map(sanitize);
};

export const setDefaultFarmerSettlementBankAccount = async (
  userId: string,
  bankAccountId: string
) => runLockedTransaction(async (manager) => {
  await assertFarmer(manager, userId);

  const repo = manager.getRepository(UserSettlementBankAccount);
  const account = await lockOneOrFail(
    manager,
    UserSettlementBankAccount,
    { id: bankAccountId, userId },
    () => makeError('Không tìm thấy tài khoản ngân hàng', 404)
  );

  if (account.status !== 'active') {
    throw makeError('Không thể đặt tài khoản đã vô hiệu hóa làm tài khoản mặc định', 409);
  }

  await repo
    .createQueryBuilder()
    .update(UserSettlementBankAccount)
    .set({ isDefault: false })
    .where('UserId = :userId', { userId })
    .execute();

  account.isDefault = true;
  return sanitize(await repo.save(account));
}, { label: 'paymentV2.setDefaultFarmerBankAccount' });

export const disableFarmerSettlementBankAccount = async (
  userId: string,
  bankAccountId: string
) => runLockedTransaction(async (manager) => {
  await assertFarmer(manager, userId);

  const repo = manager.getRepository(UserSettlementBankAccount);
  const account = await lockOneOrFail(
    manager,
    UserSettlementBankAccount,
    { id: bankAccountId, userId },
    () => makeError('Không tìm thấy tài khoản ngân hàng', 404)
  );

  if (account.status === 'disabled') return sanitize(account);

  if (await hasInFlightPaymentUsingAccount(manager, bankAccountId)) {
    throw makeError(
      'Tài khoản ngân hàng đang được dùng cho một khoản thanh toán chưa hoàn tất',
      409
    );
  }

  const wasDefault = account.isDefault;
  account.status = 'disabled';
  account.isDefault = false;
  await repo.save(account);

  if (wasDefault) {
    const replacement = await repo.findOne({
      where: { userId, status: 'active' },
      order: { createdAt: 'ASC' },
    });
    if (replacement) {
      replacement.isDefault = true;
      await repo.save(replacement);
    }
  }

  return sanitize(account);
}, { label: 'paymentV2.disableFarmerBankAccount' });

const loadSensitiveAccount = async (
  manager: EntityManager,
  where: { id?: string; userId: string; isDefault?: boolean }
): Promise<UserSettlementBankAccount> => {
  const qb = manager
    .getRepository(UserSettlementBankAccount)
    .createQueryBuilder('account')
    .addSelect('account.accountNumberCiphertext')
    .addSelect('account.accountNumberIv')
    .addSelect('account.accountNumberAuthTag')
    .addSelect('account.accountNumberFingerprint')
    .where('account.userId = :userId', { userId: where.userId })
    .andWhere("account.status = 'active'");

  if (where.id) qb.andWhere('account.id = :id', { id: where.id });
  if (where.isDefault) qb.andWhere('account.isDefault = 1');

  const account = await qb.getOne();
  if (!account) throw makeError('Nông dân chưa có tài khoản nhận tiền hợp lệ', 422);
  return account;
};

export const getDefaultFarmerBankAccountForPaymentWithManager = async (
  manager: EntityManager,
  farmerId: string
) => {
  const account = await loadSensitiveAccount(manager, {
    userId: farmerId,
    isDefault: true,
  });

  const cryptoConfig = getCryptoConfig();
  if (account.encryptionKeyVersion !== cryptoConfig.keyVersion) {
    throw makeError(
      'Tài khoản ngân hàng đang dùng khóa mã hóa cũ và cần được cập nhật trước khi thanh toán',
      409
    );
  }

  let accountNumber: string;
  try {
    accountNumber = decryptBankAccountNumber({
      ciphertext: account.accountNumberCiphertext,
      iv: account.accountNumberIv,
      authTag: account.accountNumberAuthTag,
      userId: farmerId,
      bankCode: account.bankCode,
      encryptionKeyBase64: cryptoConfig.encryptionKeyBase64,
    });
  } catch {
    throw makeError('Không thể giải mã tài khoản nhận tiền. Vui lòng cấu hình lại tài khoản.', 500);
  }

  return {
    entity: account,
    accountNumber,
  };
};

export const getBankAccountForPaymentWithManager = async (
  manager: EntityManager,
  farmerId: string,
  bankAccountId: string
) => {
  const account = await loadSensitiveAccount(manager, {
    userId: farmerId,
    id: bankAccountId,
  });

  const cryptoConfig = getCryptoConfig();
  if (account.encryptionKeyVersion !== cryptoConfig.keyVersion) {
    throw makeError('Tài khoản ngân hàng cần được cập nhật khóa mã hóa', 409);
  }

  let accountNumber: string;
  try {
    accountNumber = decryptBankAccountNumber({
      ciphertext: account.accountNumberCiphertext,
      iv: account.accountNumberIv,
      authTag: account.accountNumberAuthTag,
      userId: farmerId,
      bankCode: account.bankCode,
      encryptionKeyBase64: cryptoConfig.encryptionKeyBase64,
    });
  } catch {
    throw makeError('Không thể giải mã tài khoản nhận tiền', 500);
  }

  return { entity: account, accountNumber };
};
