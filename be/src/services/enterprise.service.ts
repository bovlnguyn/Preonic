import { SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { makeError } from '../utils/error.util';
import { normalizeReputation } from '../utils/rating.util';

const contractRepo = () => AppDataSource.getRepository(Contract);

// Một nhà cung cấp chỉ được xem là đã hình thành quan hệ hợp tác khi hợp đồng
// đã được cả hai bên ký (hoặc đang ở các trạng thái chỉ xuất hiện sau khi ký).
// Draft/pending chưa ký và cancelled do từ chối đề xuất không còn làm phình số liệu.
const SIGNED_RELATIONSHIP_STATUSES = ['approved', 'active', 'cancel_pending', 'completed', 'disputed'];
const IN_PROGRESS_RELATIONSHIP_STATUSES = ['approved', 'active', 'cancel_pending', 'disputed'];
const VALUE_STATUSES = ['approved', 'active', 'cancel_pending', 'completed', 'disputed'];

const isSupplierRelationshipContract = (contract: Contract) =>
  Boolean(
    (contract.signedByFarmer && contract.signedByEnterprise) ||
    SIGNED_RELATIONSHIP_STATUSES.includes(contract.status)
  );

// Gop 1 danh sach hop dong (cua 1 hoac nhieu nong dan) thanh cac ho so
// nha cung cap tong hop - dung chung cho getSuppliers va getSupplierDetail.
const aggregateSuppliers = (contracts: Contract[]) => {
  const byFarmer = new Map<string, any>();

  for (const contract of contracts.filter(isSupplierRelationshipContract)) {
    if (!byFarmer.has(contract.farmerId)) {
      const farmer = contract.farmer;
      const location = farmer
        ? [farmer.district, farmer.province].filter(Boolean).join(', ')
        : '';

      const reputation = farmer
        ? normalizeReputation(farmer.reputationScore, farmer.totalRatings)
        : normalizeReputation(0, 0);

      byFarmer.set(contract.farmerId, {
        id: contract.farmerId,
        name: contract.farmerName || farmer?.fullName || 'Nong dan',
        avatar: farmer?.avatar || null,
        location: location || contract.farmLocation || 'Chua cap nhat',
        rating: reputation.reputationScore,
        totalRatings: reputation.totalRatings,
        hasRatings: reputation.hasRatings,
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
    if (IN_PROGRESS_RELATIONSHIP_STATUSES.includes(contract.status)) {
      supplier.activeContracts += 1;
    }
    if (VALUE_STATUSES.includes(contract.status)) {
      supplier.totalValue += Number(contract.totalValue || 0);
    }

    if (
      contract.createdAt &&
      (!supplier.lastContractAt || new Date(contract.createdAt) > new Date(supplier.lastContractAt))
    ) {
      supplier.lastContractAt = contract.createdAt;
    }
  }

  return Array.from(byFarmer.values()).map((supplier) => ({
    ...supplier,
    products: Array.from(supplier.products as Set<string>),
    // Key on nay do FE map sang nhan hien thi (giong cach lam voi Contract.status)
    status: supplier.activeContracts > 0 ? 'active' : 'inactive',
  }));
};

// Ho so nong dan da/dang hop tac voi doanh nghiep, tong hop truc tiep tai SQL.
// Fix 08: khong tai toan bo lich su Contracts ve Node de group/sort nua.
export interface SupplierListQuery {
  page?: number;
  limit?: number;
}

const relationshipSql = `(
  (contract.signedByFarmer = :signed AND contract.signedByEnterprise = :signed)
  OR contract.status IN (:...relationshipStatuses)
)`;

const relationshipParams = {
  signed: true,
  relationshipStatuses: SIGNED_RELATIONSHIP_STATUSES,
};

const normalizeSupplierPage = (query: SupplierListQuery = {}) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Math.floor(Number(query.page))
    : 1;
  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Math.floor(Number(query.limit)), 50)
    : 12;
  return { page, limit };
};

const supplierStatsSelect = (qb: SelectQueryBuilder<Contract>) =>
  qb
    .select('contract.farmerId', 'id')
    .addSelect('MAX(contract.farmerName)', 'snapshotName')
    .addSelect('MAX(contract.farmLocation)', 'farmLocation')
    .addSelect('MAX(farmer.fullName)', 'fullName')
    .addSelect('MAX(farmer.avatar)', 'avatar')
    .addSelect('MAX(farmer.district)', 'district')
    .addSelect('MAX(farmer.province)', 'province')
    .addSelect('MAX(farmer.reputationScore)', 'reputationScore')
    .addSelect('MAX(farmer.totalRatings)', 'totalRatings')
    .addSelect('COUNT_BIG(*)', 'contracts')
    .addSelect(`SUM(CASE WHEN contract.status = 'completed' THEN 1 ELSE 0 END)`, 'completedContracts')
    .addSelect(
      `SUM(CASE WHEN contract.status IN (:...inProgressStatuses) THEN 1 ELSE 0 END)`,
      'activeContracts'
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN contract.status IN (:...valueStatuses) THEN contract.totalValue ELSE 0 END), 0)`,
      'totalValue'
    )
    .addSelect('MAX(contract.createdAt)', 'lastContractAt')
    .setParameters({
      ...relationshipParams,
      inProgressStatuses: IN_PROGRESS_RELATIONSHIP_STATUSES,
      valueStatuses: VALUE_STATUSES,
    })
    .groupBy('contract.farmerId');

const supplierFromRaw = (row: any, products: string[] = []) => {
  const reputation = normalizeReputation(
    Number(row?.reputationScore || 0),
    Number(row?.totalRatings || 0)
  );
  const location = [row?.district, row?.province].filter(Boolean).join(', ');
  const activeContracts = Number(row?.activeContracts || 0);

  return {
    id: row.id,
    name: row.snapshotName || row.fullName || 'Nong dan',
    avatar: row.avatar || null,
    location: location || row.farmLocation || 'Chua cap nhat',
    rating: reputation.reputationScore,
    totalRatings: reputation.totalRatings,
    hasRatings: reputation.hasRatings,
    products,
    contracts: Number(row.contracts || 0),
    completedContracts: Number(row.completedContracts || 0),
    activeContracts,
    totalValue: Number(row.totalValue || 0),
    lastContractAt: row.lastContractAt || null,
    status: activeContracts > 0 ? 'active' : 'inactive',
  };
};

const getProductsByFarmers = async (enterpriseId: string, farmerIds: string[]) => {
  if (farmerIds.length === 0) return new Map<string, string[]>();

  const rows = await contractRepo()
    .createQueryBuilder('contract')
    .select('contract.farmerId', 'farmerId')
    .addSelect('contract.productName', 'productName')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere('contract.farmerId IN (:...farmerIds)', { farmerIds })
    .andWhere(relationshipSql, relationshipParams)
    .andWhere('contract.productName IS NOT NULL')
    .groupBy('contract.farmerId')
    .addGroupBy('contract.productName')
    .getRawMany();

  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!map.has(row.farmerId)) map.set(row.farmerId, []);
    if (row.productName) map.get(row.farmerId)!.push(row.productName);
  }
  return map;
};

export const getSuppliers = async (enterpriseId: string, query: SupplierListQuery = {}) => {
  const { page, limit } = normalizeSupplierPage(query);

  const countRow = await contractRepo()
    .createQueryBuilder('contract')
    .select('COUNT(DISTINCT contract.farmerId)', 'total')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere(relationshipSql, relationshipParams)
    .getRawOne();

  const total = Number(countRow?.total || 0);
  if (total === 0) {
    return {
      suppliers: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const qb = contractRepo()
    .createQueryBuilder('contract')
    .leftJoin('contract.farmer', 'farmer')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere(relationshipSql, relationshipParams);

  const rows = await supplierStatsSelect(qb)
    .orderBy('totalValue', 'DESC')
    .addOrderBy('lastContractAt', 'DESC')
    .offset((page - 1) * limit)
    .limit(limit)
    .getRawMany();

  const farmerIds = rows.map((row: any) => row.id).filter(Boolean);
  const productsByFarmer = await getProductsByFarmers(enterpriseId, farmerIds);

  return {
    suppliers: rows.map((row: any) => supplierFromRaw(row, productsByFarmer.get(row.id) || [])),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Chi tiet nha cung cap: KPI tong hop bang SQL, lich su hop dong phan trang
// tai database thay vi load toan bo roi slice tren frontend.
export const getSupplierDetail = async (
  enterpriseId: string,
  farmerId: string,
  query: SupplierListQuery = {}
) => {
  const { page, limit } = normalizeSupplierPage({ ...query, limit: query.limit || 5 });

  const statsQb = contractRepo()
    .createQueryBuilder('contract')
    .leftJoin('contract.farmer', 'farmer')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere('contract.farmerId = :farmerId', { farmerId })
    .andWhere(relationshipSql, relationshipParams);

  const rows = await supplierStatsSelect(statsQb).getRawMany();
  if (rows.length === 0) throw makeError('Khong tim thay nha cung cap', 404);

  const productsByFarmer = await getProductsByFarmers(enterpriseId, [farmerId]);
  const supplier = supplierFromRaw(rows[0], productsByFarmer.get(farmerId) || []);

  const historyQb = contractRepo()
    .createQueryBuilder('contract')
    .where('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere('contract.farmerId = :farmerId', { farmerId })
    .orderBy('contract.createdAt', 'DESC')
    .addOrderBy('contract.id', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [contracts, totalHistory] = await historyQb.getManyAndCount();

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
      signedByFarmer: contract.signedByFarmer,
      signedByEnterprise: contract.signedByEnterprise,
      createdAt: contract.createdAt,
    })),
    pagination: {
      page,
      limit,
      total: totalHistory,
      totalPages: Math.ceil(totalHistory / limit),
    },
  };
};

// Chỉ export cho unit test; API public vẫn đi qua các hàm service ở trên.
export const __supplierStatsForTest = {
  isSupplierRelationshipContract,
  aggregateSuppliers,
};
