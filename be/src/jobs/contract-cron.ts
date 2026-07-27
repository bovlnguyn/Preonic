import cron from 'node-cron';
import { createLogger } from '../utils/logger';
import { expireUnsignedContracts } from '../services/contract.service';

const log = createLogger('ContractCron');

// Chay moi gio: tu dong huy hop dong con o trang thai 'draft' (nong dan chua ky)
// qua han CONTRACT_CONFIG.FARMER_SIGN_DEADLINE_DAYS ke tu ngay tao.
export const startContractExpiryCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await expireUnsignedContracts();
      if (count > 0) {
        log.info(`Da tu dong huy ${count} hop dong qua han nong dan chua ky`);
      }
    } catch (err: any) {
      log.error('Loi khi chay job huy hop dong qua han:', err?.message ?? err);
    }
  });

  log.info('Da dang ky cron job kiem tra hop dong qua han ky (chay moi gio, tai phut 0)');
};
