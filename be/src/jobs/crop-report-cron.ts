import cron from 'node-cron';
import { createDuePeriodicCropRequests } from '../services/order.service';
import { createLogger } from '../utils/logger';

const log = createLogger('CropReportCron');
let started = false;

export const startCropReportCron = () => {
  if (started) return;
  started = true;

  cron.schedule('15 1 * * *', async () => {
    try {
      const created = await createDuePeriodicCropRequests();
      if (created) log.info(`Created ${created} periodic crop report request(s)`);
    } catch (error: any) {
      log.error('Periodic crop report check failed:', error?.message || error);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
};
