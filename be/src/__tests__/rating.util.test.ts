import {
  calculateRatingAverage,
  isWholeStarRating,
  normalizeReputation,
} from '../utils/rating.util';

describe('rating utilities', () => {
  test('keeps two-decimal precision for three-criteria averages', () => {
    expect(calculateRatingAverage([5, 4, 4])).toBe(4.33);
    expect(calculateRatingAverage([5, 5, 4])).toBe(4.67);
  });

  test('only accepts whole-star scores from 1 to 5', () => {
    expect(isWholeStarRating(1)).toBe(true);
    expect(isWholeStarRating(5)).toBe(true);
    expect(isWholeStarRating(4.5)).toBe(false);
    expect(isWholeStarRating(Number.NaN)).toBe(false);
    expect(isWholeStarRating(6)).toBe(false);
  });

  test('does not turn an unrated account into a five-star account', () => {
    expect(normalizeReputation(5, 0)).toEqual({
      reputationScore: 0,
      totalRatings: 0,
      hasRatings: false,
    });

    expect(normalizeReputation(4.33, 3)).toEqual({
      reputationScore: 4.33,
      totalRatings: 3,
      hasRatings: true,
    });
  });
});
