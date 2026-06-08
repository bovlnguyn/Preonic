import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { createLogger } from '../utils/logger';

const log = createLogger('DB');

// ── Giữ nguyên constants từ file MongoDB gốc ──
const MAX_RETRIES    = 5;
const RETRY_DELAY_MS = 8_000;
const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 45_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Guard chống gọi chồng — giữ nguyên từ MongoDB ──
let isConnecting     = false;
let hasConnectedOnce = false;

// ── Kiểm tra connection string trước khi khởi động ──
function validateEnv(): void {
  const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required DB env vars: ${missing.join(', ')}`);
  }
}

// ── Cấu hình DataSource — đọc từ .env, khớp với schema preonic ──
function buildOptions(): DataSourceOptions {
  return {
    type:     'mssql',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 1433),
    username: process.env.DB_USERNAME ?? 'sa',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'preonic',

    // Quét toàn bộ entity — điều chỉnh path nếu build ra /dist
    entities: [
      process.env.NODE_ENV === 'production'
        ? 'dist/models/**/*.entity.js'
        : 'src/models/**/*.entity.ts',
    ],

    // false = không tự động tạo/sửa bảng (schema đã có sẵn từ file SQL)
    // Đặt true chỉ khi thêm cột mới trong dev và muốn TypeORM tự ALTER TABLE
    synchronize: process.env.DB_SYNCHRONIZE === 'true',

    // Migration files (dùng khi production)
    migrations: [
      process.env.NODE_ENV === 'production'
        ? 'dist/migrations/**/*.js'
        : 'src/migrations/**/*.ts',
    ],

    // Bật log SQL query khi debug
    logging: process.env.DB_LOGGING === 'true',

    options: {
      // false = dùng local SQL Server không cần SSL
      encrypt: process.env.DB_ENCRYPT === 'true',

      // true = bỏ qua lỗi certificate self-signed (môi trường dev)
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',

      connectTimeout: CONNECT_TIMEOUT_MS,
      requestTimeout: REQUEST_TIMEOUT_MS,

      // Bắt buộc với SQL Server 2017+ để tránh lỗi arithmetic overflow
      enableArithAbort: true,
    },
  };
}

// ── AppDataSource — export để dùng trong toàn bộ service/controller ──
export let AppDataSource: DataSource;

// ══════════════════════════════════════════════════════
// connectDB — giữ nguyên signature từ file MongoDB gốc
//   connectDB(onConnected?)
// ══════════════════════════════════════════════════════
export async function connectDB(onConnected?: () => void): Promise<void> {
  validateEnv();

  AppDataSource = new DataSource(buildOptions());

  // SIGINT — giữ nguyên từ MongoDB
  process.on('SIGINT', async () => {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
      log.info('SQL Server connection closed through app termination');
    }
    process.exit(0);
  });

  await attempt(0, onConnected);
}

// ── Các hàm tiện ích — giữ nguyên tên từ MongoDB để không phải đổi nơi gọi ──
export function isDatabaseConnected(): boolean {
  return AppDataSource?.isInitialized ?? false;
}

export function hasDatabaseConnectedOnce(): boolean {
  return hasConnectedOnce;
}

// ══════════════════════════════════════════════════════
// attempt — retry loop, giữ nguyên cấu trúc từ MongoDB
// ══════════════════════════════════════════════════════
async function attempt(start: number, onConnected?: () => void): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;

  for (let i = start; i <= MAX_RETRIES; i++) {
    const label = i === 0
      ? 'Connecting to SQL Server...'
      : `Reconnecting to SQL Server (attempt ${i}/${MAX_RETRIES})...`;
    log.info(label);

    try {
      await AppDataSource.initialize();

      // Log thông tin kết nối giống MongoDB gốc
      const opts = AppDataSource.options as any;
      log.info(`SQL Server Connected: ${opts.host}:${opts.port ?? 1433}`);
      log.info(`Database: ${opts.database}`);

      isConnecting     = false;
      hasConnectedOnce = true;

      if (onConnected) onConnected();

      // Bắt đầu monitor — thay thế event 'disconnected' của Mongoose
      monitorConnection();
      return;

    } catch (err: any) {
      log.error(`SQL Server connection failed: ${err.message}`);

      if (i < MAX_RETRIES) {
        log.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        log.error(
          'Max retries reached. Server running without DB — ' +
          'check DB_HOST, DB_USERNAME, DB_PASSWORD in .env'
        );
        isConnecting = false;
      }
    }
  }
}

// ══════════════════════════════════════════════════════
// monitorConnection
// TypeORM không có event 'disconnected' như Mongoose
// → dùng interval poll để phát hiện và tự reconnect
// ══════════════════════════════════════════════════════
function monitorConnection(): void {
  const CHECK_INTERVAL_MS = 15_000;

  const interval = setInterval(async () => {
    if (!AppDataSource?.isInitialized) {
      log.warn('SQL Server disconnected — reconnecting...');
      clearInterval(interval);

      // Tạo lại DataSource mới trước khi retry
      AppDataSource = new DataSource(buildOptions());
      attempt(1).catch(() => {});
    }
  }, CHECK_INTERVAL_MS);

  // Không block process exit
  interval.unref();
}

export default connectDB;