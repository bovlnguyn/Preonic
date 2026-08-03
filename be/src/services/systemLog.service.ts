import { LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemLog } from '../models/SystemLog.entity';
import { createLogger } from '../utils/logger';

const log = createLogger('SystemLog');
const repo = () => AppDataSource.getRepository(SystemLog);

export const SYSTEM_LOG_RETENTION_DAYS = 30;

export type LogCategory = 'auth' | 'contract' | 'escrow' | 'dispute' | 'payment' | 'cron' | 'api';

export interface LogActionParams {
  category: LogCategory;
  action: string;
  message: string;
  userId?: string | null;
  targetType?: string;
  targetId?: string | number;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface LogErrorParams extends LogActionParams {
  level?: 'warn' | 'error';
  error?: unknown;
}

// Ghi log không bao giờ được làm fail nghiệp vụ chính đang gọi nó — nuốt lỗi,
// chỉ console.error nếu chính việc ghi log thất bại. Không await ở nơi gọi.
const write = async (entry: Partial<SystemLog>) => {
  try {
    if (!AppDataSource?.isInitialized) return;
    await repo().save(repo().create(entry));
  } catch (err: any) {
    log.error('Khong the ghi system log:', err?.message ?? err);
  }
};

export const logAction = (params: LogActionParams): void => {
  void write({
    category: params.category,
    action: params.action,
    level: 'info',
    userId: params.userId ?? null,
    targetType: params.targetType ?? null,
    targetId: params.targetId != null ? String(params.targetId) : null,
    message: params.message,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    ipAddress: params.ipAddress ?? null,
  });
};

export const logError = (params: LogErrorParams): void => {
  const err = params.error as any;
  void write({
    category: params.category,
    action: params.action,
    level: params.level ?? 'error',
    userId: params.userId ?? null,
    targetType: params.targetType ?? null,
    targetId: params.targetId != null ? String(params.targetId) : null,
    message: params.message,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    stackTrace: err?.stack ? String(err.stack).slice(0, 8000) : null,
    ipAddress: params.ipAddress ?? null,
  });
};

// ══════════════════════════════════════════
// Truy vấn cho Admin
// ══════════════════════════════════════════
export interface SystemLogFilters {
  category?: string;
  level?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const getSystemLogs = async (filters: SystemLogFilters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Math.min(Number(filters.limit) || 20, 100);

  const qb = repo().createQueryBuilder('log').leftJoinAndSelect('log.user', 'user');

  if (filters.category) qb.andWhere('log.Category = :category', { category: filters.category });
  if (filters.level) qb.andWhere('log.Level = :level', { level: filters.level });
  if (filters.userId) qb.andWhere('log.UserId = :userId', { userId: filters.userId });
  if (filters.from) qb.andWhere('log.CreatedAt >= :from', { from: new Date(filters.from) });
  if (filters.to) qb.andWhere('log.CreatedAt <= :to', { to: new Date(filters.to) });
  if (filters.search) {
    const search = `%${filters.search.trim()}%`;
    qb.andWhere('(log.Message LIKE :search OR log.Action LIKE :search)', { search });
  }

  qb.orderBy('log.createdAt', 'DESC');
  qb.skip((page - 1) * limit).take(limit);

  const [logs, total] = await qb.getManyAndCount();

  const statsRaw = await repo()
    .createQueryBuilder('log')
    .select('log.Level', 'level')
    .addSelect('COUNT(*)', 'count')
    .groupBy('log.Level')
    .getRawMany();

  const stats: Record<string, number> = { info: 0, warn: 0, error: 0 };
  for (const row of statsRaw) stats[row.level] = Number(row.count);

  return {
    logs,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    stats,
  };
};

export const getSystemLogById = async (id: number) => {
  return repo().findOne({ where: { id }, relations: ['user'] });
};

// ══════════════════════════════════════════
// Dọn dẹp log cũ — chạy định kỳ qua cron (xem jobs/systemlog-cron.ts)
// ══════════════════════════════════════════
export const cleanupOldSystemLogs = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - SYSTEM_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await repo().delete({ createdAt: LessThan(cutoff) });
  return result.affected ?? 0;
};
