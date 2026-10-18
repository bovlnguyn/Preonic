import { getHarvestEligibility } from '../utils/harvet.util';

describe('Contract core utilities', () => {
  test('harvest eligibility blocks a future harvest date and allows a past date', () => {
    expect(getHarvestEligibility('2099-01-01').shippingAllowed).toBe(false);
    expect(getHarvestEligibility('2020-01-01').shippingAllowed).toBe(true);
  });
});
