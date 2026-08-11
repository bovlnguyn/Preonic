import {
  EntityManager,
  EntityTarget,
  FindOptionsRelations,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { AppDataSource } from '../config/database';
import { createLogger } from './logger';

/**
 * Lớp tiện ích giao dịch + row lock dùng chung cho các nghiệp vụ nhạy cảm
 * (wallet, escrow, withdrawal, contract inventory, dispute...).
 *
 * Mục tiêu:
 * 1. Mọi thao tác đọc -> kiểm tra -> cập nhật phải nằm trong CÙNG transaction.
 * 2. Bản ghi quan trọng được khóa bằng pessimistic_write trước khi kiểm tra trạng thái/số dư.
 * 3. Giảm deadlock bằng thứ tự khóa ổn định và retry deadlock ở mức transaction.
 *
 * Lưu ý quan trọng:
 * - Chỉ gọi lockOne/lockById/lockManyByIds bên trong runLockedTransaction().
 * - Callback transaction chỉ nên chứa thao tác DB. Không gọi email, webhook, Cloudinary,
 *   API bên thứ ba... bên trong callback vì transaction có thể được retry khi gặp deadlock.
 */

const log = createLogger('TxLock');

export type TransactionIsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export interface LockedTransactionOptions {
  /** READ COMMITTED + explicit pessimistic locks là phù hợp với phần lớn nghiệp vụ hiện tại. */
  isolationLevel?: TransactionIsolationLevel;

  /**
   * Số lần retry thêm khi SQL Server chọn transaction làm deadlock victim (error 1205).
   * Mặc định 2 => tổng cộng tối đa 3 lần chạy.
   */
  deadlockRetries?: number;

  /** Khoảng chờ cơ sở giữa các lần retry. Lần sau tăng tuyến tính theo attempt. */
  retryDelayMs?: number;

  /** Nhãn để log dễ truy vết, ví dụ: 'wallet.sepayWebhook'. */
  label?: string;
}

export interface LockOneOptions<Entity extends ObjectLiteral> {
  relations?: FindOptionsRelations<Entity> | string[];
  withDeleted?: boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const clampNonNegativeInt = (value: number | undefined, fallback: number): number => {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

/**
 * Lấy SQL Server error number qua các lớp wrapper khác nhau của mssql/tedious/TypeORM.
 */
const getSqlServerErrorNumber = (error: any): number | null => {
  const candidates = [
    error?.number,
    error?.driverError?.number,
    error?.originalError?.number,
    error?.originalError?.info?.number,
    error?.driverError?.originalError?.number,
    error?.driverError?.originalError?.info?.number,
    error?.precedingErrors?.[0]?.number,
    error?.driverError?.precedingErrors?.[0]?.number,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

/** SQL Server error 1205 = transaction was chosen as deadlock victim. */
export const isSqlServerDeadlockError = (error: unknown): boolean => {
  const err = error as any;
  const number = getSqlServerErrorNumber(err);
  if (number === 1205) return true;

  const message = String(
    err?.message || err?.driverError?.message || err?.originalError?.message || ''
  ).toLowerCase();

  return message.includes('deadlock victim') || message.includes('deadlocked on lock resources');
};

/**
 * Chạy một transaction có chính sách retry deadlock dùng chung.
 *
 * Không dùng SERIALIZABLE mặc định vì quá nặng. Các row cần bảo vệ sẽ được khóa cụ thể
 * bằng lockOne/lockById (pessimistic_write / UPDLOCK trên SQL Server).
 */
export async function runLockedTransaction<T>(
  work: (manager: EntityManager) => Promise<T>,
  options: LockedTransactionOptions = {}
): Promise<T> {
  if (!AppDataSource?.isInitialized) {
    throw new Error('Database is not initialized');
  }

  const isolationLevel = options.isolationLevel ?? 'READ COMMITTED';
  const deadlockRetries = clampNonNegativeInt(options.deadlockRetries, 2);
  const retryDelayMs = clampNonNegativeInt(options.retryDelayMs, 75);
  const label = options.label?.trim() || 'transaction';

  for (let attempt = 0; attempt <= deadlockRetries; attempt += 1) {
    try {
      return await AppDataSource.transaction(isolationLevel, async (manager) => work(manager));
    } catch (error) {
      const canRetry = isSqlServerDeadlockError(error) && attempt < deadlockRetries;

      if (!canRetry) throw error;

      const waitMs = retryDelayMs * (attempt + 1);
      log.warn(
        `${label} hit SQL Server deadlock; retry ${attempt + 1}/${deadlockRetries} in ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }

  // Về logic không thể tới đây vì vòng lặp luôn return hoặc throw.
  throw new Error(`${label} failed unexpectedly`);
}

/**
 * Bảo đảm EntityManager thực sự thuộc một transaction đang active.
 * Nếu ai đó gọi helper lock bằng manager thường, fail-fast thay vì tưởng rằng row đã được khóa.
 */
export function assertActiveTransaction(manager: EntityManager): void {
  if (!manager?.queryRunner?.isTransactionActive) {
    throw new Error(
      'Row lock requires an active transaction. Use runLockedTransaction() and its manager.'
    );
  }
}

/**
 * SELECT một entity với pessimistic write lock.
 * SQL Server/TypeORM sẽ giữ write-intent lock cho tới khi transaction COMMIT/ROLLBACK.
 */
export async function lockOne<Entity extends ObjectLiteral>(
  manager: EntityManager,
  target: EntityTarget<Entity>,
  where: FindOptionsWhere<Entity>,
  options: LockOneOptions<Entity> = {}
): Promise<Entity | null> {
  assertActiveTransaction(manager);

  return manager.getRepository(target).findOne({
    where,
    relations: options.relations as FindOptionsRelations<Entity> | string[] | undefined,
    withDeleted: options.withDeleted,
    lock: {
      mode: 'pessimistic_write',
    },
  });
}

/**
 * Convenience helper cho các entity của PreOnic có primary property là `id`.
 */
export async function lockById<
  Entity extends ObjectLiteral & { id: string | number }
>(
  manager: EntityManager,
  target: EntityTarget<Entity>,
  id: Entity['id'],
  options: LockOneOptions<Entity> = {}
): Promise<Entity | null> {
  return lockOne(
    manager,
    target,
    { id } as FindOptionsWhere<Entity>,
    options
  );
}

/**
 * Khóa nhiều row cùng loại theo ID với thứ tự ổn định.
 * Việc sort ID trước khi lock giúp giảm khả năng hai transaction khóa chéo thứ tự và deadlock.
 *
 * Hàm trả Map theo id để caller không phụ thuộc vào thứ tự sort nội bộ.
 */
export async function lockManyByIds<
  Entity extends ObjectLiteral & { id: string | number }
>(
  manager: EntityManager,
  target: EntityTarget<Entity>,
  ids: Array<Entity['id']>,
  options: LockOneOptions<Entity> = {}
): Promise<Map<string, Entity>> {
  assertActiveTransaction(manager);

  const uniqueIds = Array.from(
    new Map(ids.map((id) => [String(id), id] as const)).entries()
  ).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const rows = new Map<string, Entity>();

  for (const [normalizedId, originalId] of uniqueIds) {
    const row = await lockById(
      manager,
      target,
      originalId,
      options
    );

    if (row) rows.set(normalizedId, row);
  }

  return rows;
}

/**
 * Biến thể lockOne có fail-fast để service không lặp lại boilerplate null-check.
 * Caller chủ động truyền Error/AppError phù hợp với nghiệp vụ.
 */
export async function lockOneOrFail<Entity extends ObjectLiteral>(
  manager: EntityManager,
  target: EntityTarget<Entity>,
  where: FindOptionsWhere<Entity>,
  errorFactory: () => Error,
  options: LockOneOptions<Entity> = {}
): Promise<Entity> {
  const row = await lockOne(manager, target, where, options);
  if (!row) throw errorFactory();
  return row;
}

/**
 * Biến thể lockById có fail-fast.
 */
export async function lockByIdOrFail<
  Entity extends ObjectLiteral & { id: string | number }
>(
  manager: EntityManager,
  target: EntityTarget<Entity>,
  id: Entity['id'],
  errorFactory: () => Error,
  options: LockOneOptions<Entity> = {}
): Promise<Entity> {
  const row = await lockById(manager, target, id, options);
  if (!row) throw errorFactory();
  return row;
}
