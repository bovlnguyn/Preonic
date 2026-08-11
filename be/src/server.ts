import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import connectDB from './config/database';
import { createLogger } from './utils/logger';
import { startContractExpiryCron } from './jobs/contract-cron';
import { startWeatherCron } from './jobs/weather-cron';
import { startShippingCron } from './jobs/shipping-cron';
import { startSystemLogCleanupCron } from './jobs/systemlog-cron';

const log = createLogger('Server');
const PORT = Number(process.env.PORT ?? 8080);
let cronStarted = false;
let cronRetryTimer: NodeJS.Timeout | null = null;

// Khởi động HTTP trước để /health và /auth/logout vẫn phản hồi ngay cả khi
// Azure SQL đang gián đoạn. Các API cần dữ liệu sẽ được DB health guard trả 503.
const server = app.listen(PORT, () => {
  log.info(`Server running on port ${PORT}`);
  log.info(`Environment : ${process.env.NODE_ENV}`);
  log.info(`API prefix  : ${process.env.API_PREFIX ?? '/api/v1'}`);
  log.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
});

const startBackgroundJobs = () => {
  if (cronStarted) return;

  const jobs = [
    ['contract-expiry', startContractExpiryCron],
    ['weather', startWeatherCron],
    ['shipping', startShippingCron],
    ['system-log-cleanup', startSystemLogCleanupCron],
  ] as const;

  let failed = false;

  for (const [name, starter] of jobs) {
    try {
      starter();
    } catch (error: any) {
      failed = true;
      log.error(`Could not start ${name} cron:`, error?.message ?? error);
    }
  }

  if (!failed) {
    cronStarted = true;
    if (cronRetryTimer) {
      clearTimeout(cronRetryTimer);
      cronRetryTimer = null;
    }
    log.info('All background cron jobs are ready');
    return;
  }

  // Each cron starter is idempotent, so retrying is safe: jobs that already started
  // simply return, while only the failed starter is attempted again.
  if (!cronRetryTimer) {
    cronRetryTimer = setTimeout(() => {
      cronRetryTimer = null;
      startBackgroundJobs();
    }, 10_000);
    cronRetryTimer.unref();
  }
};

void connectDB(startBackgroundJobs).catch((error: any) => {
  log.error('Database bootstrap failed:', error?.message ?? error);
});

const shutdown = (signal: string) => {
  if (cronRetryTimer) clearTimeout(cronRetryTimer);
  log.info(`${signal} received — shutting down gracefully...`);
  server.close(() => {
    log.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    log.error('Forced exit after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason: any) => {
  log.error('Unhandled Rejection:', reason?.message ?? reason);
});

process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught Exception:', error.message);
  process.exit(1);
});
