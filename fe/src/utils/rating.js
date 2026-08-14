export const getRatingSummary = (score, totalRatings) => {
  const count = Math.max(0, Number(totalRatings) || 0);
  const rawScore = Number(score);

  return {
    score: count > 0 && Number.isFinite(rawScore) ? rawScore : 0,
    count,
    hasRatings: count > 0,
  };
};

export const formatRatingValue = (score, maximumFractionDigits = 2) => {
  const value = Number(score);
  if (!Number.isFinite(value)) return '—';

  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

export const formatReputation = (score, totalRatings, maximumFractionDigits = 1) => {
  const summary = getRatingSummary(score, totalRatings);
  if (!summary.hasRatings) return 'Chưa có';
  return `${formatRatingValue(summary.score, maximumFractionDigits)}/5`;
};
