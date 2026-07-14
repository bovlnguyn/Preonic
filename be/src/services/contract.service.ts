import { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CONTRACT_CONFIG, UNIT_TO_KG } from '../constants';
import { Contract } from '../models/Contract.entity';
import { Product } from '../models/Product.entity';
import { User } from '../models/User.entity';
import { Notification } from '../models/Notification.entity';

const toKg = (value: number, unit?: string | null) => value * (UNIT_TO_KG[unit || 'kg'] ?? 1);

const contractRepo = () => AppDataSource.getRepository(Contract);
const productRepo = () => AppDataSource.getRepository(Product);
const userRepo = () => AppDataSource.getRepository(User);
const notificationRepo = () => AppDataSource.getRepository(Notification);

const PAYMENT_TERMS = ['50_50', '30_70', '100_delivery', '100_upfront'] as const;
type PaymentTerms = (typeof PAYMENT_TERMS)[number];

const CONTRACT_STATUSES = [
  'draft',
  'pending',
  'approved',
  'active',
  'completed',
  'cancelled',
  'disputed',
] as const;

const CONTRACT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'deliveryDate',
  'totalValue',
  'status',
] as const;

type ContractStatus = (typeof CONTRACT_STATUSES)[number];
type ContractSortField = (typeof CONTRACT_SORT_FIELDS)[number];

export interface ListContractsQuery {
  status?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export interface CreateContractDto {
  productId: string;
  quantity: number;
  pricePerUnit: number;
  unit?: string;
  paymentTerms: PaymentTerms;
  deliveryDate?: string;
  notes?: string;
  farmLocation?: string;
  depositPercentage?: number;
  insuranceEnabled?: boolean;
  insuranceProvider?: string;
  insurancePackage?: string;
  insuranceFee?: number;
}

export interface CancelContractDto {
  reason: string;
}

const displayName = (user: User) =>
  user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

const ensurePaymentTerms = (value: string): PaymentTerms => {
  if (!PAYMENT_TERMS.includes(value as PaymentTerms)) {
    throw makeError('Dieu khoan thanh toan khong hop le');
  }
  return value as PaymentTerms;
};

const generateContractCode = async () => {
  const year = new Date().getFullYear();

  for (let i = 0; i < CONTRACT_CONFIG.MAX_CODE_GENERATION_ATTEMPTS; i++) {
    const sequence = Math.floor(
      CONTRACT_CONFIG.CODE_SEQUENCE_MIN +
      Math.random() * CONTRACT_CONFIG.CODE_SEQUENCE_SPAN
    );
    const code = `${CONTRACT_CONFIG.CODE_PREFIX}-${year}-${sequence}`;

    const exists = await contractRepo().findOne({ where: { contractCode: code } });
    if (!exists) return code;
  }

  throw makeError('Khong the tao ma hop dong', 500);
};

export const createContractProposal = async (
  enterpriseId: string,
  dto: CreateContractDto
) => {
  if (!dto.productId) throw makeError('Vui long chon san pham');
  if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
    throw makeError('So luong phai lon hon 0');
  }
  if (!Number.isFinite(dto.pricePerUnit) || dto.pricePerUnit <= 0) {
    throw makeError('Don gia phai lon hon 0');
  }

  const paymentTerms = ensurePaymentTerms(dto.paymentTerms);
  const depositPercentage = dto.depositPercentage ?? 0;
  if (!Number.isFinite(depositPercentage) || depositPercentage < 0 || depositPercentage > 100) {
    throw makeError('Ty le dat coc phai nam trong khoang 0-100');
  }

  const insuranceFee = dto.insuranceFee ?? 0;
  if (!Number.isFinite(insuranceFee) || insuranceFee < 0) {
    throw makeError('Phi bao hiem khong hop le');
  }

  const enterprise = await userRepo().findOne({ where: { id: enterpriseId } });
  if (!enterprise) throw makeError('Khong tim thay doanh nghiep', 404);
  if (enterprise.role !== 'enterprise') {
    throw makeError('Chi doanh nghiep moi co the tao de xuat hop dong', 403);
  }

  const product = await productRepo().findOne({
    where: { id: dto.productId, isActive: true },
  });
  if (!product) throw makeError('Khong tim thay san pham', 404);
  if (!product.sellerUserId) throw makeError('San pham chua co thong tin nguoi ban');
  if (product.sellerUserId === enterpriseId) {
    throw makeError('Khong the tao hop dong voi san pham cua chinh minh');
  }
  const quantityUnit = dto.unit || product.unit;
  if (
    product.remaining != null &&
    toKg(Number(product.remaining), product.unit) < toKg(dto.quantity, quantityUnit)
  ) {
    throw makeError('So luong de xuat vuot qua so luong con lai');
  }

