const HCM_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface BillingMonthPeriod {
  year: number;
  month: number; // 1-12
  logicalStart: Date;
  logicalEnd: Date;
  queryStartUtc: Date;
  queryEndExclusiveUtc: Date;
}

export const getHoChiMinhBillingMonth = (
  year: number,
  month: number
): BillingMonthPeriod => {
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error('Billing year is invalid');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Billing month is invalid');
  }

  const startUtcMidnight = Date.UTC(year, month - 1, 1);
  const nextUtcMidnight = Date.UTC(year, month, 1);
  const endLogical = new Date(Date.UTC(year, month, 0));

  return {
    year,
    month,
    // SQL DATE values are logical calendar labels, not instants.
    logicalStart: new Date(startUtcMidnight),
    logicalEnd: endLogical,
    // CreatedAt timestamps are UTC instants. Vietnam is UTC+7 year-round.
    queryStartUtc: new Date(startUtcMidnight - HCM_OFFSET_MS),
    queryEndExclusiveUtc: new Date(nextUtcMidnight - HCM_OFFSET_MS),
  };
};

export const getPreviousCompletedHoChiMinhMonth = (
  now = new Date()
): BillingMonthPeriod => {
  const local = new Date(now.getTime() + HCM_OFFSET_MS);
  let year = local.getUTCFullYear();
  let month = local.getUTCMonth(); // previous month as 1-based; Jan => 0

  if (month === 0) {
    year -= 1;
    month = 12;
  }

  return getHoChiMinhBillingMonth(year, month);
};

export const formatBillingPeriodCode = (
  period: Pick<BillingMonthPeriod, 'year' | 'month'>
): string => `${period.year}${String(period.month).padStart(2, '0')}`;
