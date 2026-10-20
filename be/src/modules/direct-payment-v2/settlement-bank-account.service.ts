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
import {
  getBankAccountVerificationCapability,
  normalizeAccountHolderForMatch,
  verifyBankAccount,
} from './bank-account-verification.service';
import {
  normalizeSettlementBankCode,
  normalizeSettlementBankName,
  normalizeSettlementAccountHolder,
  normalizeSettlementAccountNumber,
} from './bank-account-input';

export interface SaveFarmerBankAccountInput {
  bankCode: string;
  bankName?: string;
  accountHolder: string;
  accountNumber: string;
  makeDefault?: boolean;
}

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
  verificationStatus: account.verificationStatus,
  verifiedAccountHolder: account.verifiedAccountHolder,
  verificationProvider: account.verificationProvider,
  verificationReference: account.verificationReference,
  verifiedAt: account.verifiedAt,
  adminReviewedBy: account.adminReviewedBy,
  adminReviewedAt: account.adminReviewedAt,
  adminReviewNote: account.adminReviewNote,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

export const getFarmerBankAccountVerificationCapability = () =>
  getBankAccountVerificationCapability();

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

const promoteVerifiedDefaultIfMissing = async (
  manager: EntityManager,
  userId: string,
  excludedAccountId?: string
) => {
  const repo = manager.getRepository(UserSettlementBankAccount);
  const currentDefault = await repo.findOne({
    where: {
      userId,
      status: 'active',
      verificationStatus: 'verified',
      isDefault: true,
    },
  });
  if (currentDefault) return;

  const qb = repo
    .createQueryBuilder('account')
    .where('account.userId = :userId', { userId })
    .andWhere("account.status = 'active'")
    .andWhere("account.verificationStatus = 'verified'");
  if (excludedAccountId) qb.andWhere('account.id <> :excludedAccountId', { excludedAccountId });
  const replacement = await qb.orderBy('account.createdAt', 'ASC').getOne();
  if (!replacement) return;

  await repo
    .createQueryBuilder()
    .update(UserSettlementBankAccount)
    .set({ isDefault: false })
    .where('UserId = :userId', { userId })
    .execute();
  replacement.isDefault = true;
  await repo.save(replacement);
};

export const verifyFarmerSettlementBankAccount = async (input: SaveFarmerBankAccountInput) => {
  normalizeSettlementBankCode(input.bankCode);
  normalizeSettlementAccountHolder(input.accountHolder);
  normalizeSettlementAccountNumber(input.accountNumber);
  return {
    status: 'unavailable' as const,
    valid: null,
    accountHolder: null,
    provider: null,
    reference: null,
    nameMatches: null,
    message: 'Hãy lưu yêu cầu để quản trị viên duyệt trước. Sau khi được duyệt, bạn liên kết tài khoản trên SePay rồi yêu cầu hệ thống kiểm tra.',
  };
};

