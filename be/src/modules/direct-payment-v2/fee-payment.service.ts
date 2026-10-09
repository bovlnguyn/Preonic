import crypto from 'crypto';
import { IncomingHttpHeaders } from 'http';
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { PlatformFeeLedgerEntry } from '../../models/PlatformFeeLedgerEntry.entity';
import { PlatformFeePayment } from '../../models/PlatformFeePayment.entity';
import { PlatformFeePaymentApplication } from '../../models/PlatformFeePaymentApplication.entity';
import { PlatformFeePaymentEvent } from '../../models/PlatformFeePaymentEvent.entity';
import { PlatformFeeStatement } from '../../models/PlatformFeeStatement.entity';
import { User } from '../../models/User.entity';
import { makeError } from '../../utils/error.util';
import {
  lockByIdOrFail,
  lockOne,
  runLockedTransaction,
} from '../../utils/transaction-lock.util';
import {
  getConfiguredFeePaymentProviderName,
  getFeePaymentProvider,
} from './providers/fee-payment-provider.factory';
import { hashWebhookPayload } from './security/webhook-security';
import {
  ensureFeeAccountWithManager,
  recalculateFeeAccountWithManager,
} from './fee-ledger.service';

const money = (value: unknown): number => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) {
    throw makeError('Dữ liệu thanh toán phí không hợp lệ', 500);
  }
  return Math.round(parsed);
};

const normalizeClientIdempotencyKey = (value: string): string => {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(normalized)) {
    throw makeError('Idempotency key không hợp lệ', 400);
  }
  return normalized;
};

