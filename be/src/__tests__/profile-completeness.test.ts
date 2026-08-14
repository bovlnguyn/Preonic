import { User } from '../models/User.entity';

const baseUser = (role: 'farmer' | 'enterprise') => {
  const user = new User();
  user.role = role;
  user.firstName = 'An';
  user.lastName = 'Nguyen';
  user.phone = '0900000000';
  user.province = 'Da Nang';
  user.district = 'Quận Hải Châu';
  user.address = '123 Nguyen Van Linh';
  return user;
};

describe('User.isProfileComplete', () => {
  it('requires farmName for farmer business actions', () => {
    const user = baseUser('farmer');
    expect(user.isProfileComplete()).toBe(false);
    user.farmName = 'Trang trai PreOnic';
    expect(user.isProfileComplete()).toBe(true);
  });

  it('requires companyName and taxCode for enterprise business actions', () => {
    const user = baseUser('enterprise');
    user.companyName = 'PreOnic Co.';
    expect(user.isProfileComplete()).toBe(false);
    user.taxCode = '0312345678';
    expect(user.isProfileComplete()).toBe(true);
  });

  it('does not consider an address-less account complete', () => {
    const user = baseUser('farmer');
    user.farmName = 'Trang trai PreOnic';
    user.address = '';
    expect(user.isProfileComplete()).toBe(false);
  });
});