  const farmer = await userRepo().findOne({ where: { id: product.sellerUserId } });
  if (!farmer) throw makeError('Khong tim thay nong dan ban san pham', 404);

  const totalValue = dto.quantity * dto.pricePerUnit;
  const commissionRate = CONTRACT_CONFIG.COMMISSION_RATE;
  const commission = totalValue * commissionRate / 100;
  const depositAmount = totalValue * depositPercentage / 100;

  const contractData: DeepPartial<Contract> = {
    contractCode: await generateContractCode(),

    productId: product.id,
    farmerId: farmer.id,
    enterpriseId: enterprise.id,

    farmerName: displayName(farmer),
    enterpriseName: displayName(enterprise),
    productName: product.name,

    quantity: dto.quantity,
    unit: dto.unit || product.unit,
    pricePerUnit: dto.pricePerUnit,
    totalValue,

    commission,
    commissionRate,
    depositAmount,
    depositPercentage,

    paymentTerms,
    deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
    notes: dto.notes,
    farmLocation: dto.farmLocation || product.location || product.farm,

    status: 'draft',
    signedByFarmer: false,
    signedByEnterprise: false,

    insuranceEnabled: dto.insuranceEnabled ?? false,
    insuranceProvider: dto.insuranceProvider,
    insurancePackage: dto.insurancePackage,
    insuranceFee: dto.insuranceEnabled ? insuranceFee : undefined,
    insuranceStatus: dto.insuranceEnabled ? 'pending' : 'none',

    escrowStatus: 'none',
    paidAmount: 0,
    remainingAmount: totalValue,
    deliveryStatus: 'pending',

    createdBy: enterprise.id,
    updatedBy: enterprise.id,
  };

  const saved = await contractRepo().save(contractRepo().create(contractData));

  return contractRepo().findOne({
    where: { id: saved.id },
    relations: ['product', 'farmer', 'enterprise'],
  });
};

const TERMINAL_STATUSES = ['cancelled', 'completed', 'disputed'];

const withRelations = (id: string) =>
  contractRepo().findOne({ where: { id }, relations: ['product', 'farmer', 'enterprise'] });

export const listContractsForUser = async (
  userId: string,
  role: string,
  query: ListContractsQuery = {}
) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Number(query.page)
    : 1;

  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Number(query.limit), 100)
    : 10;

  const skip = (page - 1) * limit;

  const qb = contractRepo()
    .createQueryBuilder('contract')
    .leftJoinAndSelect('contract.product', 'product')
    .leftJoinAndSelect('contract.farmer', 'farmer')
    .leftJoinAndSelect('contract.enterprise', 'enterprise');

  if (role === 'farmer') {
    qb.where('contract.farmerId = :userId', { userId });
  } else if (role === 'enterprise') {
    qb.where('contract.enterpriseId = :userId', { userId });
  } else {
    throw makeError('Vai tro nguoi dung khong hop le', 403);
  }

  if (query.status) {
    const statuses = query.status
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const invalidStatus = statuses.find(
      (status) => !CONTRACT_STATUSES.includes(status as ContractStatus)
    );

    if (invalidStatus) {
      throw makeError(`Trang thai hop dong khong hop le: ${invalidStatus}`, 400);
    }

    if (statuses.length > 0) {
      qb.andWhere('contract.status IN (:...statuses)', { statuses });
    }
  }

  const sortField = CONTRACT_SORT_FIELDS.includes(query.sort as ContractSortField)
    ? query.sort
    : 'createdAt';

  const sortOrder = String(query.order || 'DESC').toUpperCase() === 'ASC'
    ? 'ASC'
    : 'DESC';

  qb.orderBy(`contract.${sortField}`, sortOrder as 'ASC' | 'DESC')
    .skip(skip)
    .take(limit);

  const [contracts, total] = await qb.getManyAndCount();

  return {
    contracts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      status: query.status || null,
      sort: sortField,
      order: sortOrder,
    },
  };
};

