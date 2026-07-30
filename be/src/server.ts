import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config(); // Load .env trước tất cả import khác

import app from './app';
import connectDB, { isDatabaseConnected } from './config/database';
import { createLogger } from './utils/logger';
import { startContractExpiryCron } from './jobs/contract-cron';
import { startWeatherCron } from './jobs/weather-cron';
import { startShippingCron } from './jobs/shipping-cron';

const log  = createLogger('Server');
const PORT = Number(process.env.PORT ?? 8080);

// ══════════════════════════════════════════════════════
// Khởi động server
// Giữ nguyên pattern: connectDB(onConnected) từ file gốc
// ══════════════════════════════════════════════════════
connectDB(() => {
  // onConnected: SQL Server đã kết nối thành công → mới listen
  const server = app.listen(PORT, () => {
    log.info(`Server running on port ${PORT}`);
    log.info(`Environment : ${process.env.NODE_ENV}`);
    log.info(`API prefix  : ${process.env.API_PREFIX ?? '/api/v1'}`);
    log.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });

  // Cron jobs — chi chay sau khi DB da ket noi thanh cong
  startContractExpiryCron();
  startWeatherCron();
  startShippingCron();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      log.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit sau 10s nếu server không đóng được
    setTimeout(() => {
      log.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  // SIGINT đã được xử lý trong database.ts (đóng SQL connection)
});

// Unhandled errors — giống file gốc
process.on('unhandledRejection', (reason: any) => {
  log.error('Unhandled Rejection:', reason?.message ?? reason);
});

process.on('uncaughtException', (err: Error) => {
  log.error('Uncaught Exception:', err.message);
  process.exit(1);
});