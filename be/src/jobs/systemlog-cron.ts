import cron from 'node-cron';
import { createLogger } from '../utils/logger';
import { cleanupOldSystemLogs, SYSTEM_LOG_RETENTION_DAYS } from '../services/systemLog.service';

const log = createLogger('SystemLogCron');
let systemLogCronStarted = false;

// Chay moi ngay luc 3h sang: xoa cac dong SystemLogs cu hon SYSTEM_LOG_RETENTION_DAYS ngay,
// tranh bang log phinh to vo han tren DB dung chung.
export const startSystemLogCleanupCron = () => {
  if (systemLogCronStarted) return;

  cron.schedule('0 3 * * *', async () => {
    try {
      const count = await cleanupOldSystemLogs();
      if (count > 0) {
        log.info(`Da xoa ${count} log cu hon ${SYSTEM_LOG_RETENTION_DAYS} ngay`);
      }
    } catch (err: any) {
      log.error('Loi khi chay job don dep system logs:', err?.message ?? err);
    }
  });

  systemLogCronStarted = true;
  log.info(`Da dang ky cron job don dep system logs (giu ${SYSTEM_LOG_RETENTION_DAYS} ngay, chay moi ngay luc 3h sang)`);
};
