import { __supplierStatsForTest } from '../services/enterprise.service';

const farmer = {
  fullName: 'Nông dân A',
  avatar: null,
  district: 'Hải Châu',
  province: 'Đà Nẵng',
  reputationScore: 4.5,
  totalRatings: 2,
};

const makeContract = (overrides: Record<string, any> = {}) => ({
  farmerId: 'farmer-1',
  farmerName: 'Nông dân A',
  farmer,
  farmLocation: 'Đà Nẵng',
  productName: 'Xoài',
  totalValue: 10_000_000,
  status: 'draft',
  signedByFarmer: false,
  signedByEnterprise: false,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  ...overrides,
}) as any;

describe('supplier statistics', () => {
  test('draft và đề xuất bị hủy trước khi ký không tạo nhà cung cấp', () => {
    const result = __supplierStatsForTest.aggregateSuppliers([
      makeContract({ status: 'draft' }),
      makeContract({ status: 'cancelled' }),
    ]);
    expect(result).toHaveLength(0);
  });

  test('hợp đồng đã ký mới được tính vào hồ sơ nhà cung cấp', () => {
    const result = __supplierStatsForTest.aggregateSuppliers([
      makeContract({ status: 'active', signedByFarmer: true, signedByEnterprise: true }),
      makeContract({ status: 'completed', signedByFarmer: true, signedByEnterprise: true, totalValue: 20_000_000 }),
      makeContract({ status: 'draft', totalValue: 99_000_000 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].contracts).toBe(2);
    expect(result[0].completedContracts).toBe(1);
    expect(result[0].activeContracts).toBe(1);
    expect(result[0].totalValue).toBe(30_000_000);
    expect(result[0].status).toBe('active');
  });

  test('hợp đồng đã ký rồi hủy vẫn giữ lịch sử quan hệ nhưng không cộng giá trị giao dịch hiện hành', () => {
    const result = __supplierStatsForTest.aggregateSuppliers([
      makeContract({
        status: 'cancelled',
        signedByFarmer: true,
        signedByEnterprise: true,
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].contracts).toBe(1);
    expect(result[0].completedContracts).toBe(0);
    expect(result[0].totalValue).toBe(0);
    expect(result[0].status).toBe('inactive');
  });
});
