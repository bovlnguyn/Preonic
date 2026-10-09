import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Contract } from '../../models/Contract.entity';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { PlatformFeeLedgerEntry } from '../../models/PlatformFeeLedgerEntry.entity';
import { User } from '../../models/User.entity';
import { makeError } from '../../utils/error.util';
import {
  lockByIdOrFail,
  lockManyByIds,
  lockOne,
  runLockedTransaction,
} from '../../utils/transaction-lock.util';
import { GoodsPaymentTrigger } from './types';
import { buildDirectPaymentPlan } from './payment-plan';
import { getOrCreateContractFeeTermsWithManager } from './contract-fee-terms.service';
import {
  createPendingTransactionFeesWithManager,
  ensureFeeAccountWithManager,
  postPendingFeesForPaymentWithManager,
  voidPendingFeesForPaymentWithManager,
} from './fee-ledger.service';
import {
  getBankAccountForPaymentWithManager,
  getDefaultFarmerBankAccountForPaymentWithManager,
} from './settlement-bank-account.service';
import { calculateFeeVnd } from './fee-calculator';

const ACTIVE_CONTRACT_STATUSES = new Set(['active']);

const assertDirectContractReadyForPayment = (contract: Contract): void => {
  if (contract.paymentFlow !== 'direct_v2') {
    throw makeError('Hợp đồng này không sử dụng luồng thanh toán trực tiếp', 409);
  }

  if (!contract.signedByFarmer || !contract.signedByEnterprise) {
    throw makeError('Hợp đồng chưa được cả hai bên ký', 409);
  }

  if (!ACTIVE_CONTRACT_STATUSES.has(contract.status)) {
    throw makeError('Trạng thái hợp đồng hiện tại chưa cho phép thanh toán trực tiếp', 409);
  }

  if (!contract.farmerId || !contract.enterpriseId || contract.farmerId === contract.enterpriseId) {
    throw makeError('Thông tin hai bên của hợp đồng không hợp lệ', 500);
  }
};

const buildTransferContent = (contract: Contract, sequence: number): string => {
  const code = String(contract.contractCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 40);

  const fallback = contract.id.replace(/-/g, '').slice(0, 16).toUpperCase();
  return `PRN${code || fallback}P${sequence}`;
};

const serializePayment = (
  payment: DirectGoodsPayment,
  buyerFeeAmount: number,
  sellerFeeAmount: number
) => ({
  id: payment.id,
  contractId: payment.contractId,
  installmentSequence: payment.installmentSequence,
  trigger: payment.trigger,
  amount: Math.round(Number(payment.amount)),
  currency: payment.currency,
  transferContent: payment.transferContent,
  recipient: {
    bankCode: payment.recipientBankCode,
    accountHolder: payment.recipientAccountHolder,
    maskedAccountNumber: payment.recipientMaskedAccountNumber,
  },
  status: payment.status,
  dueAt: payment.dueAt,
  expiresAt: payment.expiresAt,
  confirmedAt: payment.confirmedAt,
  fees: {
    enterpriseFeeAmount: buyerFeeAmount,
    farmerFeeAmount: sellerFeeAmount,
  },
});

const getFeeEntriesForPaymentWithManager = async (
  manager: EntityManager,
  goodsPaymentId: string
) => manager.getRepository(PlatformFeeLedgerEntry).find({
  where: { goodsPaymentId },
});

const deriveFeeAmounts = (entries: PlatformFeeLedgerEntry[]) => {
  let buyerFeeAmount = 0;
  let sellerFeeAmount = 0;

  for (const entry of entries) {
    if (entry.entryType === 'buyer_transaction_fee') {
      buyerFeeAmount += Math.round(Number(entry.amount || 0));
    }
    if (entry.entryType === 'seller_transaction_fee') {
      sellerFeeAmount += Math.round(Number(entry.amount || 0));
    }
  }

  return { buyerFeeAmount, sellerFeeAmount };
};

export interface PrepareGoodsPaymentInput {
  contractId: string;
  installmentSequence: number;
  trigger: GoodsPaymentTrigger;
}

/**
 * Caller must lock Contract first. Keeping this helper transaction-aware lets
 * Contract activation / goods acceptance create their due payment atomically.
 */
