import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { makeError } from '../utils/error.util';

const contractRepo = () => AppDataSource.getRepository(Contract);

const ACTIVE_VALUE_STATUSES = ['active', 'completed'];

// Gop 1 danh sach hop dong (cua 1 hoac nhieu nong dan) thanh cac ho so
// nha cung cap tong hop - dung chung cho getSuppliers va getSupplierDetail.
const aggregateSuppliers = (contracts: Contract[]) => {
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

  return Array.from(byFarmer.values()).map((supplier) => ({
    ...supplier,
    products: Array.from(supplier.products as Set<string>),
    // Key on nay do FE map sang nhan hien thi (giong cach lam voi Contract.status)
    status: supplier.activeContracts > 0 ? 'active' : 'inactive',
  }));
};

// Ho so nong dan da/dang hop tac voi doanh nghiep, tong hop tu lich su Contracts
// (chua co bang quan he "nha cung cap" rieng nen suy ra tu du lieu hop dong).
export const getSuppliers = async (enterpriseId: string) => {
  const contracts = await contractRepo()
    .createQueryBuilder('contract')
    .leftJoinAndSelect('contract.farmer', 'farmer')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .orderBy('contract.createdAt', 'DESC')
    .getMany();

  return aggregateSuppliers(contracts).sort((a, b) => b.totalValue - a.totalValue);
};

// Ho so chi tiet 1 nha cung cap (nong dan), gom so lieu tong hop va toan bo
// lich su hop dong voi doanh nghiep dang dang nhap.
export const getSupplierDetail = async (enterpriseId: string, farmerId: string) => {
  const contracts = await contractRepo()
    .createQueryBuilder('contract')
    .leftJoinAndSelect('contract.farmer', 'farmer')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere('contract.farmerId = :farmerId', { farmerId })
    .orderBy('contract.createdAt', 'DESC')
    .getMany();

  if (contracts.length === 0) {
    throw makeError('Khong tim thay nha cung cap', 404);
  }

  const [supplier] = aggregateSuppliers(contracts);

  return {
    ...supplier,
    contractHistory: contracts.map((contract) => ({
      id: contract.id,
      contractCode: contract.contractCode,
      productName: contract.productName,
      quantity: Number(contract.quantity || 0),
      unit: contract.unit,
      totalValue: Number(contract.totalValue || 0),
      deliveryDate: contract.deliveryDate,
      status: contract.status,
      createdAt: contract.createdAt,
    })),
  };
};
