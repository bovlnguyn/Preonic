import { buildMilestones } from '../utils/milestone.util';
import { getHarvestEligibility } from '../utils/harvet.util';

describe('Contract core utilities', () => {
  test('custom payment uses the contract deposit percentage instead of a hard-coded split', () => {
    const milestones = buildMilestones('custom', 1_000_000, 37.5);

    expect(milestones.map((item) => item.releasePercentage)).toEqual([37.5, 0, 0, 0, 62.5]);
    expect(milestones.reduce((sum, item) => sum + item.releaseAmount, 0)).toBe(1_000_000);
  });

  test('100_delivery releases at quality-check milestone, leaving final milestone for completion confirmation', () => {
    const milestones = buildMilestones('100_delivery', 2_000_000, 0);

    expect(milestones[3].releasePercentage).toBe(100);
    expect(milestones[4].releasePercentage).toBe(0);
  });

  test('harvest eligibility blocks a future harvest date and allows a past date', () => {
    expect(getHarvestEligibility('2099-01-01').shippingAllowed).toBe(false);
    expect(getHarvestEligibility('2020-01-01').shippingAllowed).toBe(true);
  });
});