export const preparePayableGoodsPaymentWithManager = async (
  manager: EntityManager,
  contract: Contract,
  installmentSequence: number,
  trigger: GoodsPaymentTrigger
) => {
  assertDirectContractReadyForPayment(contract);

  const plan = buildDirectPaymentPlan(contract);
  const installment = plan.find((item) => item.sequence === installmentSequence);

  if (!installment) {
    throw makeError('Đợt thanh toán không tồn tại trong điều khoản hợp đồng', 404);
  }
  if (installment.trigger !== trigger) {
    throw makeError('Đợt thanh toán chưa đúng điều kiện kích hoạt', 409);
  }

  const existing = await lockOne(manager, DirectGoodsPayment, {
    contractId: contract.id,
    installmentSequence: installment.sequence,
  });

  const feeTerms = await getOrCreateContractFeeTermsWithManager(manager, contract);

  if (existing) {
    if (
      Math.round(Number(existing.amount)) !== installment.amount ||
      existing.payerUserId !== contract.enterpriseId ||
      existing.payeeUserId !== contract.farmerId ||
      existing.trigger !== installment.trigger
    ) {
      throw makeError(
        'Payment plan đã tồn tại nhưng không còn khớp với điều khoản hợp đồng',
        409
      );
    }

    const entries = await getFeeEntriesForPaymentWithManager(manager, existing.id);
    const feeAmounts = deriveFeeAmounts(entries);
    return serializePayment(existing, feeAmounts.buyerFeeAmount, feeAmounts.sellerFeeAmount);
  }

  const lockedUsers = await lockManyByIds(
    manager,
    User,
    [contract.enterpriseId, contract.farmerId]
  );
  const enterprise = lockedUsers.get(String(contract.enterpriseId));
  const farmer = lockedUsers.get(String(contract.farmerId));

  if (!enterprise || !farmer) {
    throw makeError('Không tìm thấy một trong hai bên của hợp đồng', 404);
  }
  if (enterprise.role !== 'enterprise' || farmer.role !== 'farmer') {
    throw makeError('Vai trò của các bên trong hợp đồng không hợp lệ', 500);
  }
  if (!enterprise.isActive || !farmer.isActive) {
    throw makeError('Một trong hai tài khoản của hợp đồng đang bị vô hiệu hóa', 409);
  }

  // This also verifies that the bank-account encryption key is usable before
  // we activate a payment obligation.
  const { entity: bankAccount } = await getDefaultFarmerBankAccountForPaymentWithManager(
    manager,
    farmer.id
  );

  await ensureFeeAccountWithManager(manager, enterprise.id);
  await ensureFeeAccountWithManager(manager, farmer.id);

  const repo = manager.getRepository(DirectGoodsPayment);
  let payment = repo.create({
    contractId: contract.id,
    payerUserId: enterprise.id,
    payeeUserId: farmer.id,
    bankAccountId: bankAccount.id,
    installmentSequence: installment.sequence,
    trigger: installment.trigger,
    amount: installment.amount,
    currency: feeTerms.currency,
    transferContent: buildTransferContent(contract, installment.sequence),
    recipientBankCode: bankAccount.bankCode,
    recipientAccountHolder: bankAccount.accountHolder,
    recipientMaskedAccountNumber: bankAccount.maskedAccountNumber,
    status: 'payable',
    confirmationMethod: null,
    idempotencyKey: `direct-goods:${contract.id}:${installment.sequence}`,
    dueAt: new Date(),
    expiresAt: null,
    confirmedAt: null,
    confirmedBy: null,
  });

  payment = await repo.save(payment);

  await createPendingTransactionFeesWithManager(manager, payment, feeTerms);

  const buyerFeeAmount = calculateFeeVnd(payment.amount, feeTerms.buyerFeeBps);
  const sellerFeeAmount = calculateFeeVnd(payment.amount, feeTerms.sellerFeeBps);

  return serializePayment(payment, buyerFeeAmount, sellerFeeAmount);
};

