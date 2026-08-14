function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function vietnamTodayKey(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseExpectedDate(expectedDate?: string | Date | null): {
  date: Date | null;
  key: string | null;
} {
  if (!expectedDate) return { date: null, key: null };

  if (expectedDate instanceof Date) {
    if (Number.isNaN(expectedDate.getTime())) return { date: null, key: null };
    return {
      date: startOfDay(expectedDate),
      key: expectedDate.toISOString().slice(0, 10),
    };
  }

  const value = String(expectedDate).trim();
  if (!value || /^quanh nam$/i.test(value) || /^quanh năm$/i.test(value)) {
    return { date: null, key: null };
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const key = value.slice(0, 10);
    const [year, month, day] = key.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime())
      ? { date: null, key: null }
      : { date: startOfDay(parsed), key };
  }

  const parts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    const [, day, month, year] = parts;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(parsed.getTime())) return { date: null, key: null };
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: startOfDay(parsed), key };
  }

  return { date: null, key: null };
}

export function getHarvestEligibility(expectedDate?: string | Date | null): {
  harvestDate: Date | null;
  shippingAllowed: boolean;
  reason: string | null;
} {
  const parsed = parseExpectedDate(expectedDate);
  if (!parsed.date || !parsed.key) {
    return {
      harvestDate: null,
      shippingAllowed: true,
      reason: null,
    };
  }

  const shippingAllowed = vietnamTodayKey() >= parsed.key;

  return {
    harvestDate: parsed.date,
    shippingAllowed,
    reason: shippingAllowed
      ? null
      : `Chưa đến ngày thu hoạch. Bạn chỉ có thể xác nhận giao hàng từ ${parsed.date.toLocaleDateString('vi-VN')}.`,
  };
}
