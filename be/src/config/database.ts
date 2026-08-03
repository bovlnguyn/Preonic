import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { createLogger } from '../utils/logger';

const log = createLogger('DB');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 8_000;
const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 20_000;
const HEALTH_CHECK_INTERVAL_MS = 10_000;
const DESTROY_TIMEOUT_MS = 3_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let isConnecting = false;
let hasConnectedOnce = false;
let databaseHealthy = false;
let healthCheckRunning = false;
let monitorTimer: NodeJS.Timeout | null = null;
let shutdownHandlerRegistered = false;

function validateEnv(): void {
  const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required DB env vars: ${missing.join(', ')}`);
  }
}

function buildOptions(): DataSourceOptions {
  const instanceName = process.env.DB_INSTANCE || undefined;
  const port = instanceName ? undefined : Number(process.env.DB_PORT ?? 1433);

  return {
    type: 'mssql',
    host: process.env.DB_HOST ?? 'localhost',
    port,
    username: process.env.DB_USERNAME ?? 'sa',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'preonic',

    entities: [
      process.env.NODE_ENV === 'production'
        ? 'dist/models/**/*.entity.js'
        : 'src/models/**/*.entity.ts',
    ],

    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    migrations: [
      process.env.NODE_ENV === 'production'
        ? 'dist/migrations/**/*.js'
        : 'src/migrations/**/*.ts',
    ],
    logging: process.env.DB_LOGGING === 'true',

    connectionTimeout: CONNECT_TIMEOUT_MS,
    requestTimeout: REQUEST_TIMEOUT_MS,
    pool: {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      min: Number(process.env.DB_POOL_MIN ?? 0),
      acquireTimeoutMillis: Number(process.env.DB_POOL_ACQUIRE_TIMEOUT ?? 8_000),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT ?? 30_000),
      // Không đặt pool.errorHandler ở đây. Với TypeORM 0.3.x + mssql 10,
      // thuộc tính này bị chuyển tiếp xuống Tarn và gây lỗi:
      // "Tarn: unsupported option opt.errorHandler".
      // Lỗi kết nối vẫn được bắt ở attempt(), health check và global error handler.
    },

    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
      enableArithAbort: true,
      instanceName,
      connectTimeout: CONNECT_TIMEOUT_MS,
      cancelTimeout: 5_000,
      useUTC: true,
      appName: 'PreOnic API',
    },
  };
}

export let AppDataSource: DataSource;

export function isDatabaseConnected(): boolean {
  return Boolean(AppDataSource?.isInitialized && databaseHealthy);
}

export function hasDatabaseConnectedOnce(): boolean {
  return hasConnectedOnce;
}

export function isDatabaseUnavailableError(error: any): boolean {
  const code = String(error?.code || error?.originalError?.code || '').toUpperCase();
  const message = String(error?.message || error?.originalError?.message || '').toLowerCase();
  const databaseCodes = new Set([
    'ETIMEOUT',
    'ESOCKET',
    'ECONNCLOSED',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTOPEN',
    'EINSTLOOKUP',
  ]);

  return (
    databaseCodes.has(code) ||
    message.includes('failed to connect') ||
    message.includes('connection is closed') ||
    message.includes('connection lost') ||
    message.includes('socket hang up') ||
    message.includes('requests can only be made in the loggedin state') ||
    message.includes('database is not initialized')
  );
}

export function markDatabaseUnhealthy(error?: unknown): void {
  const wasHealthy = databaseHealthy;
  databaseHealthy = false;

  if (wasHealthy) {
    const message = (error as any)?.message || String(error || 'unknown database error');
    log.warn(`SQL Server connection became unavailable: ${message}`);
  }
}

const markDatabaseHealthy = (): void => {
  databaseHealthy = true;
};

const safeDestroy = async (): Promise<void> => {
  if (!AppDataSource?.isInitialized) return;

  try {
    await Promise.race([
      AppDataSource.destroy(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out while closing SQL connection')), DESTROY_TIMEOUT_MS)
      ),
    ]);
  } catch (error: any) {
    log.warn(`Could not close the old SQL connection cleanly: ${error?.message || error}`);
  }
};

const createFreshDataSource = (): void => {
  AppDataSource = new DataSource(buildOptions());
};

async function attempt(start: number, onFirstConnected?: () => void): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;

  try {
    for (let index = start; index <= MAX_RETRIES; index += 1) {
      const label = index === 0
        ? 'Connecting to SQL Server...'
        : `Reconnecting to SQL Server (attempt ${index}/${MAX_RETRIES})...`;
      log.info(label);

      try {
        await safeDestroy();
        createFreshDataSource();
        await AppDataSource.initialize();
        await AppDataSource.query('SELECT 1 AS healthy');

        const options = AppDataSource.options as any;
        const firstConnection = !hasConnectedOnce;

        markDatabaseHealthy();
        hasConnectedOnce = true;

        log.info(`SQL Server Connected: ${options.host}:${options.port ?? 1433}`);
        log.info(`Database: ${options.database}`);

        if (firstConnection) onFirstConnected?.();
        return;
      } catch (error: any) {
        markDatabaseUnhealthy(error);
        log.error(`SQL Server connection failed: ${error?.message || error}`);

        if (index < MAX_RETRIES) {
          log.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await sleep(RETRY_DELAY_MS);
        } else {
          log.error(
            'Max retries reached. API remains online and will keep checking the database in the background.'
          );
        }
      }
    }
  } finally {
    isConnecting = false;
  }
}

const monitorConnection = (): void => {
  if (monitorTimer) return;

  monitorTimer = setInterval(async () => {
    if (healthCheckRunning || isConnecting) return;
    healthCheckRunning = true;

    try {
      if (!AppDataSource?.isInitialized) {
        markDatabaseUnhealthy();
        void attempt(1);
        return;
      }

      await AppDataSource.query('SELECT 1 AS healthy');
      markDatabaseHealthy();
    } catch (error: any) {
      markDatabaseUnhealthy(error);
      await safeDestroy();
      void attempt(1);
    } finally {
      healthCheckRunning = false;
    }
  }, HEALTH_CHECK_INTERVAL_MS);

  monitorTimer.unref();
};

const registerShutdownHandler = (): void => {
  if (shutdownHandlerRegistered) return;
  shutdownHandlerRegistered = true;

  process.on('SIGINT', async () => {
    if (monitorTimer) clearInterval(monitorTimer);
    await safeDestroy();
    log.info('SQL Server connection closed through app termination');
    process.exit(0);
  });
};

export async function connectDB(onConnected?: () => void): Promise<void> {
  validateEnv();
  registerShutdownHandler();
  monitorConnection();
  await attempt(0, onConnected);
}

export default connectDB;