export const preparePayableGoodsPayment = async (
  input: PrepareGoodsPaymentInput
) => runLockedTransaction(async (manager) => {
  const contract = await lockByIdOrFail(
    manager,
    Contract,
    input.contractId,
    () => makeError('Không tìm thấy hợp đồng', 404)
  );

  return preparePayableGoodsPaymentWithManager(
    manager,
    contract,
    input.installmentSequence,
    input.trigger
  );
}, { label: 'paymentV2.preparePayableGoodsPayment' });

const getDirectQrBaseUrl = (): string => {
  const base = String(
    process.env.DIRECT_PAYMENT_QR_BASE_URL ||
    process.env.SEPAY_QR_BASE_URL ||
    'https://qr.sepay.vn/img'
  ).trim();

  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw makeError('DIRECT_PAYMENT_QR_BASE_URL không hợp lệ', 500);
  }
  if (parsed.protocol !== 'https:') {
    throw makeError('DIRECT_PAYMENT_QR_BASE_URL phải dùng HTTPS', 500);
  }
  return base;
};

export const getDirectGoodsPaymentInstruction = async (
  paymentId: string,
  enterpriseUserId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const payment = await AppDataSource.getRepository(DirectGoodsPayment).findOne({
    where: { id: paymentId },
  });
  if (!payment) throw makeError('Không tìm thấy giao dịch tiền hàng', 404);

  const contract = await AppDataSource.getRepository(Contract).findOne({
    where: { id: payment.contractId },
  });
  if (
    !contract ||
    contract.paymentFlow !== 'direct_v2' ||
    contract.status !== 'active'
  ) {
    throw makeError('Hợp đồng không ở trạng thái có thể thanh toán', 409);
  }

  if (payment.payerUserId !== enterpriseUserId) {
    throw makeError('Bạn không có quyền xem thông tin thanh toán này', 403);
  }
  if (!['payable', 'awaiting_payment', 'awaiting_confirmation'].includes(payment.status)) {
    throw makeError('Giao dịch không còn ở trạng thái có thể thanh toán', 409);
  }

  const { entity: account, accountNumber } = await getBankAccountForPaymentWithManager(
    AppDataSource.manager,
    payment.payeeUserId,
    payment.bankAccountId
  );

  if (
    account.bankCode !== payment.recipientBankCode ||
    account.accountHolder !== payment.recipientAccountHolder ||
    account.maskedAccountNumber !== payment.recipientMaskedAccountNumber
  ) {
    throw makeError(
      'Thông tin tài khoản nhận tiền đã thay đổi. Cần kiểm tra lại giao dịch.',
      409
    );
  }

  const amount = Math.round(Number(payment.amount));
  const qrBaseUrl = getDirectQrBaseUrl();
  const qrUrl =
    `${qrBaseUrl}?acc=${encodeURIComponent(accountNumber)}` +
    `&bank=${encodeURIComponent(account.bankCode)}` +
    `&amount=${amount}` +
    `&des=${encodeURIComponent(payment.transferContent)}`;

  return {
    paymentId: payment.id,
    contractId: payment.contractId,
    installmentSequence: payment.installmentSequence,
    amount,
    currency: payment.currency,
    transferContent: payment.transferContent,
    recipient: {
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountHolder: account.accountHolder,
      accountNumber,
      maskedAccountNumber: account.maskedAccountNumber,
    },
    qrUrl,
  };
};

export const listDirectGoodsPaymentsForContract = async (
  contractId: string,
  userId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const contract = await AppDataSource.getRepository(Contract).findOne({
    where: { id: contractId },
  });
  if (!contract) throw makeError('Không tìm thấy hợp đồng', 404);
  if (contract.paymentFlow !== 'direct_v2') {
    throw makeError('Hợp đồng này không sử dụng thanh toán trực tiếp', 409);
  }
  if (userId !== contract.enterpriseId && userId !== contract.farmerId) {
    throw makeError('Bạn không có quyền xem thanh toán của hợp đồng này', 403);
  }

  const payments = await AppDataSource.getRepository(DirectGoodsPayment).find({
    where: { contractId },
    order: { installmentSequence: 'ASC', createdAt: 'ASC' },
  });

  const result = [];
  for (const payment of payments) {
    const feeEntries = await AppDataSource.getRepository(PlatformFeeLedgerEntry).find({
      where: { goodsPaymentId: payment.id },
    });
    const feeAmounts = deriveFeeAmounts(feeEntries);
    result.push(
      serializePayment(payment, feeAmounts.buyerFeeAmount, feeAmounts.sellerFeeAmount)
    );
  }

  return result;
};

