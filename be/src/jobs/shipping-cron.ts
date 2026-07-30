import cron from 'node-cron';
import { createLogger } from '../utils/logger';
import { remindPendingQualityChecks } from '../services/escrow.service';

const log = createLogger('ShippingCron');

// Chay moi gio: nhac doanh nghiep xac nhan "Kiem tra chat luong" (moc 4)
// neu nong dan da xac nhan "Giao hang" (moc 3) tu 2 ngay truoc ma van chua xu ly.
export const startShippingCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await remindPendingQualityChecks();
      if (count > 0) {
        log.info(`Da gui ${count} nhac nho kiem tra chat luong`);
      }
    } catch (err: any) {
      log.error('Loi khi chay job nhac kiem tra chat luong:', err?.message ?? err);
    }
  });

  log.info('Da dang ky cron job nhac kiem tra chat luong (chay moi gio, tai phut 0)');
};
