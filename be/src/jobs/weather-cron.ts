import cron from 'node-cron';
import { runWeatherCheckForAllUsers, cleanupOldAlerts } from '../services/weather.service';
import { WEATHER_CRON_SCHEDULE } from '../constants';
import { createLogger } from '../utils/logger';

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
  } catch (error) {
    log.error('Weather cron failed', error);
  }
}

export function startWeatherCron(): void {
  cron.schedule(WEATHER_CRON_SCHEDULE, () => {
    runWeatherCronJob();
  });

  log.info('Scheduled to run every 6 hours');

  setTimeout(() => {
    log.info('Running initial weather check...');
    runWeatherCronJob();
  }, INITIAL_CATCHUP_DELAY_MS);
}