export const markDirectGoodsPaymentSent = async (
  paymentId: string,
  enterpriseUserId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const lookup = await AppDataSource.getRepository(DirectGoodsPayment).findOne({
    where: { id: paymentId },
    select: ['id', 'contractId'],
  });
  if (!lookup) throw makeError('Không tìm thấy giao dịch tiền hàng', 404);

  return runLockedTransaction(async (manager) => {
    // Keep the same lock order as cancellation / confirmation:
    // Contract -> DirectGoodsPayment.
    const contract = await lockByIdOrFail(
      manager,
      Contract,
      lookup.contractId,
      () => makeError('Không tìm thấy hợp đồng', 404)
    );
    if (contract.paymentFlow !== 'direct_v2' || contract.status !== 'active') {
      throw makeError('Hợp đồng không ở trạng thái có thể thanh toán', 409);
    }

    const payment = await lockByIdOrFail(
      manager,
      DirectGoodsPayment,
      paymentId,
      () => makeError('Không tìm thấy giao dịch tiền hàng', 404)
    );

    if (payment.contractId !== contract.id) {
      throw makeError('Giao dịch không thuộc hợp đồng đã xác định', 409);
    }
    if (payment.payerUserId !== enterpriseUserId) {
      throw makeError('Bạn không có quyền cập nhật giao dịch này', 403);
    }

    if (payment.status === 'confirmed' || payment.status === 'awaiting_confirmation') {
      return payment;
    }

    if (!['payable', 'awaiting_payment'].includes(payment.status)) {
      throw makeError('Trạng thái giao dịch không cho phép xác nhận đã chuyển tiền', 409);
    }

    payment.status = 'awaiting_confirmation';
    return manager.getRepository(DirectGoodsPayment).save(payment);
  }, { label: 'paymentV2.markGoodsPaymentSent' });
};

export const refreshDirectContractPaymentProgressWithManager = async (
  manager: EntityManager,
  contract: Contract,
  now: Date
) => {
  const raw = await manager
    .getRepository(DirectGoodsPayment)
    .createQueryBuilder('payment')
    .select('COALESCE(SUM(payment.Amount), 0)', 'confirmedAmount')
    .where('payment.ContractId = :contractId', { contractId: contract.id })
    .andWhere("payment.Status = 'confirmed'")
    .getRawOne<{ confirmedAmount: string | number }>();

  const confirmedAmount = Math.max(0, Math.round(Number(raw?.confirmedAmount || 0)));
  const totalValue = Math.round(Number(contract.totalValue || 0));

  contract.paidAmount = Math.min(totalValue, confirmedAmount);
  contract.remainingAmount = Math.max(0, totalValue - contract.paidAmount);

  if (
    contract.deliveryStatus === 'delivered' &&
    contract.remainingAmount <= 0 &&
    contract.status === 'active'
  ) {
    contract.status = 'completed';
    contract.completedAt = now;
  }

  await manager.getRepository(Contract).save(contract);

  return {
    paidAmount: contract.paidAmount,
    remainingAmount: contract.remainingAmount,
    contractCompleted: contract.status === 'completed',
  };
};

