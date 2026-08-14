export const DEFAULT_COVERAGE_RATE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const dateOnlyTimestamp = (value?: string | Date | null): number | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      return Date.UTC(year, month - 1, day);
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Product dates are persisted as SQL DATE / ISO date-only values. Using UTC
  // components keeps a date like 2026-08-14 from drifting to 2026-08-13 when
  // the server/runtime timezone changes.
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const vietnamTodayTimestamp = (now: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return Date.UTC(value('year'), value('month') - 1, value('day'));
};

/**
 * Tiến độ mùa vụ là dữ liệu dẫn xuất từ ngày gieo trồng -> ngày thu hoạch.
 * Không tin giá trị progress do client gửi và không để số liệu bị đứng ở 0
 * chỉ vì sản phẩm không được update mỗi ngày.
 */
export const calculateCropProgress = (
  plantDate?: string | Date | null,
  expectedDate?: string | Date | null,
  now: Date = new Date()
): number => {
  const start = dateOnlyTimestamp(plantDate);
  const end = dateOnlyTimestamp(expectedDate);
  if (start == null || end == null || end < start) return 0;

  const today = vietnamTodayTimestamp(now);
  if (today <= start) return 0;
  if (today >= end) return 100;
  if (end === start) return 100;

  const progress = ((today - start) / (end - start)) * 100;
  return Number(clamp(progress, 0, 100).toFixed(2));
};

export const normalizeCoverageRate = (
  value: unknown,
  fallback: number = DEFAULT_COVERAGE_RATE
): number => {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
    throw new Error('Tỉ lệ bao tiêu phải là số nguyên từ 0 đến 100');
  }
  return numeric;
};
