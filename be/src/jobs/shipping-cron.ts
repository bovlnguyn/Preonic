import cron from 'node-cron';
import { createLogger } from '../utils/logger';
import { remindPendingQualityChecks } from '../services/escrow.service';
import { logError } from '../services/systemLog.service';

const log = createLogger('ShippingCron');
let shippingCronStarted = false;

// Chay moi gio: nhac doanh nghiep xac nhan "Kiem tra chat luong" (moc 4)
// neu nong dan da xac nhan "Giao hang" (moc 3) tu 2 ngay truoc ma van chua xu ly.
export const startShippingCron = () => {
  if (shippingCronStarted) return;

  cron.schedule('0 * * * *', async () => {
    try {
      const count = await remindPendingQualityChecks();
      if (count > 0) {
        log.info(`Da gui ${count} nhac nho kiem tra chat luong`);
      }
    } catch (err: any) {
      log.error('Loi khi chay job nhac kiem tra chat luong:', err?.message ?? err);
      logError({
        category: 'cron',
        action: 'shipping_reminder_cron_failed',
        message: `Job nhac kiem tra chat luong that bai: ${err?.message ?? err}`,
        error: err,
      });
    }
  });

  shippingCronStarted = true;
  log.info('Da dang ky cron job nhac kiem tra chat luong (chay moi gio, tai phut 0)');
};