export const confirmDirectGoodsPaymentReceived = async (
  paymentId: string,
  farmerUserId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const lookup = await AppDataSource.getRepository(DirectGoodsPayment).findOne({
    where: { id: paymentId },
    select: ['id', 'contractId'],
  });
  if (!lookup) throw makeError('Không tìm thấy giao dịch tiền hàng', 404);

  return runLockedTransaction(async (manager) => {
    // Global lock order for Direct V2 lifecycle: Contract -> DirectGoodsPayment.
    const contract = await lockByIdOrFail(
      manager,
      Contract,
      lookup.contractId,
      () => makeError('Không tìm thấy hợp đồng', 404)
    );
    if (contract.paymentFlow !== 'direct_v2') {
      throw makeError('Hợp đồng không sử dụng thanh toán trực tiếp', 409);
    }
    if (contract.status !== 'active') {
      throw makeError(
        'Hợp đồng đang bị tạm dừng/kết thúc nên chưa thể xác nhận nhận tiền',
        409
      );
    }

    const payment = await lockByIdOrFail(
      manager,
      DirectGoodsPayment,
      paymentId,
      () => makeError('Không tìm thấy giao dịch tiền hàng', 404)
    );
    if (payment.contractId !== contract.id) {
      throw makeError('Giao dịch không thuộc hợp đồng đã xác định', 409);
    }

    if (payment.payeeUserId !== farmerUserId) {
      throw makeError('Bạn không có quyền xác nhận khoản tiền này', 403);
    }

    if (payment.status === 'confirmed') {
      const progress = await refreshDirectContractPaymentProgressWithManager(
        manager,
        contract,
        payment.confirmedAt || new Date()
      );
      return { payment, ...progress, alreadyConfirmed: true };
    }

    if (payment.status !== 'awaiting_confirmation') {
      throw makeError(
        'Chỉ xác nhận nhận tiền sau khi doanh nghiệp đánh dấu đã chuyển khoản',
        409
      );
    }

    const now = new Date();
    payment.status = 'confirmed';
    payment.confirmationMethod = 'farmer_manual';
    payment.confirmedAt = now;
    payment.confirmedBy = farmerUserId;

    const saved = await manager.getRepository(DirectGoodsPayment).save(payment);

    // Posting fees and Contract payment progress happen atomically with Farmer confirmation.
    await postPendingFeesForPaymentWithManager(manager, saved, now);
    const progress = await refreshDirectContractPaymentProgressWithManager(
      manager,
      contract,
      now
    );

    return {
      payment: saved,
      ...progress,
      alreadyConfirmed: false,
    };
  }, { label: 'paymentV2.confirmGoodsPaymentReceived' });
};


export const assertDirectContractHasNoTransferredFundsWithManager = async (
  manager: EntityManager,
  contractId: string
): Promise<void> => {
  const blocking = await manager
    .getRepository(DirectGoodsPayment)
    .createQueryBuilder('payment')
    .where('payment.ContractId = :contractId', { contractId })
    .andWhere("payment.Status IN ('awaiting_confirmation','confirmed','disputed')")
    .getOne();

  if (blocking) {
    throw makeError(
      'Hợp đồng đã có khoản thanh toán được báo chuyển hoặc xác nhận nhận tiền; cần xử lý qua tranh chấp thay vì hủy trực tiếp.',
      409
    );
  }
};

export const cancelOpenDirectPaymentsForContractWithManager = async (
  manager: EntityManager,
  contractId: string
): Promise<void> => {
  const rows = await manager
    .getRepository(DirectGoodsPayment)
    .createQueryBuilder('payment')
    .where('payment.ContractId = :contractId', { contractId })
    .andWhere("payment.Status IN ('planned','payable','awaiting_payment')")
    .orderBy('payment.InstallmentSequence', 'ASC')
    .setLock('pessimistic_write')
    .getMany();

  for (const payment of rows) {
    payment.status = 'cancelled';
    await manager.getRepository(DirectGoodsPayment).save(payment);
    await voidPendingFeesForPaymentWithManager(manager, payment);
  }
};

export const cancelUnsentDirectGoodsPayment = async (
  paymentId: string,
  actorUserId: string
) => runLockedTransaction(async (manager) => {
  const payment = await lockByIdOrFail(
    manager,
    DirectGoodsPayment,
    paymentId,
    () => makeError('Không tìm thấy giao dịch tiền hàng', 404)
  );

  if (actorUserId !== payment.payerUserId && actorUserId !== payment.payeeUserId) {
    throw makeError('Bạn không có quyền hủy giao dịch này', 403);
  }

  if (payment.status === 'cancelled') return payment;

  if (!['planned', 'payable', 'awaiting_payment'].includes(payment.status)) {
    throw makeError(
      'Không thể hủy giao dịch sau khi doanh nghiệp đã báo chuyển tiền',
      409
    );
  }

  payment.status = 'cancelled';
  const saved = await manager.getRepository(DirectGoodsPayment).save(payment);
  await voidPendingFeesForPaymentWithManager(manager, saved);
  return saved;
}, { label: 'paymentV2.cancelUnsentGoodsPayment' });
