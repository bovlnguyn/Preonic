import cron from 'node-cron';
import { runWeatherCheckForAllUsers, cleanupOldAlerts } from '../services/weather.service';
import { WEATHER_CRON_SCHEDULE } from '../constants';
import { createLogger } from '../utils/logger';
import { logError } from '../services/systemLog.service';

const log = createLogger('WeatherCron');

const INITIAL_CATCHUP_DELAY_MS = 30_000;

// Job định kỳ: kiểm tra thời tiết cho toàn bộ user (tạo WeatherAlert + Notification), dọn dẹp alert cũ.
export async function runWeatherCronJob(): Promise<void> {
  log.info(`Starting weather check at ${new Date().toISOString()}`);

  try {
    const alertCount = await runWeatherCheckForAllUsers();
    log.info(`Created ${alertCount} weather alerts`);

    const cleanedCount = await cleanupOldAlerts();
    if (cleanedCount > 0) {
      log.info(`Cleaned up ${cleanedCount} old alerts`);
    }

    log.info(`Completed at ${new Date().toISOString()}`);
  } catch (error: any) {
    log.error('Weather cron failed', error);
    logError({
      category: 'cron',
      action: 'weather_cron_failed',
      message: `Weather cron that bai: ${error?.message ?? error}`,
      error,
    });
  }
}

let weatherCronStarted = false;

export function startWeatherCron(): void {
  if (weatherCronStarted) return;
  cron.schedule(WEATHER_CRON_SCHEDULE, () => {
    runWeatherCronJob();
  });

  weatherCronStarted = true;

  log.info('Scheduled to run every 6 hours');

  setTimeout(() => {
    log.info('Running initial weather check...');
    runWeatherCronJob();
  }, INITIAL_CATCHUP_DELAY_MS);
}
