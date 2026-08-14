export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_COMMENT_MAX_LENGTH = 2000;

/**
 * Rating UI cua PreOnic dung sao nguyen 1..5. Validate lai o backend de
 * request goi truc tiep khong the chen NaN, 4.5 hoac gia tri ngoai khoang.
 */
export const isWholeStarRating = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= RATING_MIN &&
  value <= RATING_MAX;

/**
 * Tinh diem trung binh voi do chinh xac 2 chu so thap phan - phu hop
 * decimal(3,2) o SQL Server. Mang rong tra ve 0 thay vi NaN.
 */
export const calculateRatingAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(average.toFixed(2));
};

/**
 * Khong co danh gia khong dong nghia 5 sao. totalRatings la nguon xac dinh
 * user da co reputation hay chua; score 0 duoc giu de FE hien "Chua co".
 */
export const normalizeReputation = (
  reputationScore: unknown,
  totalRatings: unknown
): { reputationScore: number; totalRatings: number; hasRatings: boolean } => {
  const count = Math.max(0, Number(totalRatings) || 0);
  const rawScore = Number(reputationScore);
  const score = count > 0 && Number.isFinite(rawScore)
    ? Math.min(RATING_MAX, Math.max(RATING_MIN, rawScore))
    : 0;

  return {
    reputationScore: Number(score.toFixed(2)),
    totalRatings: count,
    hasRatings: count > 0,
  };
};