export const getContractForUser = async (id: string, userId: string) => {
  const contract = await withRelations(id);
  if (!contract) throw makeError('Khong tim thay hop dong', 404);
  if (contract.farmerId !== userId && contract.enterpriseId !== userId) {
    throw makeError('Ban khong co quyen xem hop dong nay', 403);
  }
  return contract;
};

export const signContract = async (id: string, userId: string, role: string) => {
  const contract = await contractRepo().findOne({ where: { id } });
  if (!contract) throw makeError('Khong tim thay hop dong', 404);

  const isFarmer = role === 'farmer' && contract.farmerId === userId;
  const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;
  if (!isFarmer && !isEnterprise) {
    throw makeError('Ban khong co quyen ky hop dong nay', 403);
  }

  if (TERMINAL_STATUSES.includes(contract.status)) {
    throw makeError('Hop dong da ket thuc, khong the ky');
  }

  if (isFarmer) {
    if (contract.signedByFarmer) throw makeError('Ban da ky hop dong nay roi');
    contract.signedByFarmer = true;
  } else {
    if (contract.signedByEnterprise) throw makeError('Ban da ky hop dong nay roi');
    contract.signedByEnterprise = true;
  }

  if (contract.signedByFarmer && contract.signedByEnterprise) {
    contract.status = 'active';
    contract.signedAt = new Date();
  } else {
    contract.status = 'pending';
  }
  contract.updatedBy = userId;

  await contractRepo().save(contract);
  return withRelations(id);
};

const CANCELLABLE_STATUSES = ['draft', 'pending', 'approved', 'active'];

export const cancelContract = async (
  id: string,
  userId: string,
  role: string,
  dto: CancelContractDto
) => {
  const reason = dto.reason?.trim();

  if (!reason) {
    throw makeError('Vui long nhap ly do huy hop dong', 400);
  }

  if (reason.length < 5) {
    throw makeError('Ly do huy hop dong phai co it nhat 5 ky tu', 400);
  }

  if (reason.length > 500) {
    throw makeError('Ly do huy hop dong khong duoc vuot qua 500 ky tu', 400);
  }

  const contract = await contractRepo().findOne({
    where: { id },
    relations: ['product', 'farmer', 'enterprise'],
  });

  if (!contract) {
    throw makeError('Khong tim thay hop dong', 404);
  }

  const isFarmer = role === 'farmer' && contract.farmerId === userId;
  const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;

  if (!isFarmer && !isEnterprise) {
    throw makeError('Ban khong co quyen huy hop dong nay', 403);
  }

  if (!CANCELLABLE_STATUSES.includes(contract.status)) {
    throw makeError('Hop dong o trang thai hien tai khong the huy', 400);
  }

  if (contract.escrowStatus === 'funded' || Number(contract.paidAmount || 0) > 0) {
    throw makeError('Hop dong da phat sinh thanh toan, khong the huy truc tiep', 400);
  }

  const partnerId = isFarmer ? contract.enterpriseId : contract.farmerId;
  const cancelledByName = isFarmer ? contract.farmerName : contract.enterpriseName;

  contract.status = 'cancelled';
  contract.cancelReason = reason;
  contract.cancelledAt = new Date();
  contract.updatedBy = userId;

  await contractRepo().save(contract);

  await notificationRepo().save(
    notificationRepo().create({
      userId: partnerId,
      type: 'contract_cancelled',
      title: 'Hop dong da bi huy',
      message: `${cancelledByName || 'Doi tac'} da huy hop dong ${contract.contractCode}. Ly do: ${reason}`,
      relatedId: contract.id,
      relatedModel: 'Contract',
      severity: 'warning',
      isRead: false,
      emailSent: false,
    })
  );

  return withRelations(id);
};


export const rejectContract = async (id: string, userId: string, reason?: string) => {
  const contract = await contractRepo().findOne({ where: { id } });
  if (!contract) throw makeError('Khong tim thay hop dong', 404);
  if (contract.farmerId !== userId) {
    throw makeError('Ban khong co quyen tu choi hop dong nay', 403);
  }
  if (TERMINAL_STATUSES.includes(contract.status)) {
    throw makeError('Hop dong da ket thuc, khong the tu choi');
  }
  if (contract.signedByFarmer) {
    throw makeError('Ban da ky hop dong nay, khong the tu choi');
  }

  contract.status = 'cancelled';
  contract.cancelReason = reason ?? '';
  contract.cancelledAt = new Date();
  contract.updatedBy = userId;

  await contractRepo().save(contract);
  return withRelations(id);

};