const internalIdempotencyKey = (
  userId: string,
  clientKey: string
): string => {
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${clientKey}`, 'utf8')
    .digest('hex');
  return `fee:${hash}`;
};

const generateOrderCode = (): string => {
  const time = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `PF${time}${random}`.slice(0, 40);
};

const serializePayment = (payment: PlatformFeePayment) => ({
  id: payment.id,
  orderCode: payment.orderCode,
  amount: money(payment.amount),
  currency: payment.currency,
  provider: payment.provider,
  providerPaymentId: payment.providerPaymentId,
  transferContent: payment.transferContent,
  paymentUrl: payment.paymentUrl,
  qrPayload: payment.qrPayload,
  status: payment.status,
  statementId: payment.statementId,
  expiresAt: payment.expiresAt,
  paidAt: payment.paidAt,
  createdAt: payment.createdAt,
});

const validateHttpsUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.length > 1000) {
    throw makeError('Payment provider trả về URL quá dài', 502);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw makeError('Payment provider trả về URL không hợp lệ', 502);
  }
  if (parsed.protocol !== 'https:') {
    throw makeError('Payment provider phải trả về HTTPS URL', 502);
  }
  return value;
};

const validateProviderText = (
  value: string,
  field: string,
  maxLength: number
): string => {
  const normalized = String(value || '').trim();
  if (
    !normalized ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw makeError(`Payment provider trả về ${field} không hợp lệ`, 502);
  }
  return normalized;
};

const getActivePendingFeePaymentsWithManager = async (
  manager: EntityManager,
  userId: string
): Promise<number> => {
  const raw = await manager
    .getRepository(PlatformFeePayment)
    .createQueryBuilder('payment')
    .select('COALESCE(SUM(payment.Amount), 0)', 'amount')
    .where('payment.UserId = :userId', { userId })
    .andWhere(
      "payment.Status IN ('pending','processing','amount_mismatch')"
    )
    .getRawOne<{ amount: string | number }>();

  return Math.max(0, money(raw?.amount));
};

const getStatementRemaining = (statement: PlatformFeeStatement): number =>
  Math.max(0, money(statement.amountDueSnapshot) - money(statement.amountPaid));

export interface CreateFeePaymentInput {
  amount?: number;
  statementId?: string | null;
  idempotencyKey: string;
}

export const createPlatformFeePayment = async (
  userId: string,
  input: CreateFeePaymentInput
) => {
  const clientKey = normalizeClientIdempotencyKey(input.idempotencyKey);
  const idempotencyKey = internalIdempotencyKey(userId, clientKey);
  const providerName = getConfiguredFeePaymentProviderName();

  const prepared = await runLockedTransaction(async (manager) => {
    await lockByIdOrFail(
      manager,
      User,
      userId,
      () => makeError('Không tìm thấy người dùng', 404)
    );

    const paymentRepo = manager.getRepository(PlatformFeePayment);
    const existing = await lockOne(manager, PlatformFeePayment, {
      idempotencyKey,
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw makeError('Idempotency key đã được dùng cho người dùng khác', 409);
      }
      return { payment: existing, needsProviderCall: !existing.providerPaymentId };
    }

    const account = await recalculateFeeAccountWithManager(manager, userId);
    const outstanding = money(account.outstandingAmount);
    const activePending = await getActivePendingFeePaymentsWithManager(manager, userId);
    const available = Math.max(0, outstanding - activePending);

    if (available <= 0) {
      throw makeError('Hiện không có phí khả dụng để thanh toán', 409);
    }

    let statement: PlatformFeeStatement | null = null;
    let maxForRequest = available;

    if (input.statementId) {
      statement = await lockByIdOrFail(
        manager,
        PlatformFeeStatement,
        input.statementId,
        () => makeError('Không tìm thấy bảng kê phí', 404)
      );

      if (statement.userId !== userId) {
        throw makeError('Bạn không có quyền thanh toán bảng kê này', 403);
      }
      if (statement.status === 'voided' || statement.status === 'paid') {
        throw makeError('Bảng kê này không còn khoản phí cần thanh toán', 409);
      }

      maxForRequest = Math.min(available, getStatementRemaining(statement));
      if (maxForRequest <= 0) {
        throw makeError('Bảng kê này không còn số dư cần thanh toán', 409);
      }
    }

    const requestedAmount = input.amount == null
      ? maxForRequest
      : Math.round(Number(input.amount));

    if (
      !Number.isSafeInteger(requestedAmount) ||
      requestedAmount <= 0 ||
      requestedAmount > maxForRequest
    ) {
      throw makeError('Số tiền thanh toán phí không hợp lệ', 400);
    }

    const orderCode = generateOrderCode();
    const payment = await paymentRepo.save(paymentRepo.create({
      userId,
      statementId: statement?.id ?? null,
      orderCode,
      idempotencyKey,
      amount: requestedAmount,
      currency: 'VND',
      provider: providerName,
      providerPaymentId: null,
      transferContent: `PRNFEE${orderCode}`.slice(0, 100),
      paymentUrl: null,
      qrPayload: null,
      status: 'pending',
      expiresAt: null,
      paidAt: null,
    }));

    return { payment, needsProviderCall: true };
  }, { label: 'paymentV2.createFeePayment.local' });

  if (!prepared.needsProviderCall) {
    return serializePayment(prepared.payment);
  }

  const provider = getFeePaymentProvider(prepared.payment.provider);
  let providerResult;
  try {
    providerResult = await provider.createPayment({
      orderCode: prepared.payment.orderCode,
      amount: money(prepared.payment.amount),
      currency: 'VND',
      transferContent: prepared.payment.transferContent,
      idempotencyKey: prepared.payment.idempotencyKey,
      description: 'Thanh toán phí dịch vụ Preonic',
    });
  } catch (error: any) {
    throw makeError(
      process.env.NODE_ENV === 'development'
        ? `Không thể tạo thanh toán phí: ${String(error?.message || error)}`
        : 'Không thể tạo thanh toán phí. Vui lòng thử lại với cùng yêu cầu.',
      502
    );
  }

  const saved = await runLockedTransaction(async (manager) => {
    const payment = await lockByIdOrFail(
      manager,
      PlatformFeePayment,
      prepared.payment.id,
      () => makeError('Không tìm thấy giao dịch phí vừa tạo', 404)
    );

    if (payment.providerPaymentId) {
      return payment;
    }

    if (providerResult.provider !== payment.provider) {
      throw makeError('Payment provider trả về sai định danh provider', 502);
    }

    const providerPaymentId = validateProviderText(
      providerResult.providerPaymentId,
      'providerPaymentId',
      150
    );
    const paymentUrl = validateHttpsUrl(providerResult.paymentUrl);
    const qrPayload = providerResult.qrPayload == null
      ? null
      : String(providerResult.qrPayload);

    if (qrPayload && qrPayload.length > 2000) {
      throw makeError('QR payload từ provider vượt giới hạn cho phép', 502);
    }

    payment.providerPaymentId = providerPaymentId;
    payment.paymentUrl = paymentUrl;
    payment.qrPayload = qrPayload;
    payment.expiresAt = providerResult.expiresAt ?? null;
    payment.status = 'processing';

    return manager.getRepository(PlatformFeePayment).save(payment);
  }, { label: 'paymentV2.createFeePayment.providerResult' });

  return serializePayment(saved);
};

const getAppliedAmountForLedgerEntry = async (
  manager: EntityManager,
  ledgerEntryId: string
): Promise<number> => {
  const raw = await manager
    .getRepository(PlatformFeePaymentApplication)
    .createQueryBuilder('application')
    .select('COALESCE(SUM(application.Amount), 0)', 'amount')
    .where('application.FeeLedgerEntryId = :ledgerEntryId', { ledgerEntryId })
    .getRawOne<{ amount: string | number }>();

  return Math.max(0, money(raw?.amount));
};

const applyAmountToStatement = async (
  manager: EntityManager,
  statementId: string,
  amount: number,
  paidAt: Date
): Promise<void> => {
  const statement = await lockByIdOrFail(
    manager,
    PlatformFeeStatement,
    statementId,
    () => makeError('Không tìm thấy bảng kê được liên kết với phí', 500)
  );

  statement.amountPaid = Math.min(
    money(statement.amountDueSnapshot),
    money(statement.amountPaid) + amount
  );

  const remaining = getStatementRemaining(statement);
  if (remaining === 0) {
    statement.status = 'paid';
    statement.paidAt = paidAt;
  } else if (statement.status !== 'overdue') {
    statement.status = 'partially_paid';
  }

  await manager.getRepository(PlatformFeeStatement).save(statement);
};

const postFeePaymentCreditWithManager = async (
  manager: EntityManager,
  payment: PlatformFeePayment,
  paidAt: Date
): Promise<void> => {
  const ledgerRepo = manager.getRepository(PlatformFeeLedgerEntry);
  const creditKey = `fee-payment-credit:${payment.id}`;

  const existingCredit = await ledgerRepo.findOne({
    where: { idempotencyKey: creditKey },
  });

  if (existingCredit) {
    if (
      existingCredit.userId !== payment.userId ||
      existingCredit.direction !== 'credit' ||
      existingCredit.entryType !== 'payment' ||
      money(existingCredit.amount) !== money(payment.amount)
    ) {
      throw makeError('Credit ledger của thanh toán phí không nhất quán', 500);
    }
    return;
  }

  let remainingToApply = money(payment.amount);

  const debitQb = ledgerRepo
    .createQueryBuilder('entry')
    .where('entry.UserId = :userId', { userId: payment.userId })
    .andWhere("entry.Status = 'posted'")
    .andWhere("entry.Direction = 'debit'")
    .andWhere(
      "entry.EntryType IN ('buyer_transaction_fee','seller_transaction_fee','adjustment')"
    )
    .orderBy('entry.PostedAt', 'ASC')
    .addOrderBy('entry.CreatedAt', 'ASC')
    .addOrderBy('entry.FeeLedgerEntryId', 'ASC')
    .setLock('pessimistic_write');

  if (payment.statementId) {
    debitQb.andWhere('entry.FeeStatementId = :statementId', {
      statementId: payment.statementId,
    });
  }

  const debitEntries = await debitQb.getMany();
  const applicationRepo = manager.getRepository(PlatformFeePaymentApplication);

  for (const entry of debitEntries) {
    if (remainingToApply <= 0) break;

    const alreadyApplied = await getAppliedAmountForLedgerEntry(manager, entry.id);
    const entryRemaining = Math.max(0, money(entry.amount) - alreadyApplied);
    if (entryRemaining <= 0) continue;

    const amount = Math.min(entryRemaining, remainingToApply);

    const application = applicationRepo.create({
      feePaymentId: payment.id,
      feeLedgerEntryId: entry.id,
      feeStatementId: entry.statementId,
      amount,
    });
    await applicationRepo.save(application);

    if (entry.statementId) {
      await applyAmountToStatement(manager, entry.statementId, amount, paidAt);
    }

    remainingToApply -= amount;
  }

  // A payment may be made immediately before a monthly statement exists, so
  // applications can legitimately target fee charges with statementId = NULL.
  // The statement generator later attaches those applications to the statement.
  await ledgerRepo.save(ledgerRepo.create({
    userId: payment.userId,
    contractId: null,
    goodsPaymentId: null,
    feePolicyId: null,
    statementId: payment.statementId,
    entryType: 'payment',
    direction: 'credit',
    amount: money(payment.amount),
    feeRateBps: null,
    status: 'posted',
    idempotencyKey: creditKey,
    description: `Thanh toán phí Preonic - ${payment.orderCode}`,
    postedAt: paidAt,
    voidedAt: null,
  }));

  await recalculateFeeAccountWithManager(manager, payment.userId);
};

const persistWebhookEventWithManager = async (
  manager: EntityManager,
  params: {
    payment: PlatformFeePayment;
    provider: string;
    providerEventId: string;
    eventType: string;
    rawBody: Buffer;
    sanitizedPayload?: Record<string, unknown> | null;
    occurredAt?: Date | null;
  }
) => {
  const eventRepo = manager.getRepository(PlatformFeePaymentEvent);

  return eventRepo.save(eventRepo.create({
    feePaymentId: params.payment.id,
    provider: params.provider,
    providerEventId: params.providerEventId,
    eventType: params.eventType,
    payloadHash: hashWebhookPayload(params.rawBody),
    sanitizedPayload: params.sanitizedPayload
      ? JSON.stringify(params.sanitizedPayload).slice(0, 8000)
      : null,
    occurredAt: params.occurredAt ?? null,
  }));
};

const isUniqueViolation = (error: any): boolean => {
  const number = Number(
    error?.number ??
    error?.driverError?.number ??
    error?.originalError?.number
  );
  return number === 2601 || number === 2627 ||
    String(error?.message || '').toLowerCase().includes('duplicate');
};

export const processPlatformFeePaymentWebhook = async (
  providerName: string,
  rawBody: Buffer,
  headers: IncomingHttpHeaders
) => {
  const provider = getFeePaymentProvider(providerName);

  let event;
  try {
    event = await provider.verifyAndNormalizeWebhook(rawBody, headers);
  } catch {
    throw makeError('Webhook thanh toán không hợp lệ', 401);
  }

  if (event.provider !== provider.name) {
    throw makeError('Webhook provider không hợp lệ', 400);
  }

  try {
    return await runLockedTransaction(async (manager) => {
      const eventRepo = manager.getRepository(PlatformFeePaymentEvent);
      const duplicate = await eventRepo.findOne({
        where: {
          provider: event.provider,
          providerEventId: event.providerEventId,
        },
      });
      if (duplicate) {
        return { duplicate: true, paymentId: duplicate.feePaymentId };
      }

      let payment: PlatformFeePayment | null = null;

      if (event.providerPaymentId) {
        payment = await lockOne(manager, PlatformFeePayment, {
          provider: event.provider,
          providerPaymentId: event.providerPaymentId,
        });
      }

      if (!payment && event.orderCode) {
        payment = await lockOne(manager, PlatformFeePayment, {
          provider: event.provider,
          orderCode: event.orderCode,
        });
      }

      if (!payment) {
        throw makeError('Không tìm thấy giao dịch phí tương ứng webhook', 404);
      }

      if (
        event.providerPaymentId &&
        payment.providerPaymentId &&
        event.providerPaymentId !== payment.providerPaymentId
      ) {
        throw makeError('Webhook payment reference không khớp', 409);
      }
      if (event.orderCode && event.orderCode !== payment.orderCode) {
        throw makeError('Webhook order code không khớp', 409);
      }

      const occurredAt = event.occurredAt ?? new Date();

      if (event.status === 'paid') {
        const receivedAmount = money(event.amount);
        if (receivedAmount !== money(payment.amount)) {
          payment.status = 'amount_mismatch';
          await manager.getRepository(PlatformFeePayment).save(payment);
          await persistWebhookEventWithManager(manager, {
            payment,
            provider: event.provider,
            providerEventId: event.providerEventId,
            eventType: 'amount_mismatch',
            rawBody,
            sanitizedPayload: event.sanitizedPayload,
            occurredAt,
          });
          return {
            duplicate: false,
            paymentId: payment.id,
            status: payment.status,
          };
        }

        if (payment.status !== 'paid') {
          payment.status = 'paid';
          payment.paidAt = occurredAt;
          await manager.getRepository(PlatformFeePayment).save(payment);
          await postFeePaymentCreditWithManager(manager, payment, occurredAt);
        }
      } else if (payment.status !== 'paid') {
        if (event.status === 'processing' && payment.status !== 'amount_mismatch') {
          payment.status = 'processing';
        } else if (
          event.status === 'failed' &&
          payment.status !== 'amount_mismatch'
        ) {
          payment.status = 'failed';
        } else if (
          event.status === 'expired' &&
          payment.status !== 'amount_mismatch'
        ) {
          payment.status = 'expired';
        }
        await manager.getRepository(PlatformFeePayment).save(payment);
      }

      await persistWebhookEventWithManager(manager, {
        payment,
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.status,
        rawBody,
        sanitizedPayload: event.sanitizedPayload,
        occurredAt,
      });

      return {
        duplicate: false,
        paymentId: payment.id,
        status: payment.status,
      };
    }, { label: 'paymentV2.feePaymentWebhook' });
  } catch (error: any) {
    if (isUniqueViolation(error) && AppDataSource?.isInitialized) {
      const existing = await AppDataSource
        .getRepository(PlatformFeePaymentEvent)
        .findOne({
          where: {
            provider: event.provider,
            providerEventId: event.providerEventId,
          },
        });
      if (existing) {
        return { duplicate: true, paymentId: existing.feePaymentId };
      }
    }
    throw error;
  }
};

export const getPlatformFeePayment = async (
  userId: string,
  paymentId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const payment = await AppDataSource.getRepository(PlatformFeePayment).findOne({
    where: { id: paymentId },
  });
  if (!payment) throw makeError('Không tìm thấy giao dịch phí', 404);
  if (payment.userId !== userId) {
    throw makeError('Bạn không có quyền xem giao dịch phí này', 403);
  }

  return serializePayment(payment);
};
