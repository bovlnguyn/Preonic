import {
  calculateCropProgress,
  normalizeCoverageRate,
} from '../utils/product-lifecycle.util';

describe('product lifecycle helpers', () => {
  test('tính tiến độ mùa vụ theo ngày gieo trồng và ngày thu hoạch', () => {
    const now = new Date('2026-08-14T05:00:00.000Z'); // 12:00 tại Việt Nam
    expect(calculateCropProgress('2026-08-04', '2026-08-24', now)).toBe(50);
  });

  test('tiến độ được chặn trong khoảng 0-100', () => {
    expect(calculateCropProgress('2026-08-20', '2026-08-30', new Date('2026-08-14T05:00:00Z'))).toBe(0);
    expect(calculateCropProgress('2026-08-01', '2026-08-10', new Date('2026-08-14T05:00:00Z'))).toBe(100);
  });

  test('thiếu hoặc sai thứ tự ngày trả về 0 thay vì NaN', () => {
    expect(calculateCropProgress(null, '2026-08-20')).toBe(0);
    expect(calculateCropProgress('2026-08-20', '2026-08-10')).toBe(0);
  });

  test('coverageRate mặc định là 50 và chỉ nhận số nguyên 0-100', () => {
    expect(normalizeCoverageRate(undefined)).toBe(50);
    expect(normalizeCoverageRate('75')).toBe(75);
    expect(normalizeCoverageRate(0)).toBe(0);
    expect(normalizeCoverageRate(100)).toBe(100);
    expect(() => normalizeCoverageRate(50.5)).toThrow();
    expect(() => normalizeCoverageRate(101)).toThrow();
    expect(() => normalizeCoverageRate(-1)).toThrow();
  });
});