export const saveFarmerSettlementBankAccount = async (
  userId: string,
  input: SaveFarmerBankAccountInput
) => {
  const bankCode = normalizeSettlementBankCode(input.bankCode);
  const bankName = normalizeSettlementBankName(input.bankName, bankCode);
  const accountHolder = normalizeSettlementAccountHolder(input.accountHolder);
  const accountNumber = normalizeSettlementAccountNumber(input.accountNumber);
  const cryptoConfig = getCryptoConfig();

  let encrypted;
  try {
    encrypted = encryptBankAccountNumber({
      accountNumber,
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

  return runLockedTransaction(async (manager) => {
    await assertFarmer(manager, userId);
    const repo = manager.getRepository(UserSettlementBankAccount);
    let account = await repo.findOne({
      where: {
        userId,
        accountNumberFingerprint: encrypted.fingerprint,
      },
    });

    const preserveExistingVerification = Boolean(
      account
      && account.verificationStatus === 'verified'
      && account.bankCode === bankCode
      && normalizeAccountHolderForMatch(account.accountHolder) === normalizeAccountHolderForMatch(accountHolder)
    );
    const isVerified = preserveExistingVerification;
    const verifiedDefault = await repo.findOne({
      where: {
        userId,
        status: 'active',
        verificationStatus: 'verified',
        isDefault: true,
      },
    });
    const shouldBeDefault = isVerified && (Boolean(input.makeDefault) || !verifiedDefault);

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
        verificationStatus: 'pending_admin_review',
        verifiedAccountHolder: null,
        verificationProvider: null,
        verificationReference: null,
        verifiedAt: null,
        adminReviewedBy: null,
        adminReviewedAt: null,
        adminReviewNote: null,
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
      account.verificationStatus = isVerified ? 'verified' : 'pending_admin_review';
      if (!preserveExistingVerification) {
        account.verifiedAccountHolder = null;
        account.verificationProvider = null;
        account.verificationReference = null;
        account.verifiedAt = null;
        account.adminReviewedBy = null;
        account.adminReviewedAt = null;
        account.adminReviewNote = null;
      }
      if (shouldBeDefault) account.isDefault = true;
      if (!isVerified) account.isDefault = false;
    }

    const saved = await repo.save(account);
    if (!saved.isDefault) {
      await promoteVerifiedDefaultIfMissing(manager, userId, saved.id);
    }
    return sanitize(saved);
  }, { label: 'paymentV2.saveFarmerBankAccount' });
};

export const reverifyFarmerSettlementBankAccount = async (
  userId: string,
  bankAccountId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
  if (!user) throw makeError('Không tìm thấy người dùng', 404);
  if (user.role !== 'farmer') {
    throw makeError('Chỉ tài khoản nông dân mới xác minh tài khoản nhận tiền', 403);
  }

  const stored = await AppDataSource.getRepository(UserSettlementBankAccount)
    .createQueryBuilder('account')
    .addSelect('account.accountNumberCiphertext')
    .addSelect('account.accountNumberIv')
    .addSelect('account.accountNumberAuthTag')
    .addSelect('account.accountNumberFingerprint')
    .where('account.id = :bankAccountId', { bankAccountId })
    .andWhere('account.userId = :userId', { userId })
    .andWhere("account.status = 'active'")
    .getOne();
  if (!stored) throw makeError('Không tìm thấy tài khoản ngân hàng đang hoạt động', 404);
  if (!['awaiting_sepay_link', 'failed'].includes(stored.verificationStatus)) {
    if (stored.verificationStatus === 'verified') {
      throw makeError('Tài khoản đã được xác minh', 409);
    }
    throw makeError('Tài khoản cần được quản trị viên duyệt trước khi kiểm tra với SePay', 409);
  }

  const cryptoConfig = getCryptoConfig();
  let accountNumber: string;
  try {
    accountNumber = decryptBankAccountNumber({
      ciphertext: stored.accountNumberCiphertext,
      iv: stored.accountNumberIv,
      authTag: stored.accountNumberAuthTag,
      userId,
      bankCode: stored.bankCode,
      encryptionKeyBase64: cryptoConfig.encryptionKeyBase64,
    });
  } catch {
    throw makeError('Không thể giải mã tài khoản nhận tiền. Vui lòng cấu hình lại tài khoản.', 500);
  }

  const verification = await verifyBankAccount(stored.bankCode, accountNumber);
  if (verification.status === 'unavailable') {
    throw makeError(verification.message, 503);
  }
  const nameMatches = verification.accountHolder
    ? normalizeAccountHolderForMatch(verification.accountHolder) === normalizeAccountHolderForMatch(stored.accountHolder)
    : false;
  const verified = verification.status === 'verified' && nameMatches;

  const account = await runLockedTransaction(async (manager) => {
    await assertFarmer(manager, userId);
    const repo = manager.getRepository(UserSettlementBankAccount);
    const current = await repo
      .createQueryBuilder('account')
      .addSelect('account.accountNumberFingerprint')
      .where('account.id = :bankAccountId', { bankAccountId })
      .andWhere('account.userId = :userId', { userId })
      .setLock('pessimistic_write')
      .getOne();
    if (!current || current.status !== 'active') {
      throw makeError('Tài khoản ngân hàng không còn hoạt động', 409);
    }
    if (!['awaiting_sepay_link', 'failed'].includes(current.verificationStatus)) {
      throw makeError('Trạng thái xác minh vừa thay đổi, vui lòng tải lại', 409);
    }
    if (
      current.accountNumberFingerprint !== stored.accountNumberFingerprint
      || current.bankCode !== stored.bankCode
      || normalizeAccountHolderForMatch(current.accountHolder)
        !== normalizeAccountHolderForMatch(stored.accountHolder)
    ) {
      throw makeError('Thông tin tài khoản vừa thay đổi, vui lòng xác minh lại', 409);
    }

    current.verificationStatus = verified ? 'verified' : 'failed';
    current.verifiedAccountHolder = verification.accountHolder;
    current.verificationProvider = verification.provider;
    current.verificationReference = verification.reference;
    current.verifiedAt = verified ? new Date() : null;
    if (!verified) current.isDefault = false;

    const saved = await repo.save(current);
    if (verified) {
      await promoteVerifiedDefaultIfMissing(manager, userId);
    } else {
      await promoteVerifiedDefaultIfMissing(manager, userId, saved.id);
    }
    return (await repo.findOne({ where: { id: saved.id } })) || saved;
  }, { label: 'paymentV2.reverifyFarmerBankAccount' });

  return {
    account: sanitize(account),
    verification: {
      ...verification,
      status: verified ? 'verified' as const : 'failed' as const,
      valid: verified,
      nameMatches,
      message: verified
        ? verification.message
        : verification.status === 'verified' && !nameMatches
          ? `Tên chủ tài khoản không khớp. Tên xác minh từ ngân hàng là ${verification.accountHolder}.`
          : verification.message,
    },
  };
};

export interface AdminBankAccountFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const ADMIN_REVIEW_STATUSES = new Set([
  'pending_admin_review',
  'awaiting_sepay_link',
  'verified',
  'rejected',
  'failed',
]);

export const listSettlementBankAccountsForAdmin = async (
  filters: AdminBankAccountFilters = {}
) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const qb = AppDataSource.getRepository(UserSettlementBankAccount)
    .createQueryBuilder('account')
    .leftJoinAndSelect('account.user', 'user')
    .leftJoinAndSelect('account.adminReviewer', 'adminReviewer')
    .where("user.role = 'farmer'")
    // Disabled accounts are retained only as immutable history for completed
    // payments. They must never re-enter the admin verification workflow.
    .andWhere("account.status = 'active'");

  if (filters.status && ADMIN_REVIEW_STATUSES.has(filters.status)) {
    qb.andWhere('account.verificationStatus = :status', { status: filters.status });
  }
  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere(
      '(user.fullName LIKE :search OR user.email LIKE :search OR account.bankName LIKE :search OR account.maskedAccountNumber LIKE :search)',
      { search }
    );
  }

  // TypeORM parses dotted identifiers inside a raw CASE expression as an
  // alias path. With MSSQL pagination + joins this throws before the query is
  // executed ("CASE WHEN account" alias was not found). The admin screen
  // already filters pending reviews by default, so stable newest-first
  // ordering is both sufficient and compatible with getManyAndCount().
  qb.orderBy('account.updatedAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);
  const [rows, total] = await qb.getManyAndCount();
  return {
    accounts: rows.map((account) => ({
      ...sanitize(account),
      farmer: account.user ? {
        id: account.user.id,
        fullName: account.user.fullName,
        email: account.user.email,
        phone: account.user.phone,
      } : null,
      adminReviewer: account.adminReviewer ? {
        id: account.adminReviewer.id,
        fullName: account.adminReviewer.fullName,
      } : null,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const reviewSettlementBankAccountByAdmin = async (
  adminUserId: string,
  bankAccountId: string,
  decision: 'approve' | 'reject',
  note?: string
) => runLockedTransaction(async (manager) => {
  const admin = await lockByIdOrFail(
    manager,
    User,
    adminUserId,
    () => makeError('Không tìm thấy quản trị viên', 404)
  );
  if (admin.role !== 'admin' || !admin.isActive) {
    throw makeError('Không có quyền duyệt tài khoản ngân hàng', 403);
  }

  const repo = manager.getRepository(UserSettlementBankAccount);
  const account = await lockOneOrFail(
    manager,
    UserSettlementBankAccount,
    { id: bankAccountId },
    () => makeError('Không tìm thấy yêu cầu xác minh tài khoản', 404)
  );
  if (account.status !== 'active') {
    throw makeError('Tài khoản ngân hàng đã bị vô hiệu hóa', 409);
  }
  if (account.verificationStatus !== 'pending_admin_review') {
    throw makeError('Yêu cầu này đã được xử lý hoặc không còn chờ duyệt', 409);
  }

  const normalizedNote = String(note || '').replace(/\s+/g, ' ').trim().slice(0, 500) || null;
  if (decision === 'reject' && !normalizedNote) {
    throw makeError('Cần nhập lý do từ chối', 400);
  }

  account.verificationStatus = decision === 'approve' ? 'awaiting_sepay_link' : 'rejected';
  account.adminReviewedBy = adminUserId;
  account.adminReviewedAt = new Date();
  account.adminReviewNote = normalizedNote;
  account.isDefault = false;
  account.verifiedAccountHolder = null;
  account.verificationProvider = null;
  account.verificationReference = null;
  account.verifiedAt = null;
  return sanitize(await repo.save(account));
}, { label: 'paymentV2.reviewSettlementBankAccount' });

export const verifySettlementBankAccountByAdmin = async (
  adminUserId: string,
  bankAccountId: string
) => {
  const [admin, account] = await Promise.all([
    AppDataSource.getRepository(User).findOne({ where: { id: adminUserId } }),
    AppDataSource.getRepository(UserSettlementBankAccount).findOne({ where: { id: bankAccountId } }),
  ]);
  if (!admin || admin.role !== 'admin' || !admin.isActive) {
    throw makeError('Không có quyền đối chiếu tài khoản ngân hàng', 403);
  }
  if (!account) throw makeError('Không tìm thấy tài khoản ngân hàng', 404);
  if (!['awaiting_sepay_link', 'failed'].includes(account.verificationStatus)) {
    throw makeError('Tài khoản chưa được duyệt hoặc đã hoàn tất xác minh', 409);
  }
  return reverifyFarmerSettlementBankAccount(account.userId, account.id);
};

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
  if (account.verificationStatus !== 'verified') {
    throw makeError('Tài khoản cần được xác minh trước khi đặt làm mặc định', 409);
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
      where: { userId, status: 'active', verificationStatus: 'verified' },
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

  // Tiền hàng chỉ được chuyển đến tài khoản có bằng chứng xác minh, bất kể
  // môi trường có đang cho phép lưu nháp tài khoản chưa xác minh hay không.
  qb.andWhere("account.verificationStatus = 'verified'");

  if (where.id) qb.andWhere('account.id = :id', { id: where.id });
  if (where.isDefault) qb.andWhere('account.isDefault = 1');

  const account = await qb.getOne();
  if (!account) {
    throw makeError('Nông dân chưa có tài khoản nhận tiền mặc định đã xác minh', 422);
  }
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
