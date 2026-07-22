import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';

const contractRepo = () => AppDataSource.getRepository(Contract);

const ACTIVE_VALUE_STATUSES = ['active', 'completed'];

// Ho so nong dan da/dang hop tac voi doanh nghiep, tong hop tu lich su Contracts
// (chua co bang quan he "nha cung cap" rieng nen suy ra tu du lieu hop dong).
export const getSuppliers = async (enterpriseId: string) => {
  const contracts = await contractRepo()
    .createQueryBuilder('contract')
    .leftJoinAndSelect('contract.farmer', 'farmer')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .orderBy('contract.createdAt', 'DESC')
    .getMany();

  const byFarmer = new Map<string, any>();

  for (const contract of contracts) {
    if (!byFarmer.has(contract.farmerId)) {
      const farmer = contract.farmer;
      const location = farmer
        ? [farmer.district, farmer.province].filter(Boolean).join(', ')
        : '';

      byFarmer.set(contract.farmerId, {
        id: contract.farmerId,
        name: contract.farmerName || farmer?.fullName || 'Nong dan',
        avatar: farmer?.avatar || null,
        location: location || contract.farmLocation || 'Chua cap nhat',
        rating: farmer ? Number(farmer.reputationScore || 0) : 0,
        products: new Set<string>(),
        contracts: 0,
        completedContracts: 0,
        activeContracts: 0,
        totalValue: 0,
        lastContractAt: contract.createdAt,
      });
    }

    const supplier = byFarmer.get(contract.farmerId);
    if (contract.productName) supplier.products.add(contract.productName);
    supplier.contracts += 1;
    if (contract.status === 'completed') supplier.completedContracts += 1;
    if (contract.status === 'active') supplier.activeContracts += 1;
    if (ACTIVE_VALUE_STATUSES.includes(contract.status)) {
      supplier.totalValue += Number(contract.totalValue || 0);
    }
  }

  return Array.from(byFarmer.values())
    .map((supplier) => ({
      ...supplier,
      products: Array.from(supplier.products as Set<string>),
      // Key on nay do FE map sang nhan hien thi (giong cach lam voi Contract.status)
      status: supplier.activeContracts > 0 ? 'active' : 'inactive',
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
};
