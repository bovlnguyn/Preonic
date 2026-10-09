import cron from 'node-cron';
import { createLogger } from '../utils/logger';
import { logError } from '../services/systemLog.service';
import { generatePreviousMonthFeeStatements } from '../modules/direct-payment-v2/fee-statement.service';
import { refreshFeeBillingEnforcement } from '../modules/direct-payment-v2/billing-enforcement.service';

const log = createLogger('FeeBillingCron');
let feeBillingCronStarted = false;

export const startFeeBillingCron = () => {
  if (feeBillingCronStarted) return;

  // Run daily. Statement generation is idempotent, so running every day also
  // recovers automatically if the server was offline on the first day of a month.
  cron.schedule('15 1 * * *', async () => {
    try {
      const statementResult = await generatePreviousMonthFeeStatements();
      const enforcementResult = await refreshFeeBillingEnforcement();

      if (
        statementResult.created > 0 ||
        enforcementResult.restricted > 0 ||
        enforcementResult.unrestricted > 0
      ) {
        log.info(
          `Fee billing: statements=${statementResult.created}, ` +
          `restricted=${enforcementResult.restricted}, ` +
          `unrestricted=${enforcementResult.unrestricted}`
        );
      }
    } catch (err: any) {
      log.error('Fee billing cron failed:', err?.message ?? err);
      logError({
        category: 'cron',
        action: 'fee_billing_cron_failed',
        message: `Fee billing cron failed: ${err?.message ?? err}`,
        error: err,
      });
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh',
  });

  feeBillingCronStarted = true;
  log.info('Registered fee billing cron (daily 01:15 Asia/Ho_Chi_Minh)');
};
