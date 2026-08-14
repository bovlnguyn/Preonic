import { DeepPartial, EntityManager, LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CONTRACT_CONFIG, UNIT_TO_KG } from '../constants';
import { Contract } from '../models/Contract.entity';
import { Product } from '../models/Product.entity';
import { User } from '../models/User.entity';
import { Notification } from '../models/Notification.entity';
import { logAction } from './systemLog.service';
import { displayName } from '../utils/user.util';
import { makeError } from '../utils/error.util';
import { notifyContractEmail as notifyEmail } from '../utils/notify.util';
import { lockById, lockByIdOrFail, runLockedTransaction } from '../utils/transaction-lock.util';

const toKg = (value: number, unit?: string | null) => value * (UNIT_TO_KG[unit || 'kg'] ?? 1);

const contractRepo = () => AppDataSource.getRepository(Contract);
const productRepo = () => AppDataSource.getRepository(Product);
const userRepo = () => AppDataSource.getRepository(User);
const notificationRepo = () => AppDataSource.getRepository(Notification);

const PAYMENT_TERMS = ['50_50', '30_70', '100_delivery', '100_upfront', 'custom'] as const;
type PaymentTerms = (typeof PAYMENT_TERMS)[number];

const CONTRACT_STATUSES = [
  'draft',
  'pending',
  'approved',
  'active',
  'cancel_pending',
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

const roundQuantity = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const inventoryToleranceKg = (unit?: string | null) => {
  const unitFactor = UNIT_TO_KG[unit || 'kg'] ?? 1;
  // Product quantity is stored with scale=2, so half of the smallest representable
  // product-unit increment is a safe tolerance when converting to kilograms.
  return Math.max(1e-9, unitFactor * 0.005);
};

/**
 * Reserve/release product inventory while both Contract and Product are row-locked.
 * Lock order for contract lifecycle operations is always Contract -> Product.
 */
const adjustProductInventory = async (
  manager: EntityManager,
  contract: Contract,
  mode: 'reserve' | 'restore'
) => {
  const txProductRepo = manager.getRepository(Product);
  const product = await lockByIdOrFail(
    manager,
    Product,
    contract.productId,
    () => makeError('Khong tim thay san pham cua hop dong', 404)
  );

  if (mode === 'reserve' && !product.isActive) {
    throw makeError('San pham khong con hoat dong, khong the hoan tat hop dong', 409);
  }

  // Some legacy/demo products may not track quantity. Preserve that behavior instead
  // of inventing stock values that do not exist in the database.
  if (product.remaining == null) {
    return product;
  }

  const currentRemaining = Number(product.remaining);
  const contractQuantity = Number(contract.quantity);
  const productUnit = product.unit || 'kg';
  const contractUnit = contract.unit || productUnit;

  if (!Number.isFinite(currentRemaining) || currentRemaining < 0) {
    throw makeError('Du lieu ton kho san pham khong hop le', 409);
  }
  if (!Number.isFinite(contractQuantity) || contractQuantity <= 0) {
    throw makeError('So luong hop dong khong hop le', 409);
  }

  const unitFactor = UNIT_TO_KG[productUnit] ?? 1;
  const currentKg = toKg(currentRemaining, productUnit);
  const contractKg = toKg(contractQuantity, contractUnit);
  const toleranceKg = inventoryToleranceKg(productUnit);

  if (!Number.isFinite(currentKg) || !Number.isFinite(contractKg) || contractKg <= 0) {
    throw makeError('Khong the quy doi so luong hop dong/san pham', 409);
  }

  if (mode === 'reserve') {
    const nextKg = currentKg - contractKg;
    if (nextKg < -toleranceKg) {
      throw makeError('San pham khong con du so luong de hoan tat hop dong nay', 409);
    }

    product.remaining = roundQuantity(Math.max(0, nextKg) / unitFactor);
  } else {
    let nextKg = currentKg + contractKg;

    if (product.totalQuantity != null) {
      const totalQuantity = Number(product.totalQuantity);
      if (!Number.isFinite(totalQuantity) || totalQuantity < 0) {
        throw makeError('Tong san luong san pham khong hop le', 409);
      }

      const totalKg = toKg(totalQuantity, productUnit);
      if (nextKg > totalKg + toleranceKg) {
        throw makeError(
          'Du lieu ton kho khong nhat quan: hoan so luong hop dong se vuot tong san luong',
          409
        );
      }
      // Avoid tiny floating-point overshoots at the decimal(18,2) boundary.
      nextKg = Math.min(nextKg, totalKg);
    }

    product.remaining = roundQuantity(nextKg / unitFactor);
  }

  await txProductRepo.save(product);
  return product;
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
  deliveryAddress?: string;
  depositPercentage?: number;
  insuranceEnabled?: boolean;
  insuranceProvider?: string;
  insurancePackage?: string;
  insuranceFee?: number;
  insurancePolicyNumber?: string;
  insuredValue?: number;
  insuranceCoveredEvents?: string;
  insuranceValidFrom?: string;
  insuranceValidTo?: string;
  insuranceRiskSharingTerms?: string;
}

export interface CancelContractDto {
  reason: string;
}

const ensurePaymentTerms = (value: string): PaymentTerms => {
  if (!PAYMENT_TERMS.includes(value as PaymentTerms)) {
    throw makeError('Dieu khoan thanh toan khong hop le');
  }
  return value as PaymentTerms;
};

const STANDARD_DEPOSIT_PERCENTAGE: Record<Exclude<PaymentTerms, 'custom'>, number> = {
  '50_50': 50,
  '30_70': 30,
  '100_delivery': 0,
  '100_upfront': 100,
};

const resolveDepositPercentage = (
  paymentTerms: PaymentTerms,
  requestedPercentage?: number
): number => {
  if (paymentTerms !== 'custom') {
    return STANDARD_DEPOSIT_PERCENTAGE[paymentTerms];
  }

  if (
    requestedPercentage === undefined ||
    !Number.isFinite(requestedPercentage) ||
    requestedPercentage < 0 ||
    requestedPercentage > 100
  ) {
    throw makeError('Ty le dat coc tuy chinh phai nam trong khoang 0-100');
  }

  // DepositPercentage trong DB la decimal(5,2), can chuan hoa ve 2 chu so thap phan.
  return Math.round((requestedPercentage + Number.EPSILON) * 100) / 100;
};

const getVietnamTodayKey = () =>
  new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

const getDateKey = (value?: string | Date | null): string | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  const matched = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return matched?.[1] || null;
};

const ensureFutureDeliveryDate = (value?: string | Date | null) => {
  const dateKey = getDateKey(value);
  if (!dateKey) {
    throw makeError('Vui long chon ngay giao hang');
  }
  if (dateKey <= getVietnamTodayKey()) {
    throw makeError('Ngay giao hang phai sau ngay hien tai');
  }
};

const ensureProposalProductStillValid = (contract: Contract, product: Product) => {
  if (!product.isActive) {
    throw makeError('San pham khong con hoat dong, khong the gui de xuat hop dong', 409);
  }
  if (!product.sellerUserId || product.sellerUserId !== contract.farmerId) {
    throw makeError('Nguoi ban cua san pham da thay doi, vui long tao lai hop dong', 409);
  }

  if (product.remaining != null) {
    const remaining = Number(product.remaining);
    const quantity = Number(contract.quantity);
    const productUnit = product.unit || 'kg';
    const contractUnit = contract.unit || productUnit;

    if (!Number.isFinite(remaining) || remaining < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      throw makeError('Du lieu so luong san pham/hop dong khong hop le', 409);
    }

    if (toKg(remaining, productUnit) + inventoryToleranceKg(productUnit) < toKg(quantity, contractUnit)) {
      throw makeError('San pham khong con du so luong cho de xuat hop dong nay', 409);
    }
  }
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
  if (!dto.deliveryAddress?.trim()) {
    throw makeError('Vui long nhap dia chi giao hang');
  }
  ensureFutureDeliveryDate(dto.deliveryDate);

  const paymentTerms = ensurePaymentTerms(dto.paymentTerms);
  // Backend la nguon su that cho cac dieu khoan chuan, khong tin depositPercentage
  // do client gui. Chi dieu khoan custom moi nhan ty le tuy chinh tu request.
  const depositPercentage = resolveDepositPercentage(paymentTerms, dto.depositPercentage);

  const insuranceFee = dto.insuranceFee ?? 0;
  if (!Number.isFinite(insuranceFee) || insuranceFee < 0) {
    throw makeError('Phi bao hiem khong hop le');
  }

  const insuredValue = dto.insuredValue ?? 0;
  if (!Number.isFinite(insuredValue) || insuredValue < 0) {
    throw makeError('Gia tri bao hiem khong hop le');
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
    notes: dto.notes?.trim(),
    farmLocation: dto.farmLocation || product.location || product.farm,
    deliveryAddress: dto.deliveryAddress.trim(),

    status: 'draft',
    signedByFarmer: false,
    signedByEnterprise: false,

    insuranceEnabled: dto.insuranceEnabled ?? false,
    insuranceProvider: dto.insuranceProvider,
    insurancePackage: dto.insurancePackage,
    insuranceFee: dto.insuranceEnabled ? insuranceFee : undefined,
    // Bao hiem duoc nhap la bao hiem da mua san tu ben ngoai (khong qua PreOnic)
    // nen coi nhu da co hieu luc ngay, khong can trang thai 'pending' cho xu ly.
    insuranceStatus: dto.insuranceEnabled ? 'active' : 'none',
    insurancePolicyNumber: dto.insuranceEnabled ? dto.insurancePolicyNumber : undefined,
    insuredValue: dto.insuranceEnabled ? insuredValue : undefined,
    insuranceCoveredEvents: dto.insuranceEnabled ? (dto.insuranceCoveredEvents as any) : undefined,
    insuranceValidFrom: dto.insuranceEnabled && dto.insuranceValidFrom ? new Date(dto.insuranceValidFrom) : undefined,
    insuranceValidTo: dto.insuranceEnabled && dto.insuranceValidTo ? new Date(dto.insuranceValidTo) : undefined,
    insuranceRiskSharingTerms: dto.insuranceEnabled ? dto.insuranceRiskSharingTerms : undefined,

    escrowStatus: 'none',
    paidAmount: 0,
    remainingAmount: totalValue,
    deliveryStatus: 'pending',

    createdBy: enterprise.id,
    updatedBy: enterprise.id,
  };

  const saved = await contractRepo().save(contractRepo().create(contractData));

  logAction({
    category: 'contract',
    action: 'contract_created',
    message: `${enterprise.fullName || enterprise.email} tao de xuat hop dong ${saved.contractCode} voi nong dan ${farmer.fullName || farmer.email}`,
    userId: enterprise.id,
    targetType: 'Contract',
    targetId: saved.id,
    metadata: { contractCode: saved.contractCode, totalValue },
  });

  return contractRepo().findOne({
    where: { id: saved.id },
    relations: ['product', 'farmer', 'enterprise'],
  });
};

const TERMINAL_STATUSES = ['cancelled', 'completed', 'disputed'];

const withRelations = (id: string) =>
  contractRepo().findOne({ where: { id }, relations: ['product', 'farmer', 'enterprise'] });

// Enterprise gui de xuat 'draft' cho Farmer -- tu day Farmer moi thay va ky duoc.
export const submitContractProposal = async (id: string, enterpriseId: string) => {
  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      if (contract.enterpriseId !== enterpriseId) {
        throw makeError('Ban khong co quyen gui hop dong nay', 403);
      }

      if (contract.status !== 'draft') {
        throw makeError('Hop dong da duoc gui truoc do', 400);
      }

      // Draft co the duoc tao tu nhieu ngay truoc. Truoc khi cong khai de xuat cho
      // Farmer, doc lai Product trong cung transaction de chan draft da loi thoi:
      // san pham bi an/xoa, doi nguoi ban, het san luong hoac ngay giao da qua.
      const product = await lockByIdOrFail(
        manager,
        Product,
        contract.productId,
        () => makeError('San pham cua hop dong khong con ton tai', 409)
      );
      ensureProposalProductStillValid(contract, product);
      ensureFutureDeliveryDate(contract.deliveryDate);

      contract.status = 'pending';
      contract.updatedBy = enterpriseId;
      await txContractRepo.save(contract);

      return {
        id: contract.id,
        farmerId: contract.farmerId,
        enterpriseName: contract.enterpriseName,
        contractCode: contract.contractCode,
      };
    },
    { label: 'contract.submitProposal' }
  );

  const proposalTitle = 'De xuat hop dong moi';
  const proposalMessage = `${result.enterpriseName || 'Doanh nghiep'} da gui de xuat hop dong ${result.contractCode} cho ban. Vui long xem va ky xac nhan.`;

  await notificationRepo().save(
    notificationRepo().create({
      userId: result.farmerId,
      type: 'contract_proposal_sent',
      title: proposalTitle,
      message: proposalMessage,
      relatedId: result.id,
      relatedModel: 'Contract',
      severity: 'info',
      isRead: false,
      emailSent: false,
    })
  );

  const farmer = await userRepo().findOne({ where: { id: result.farmerId } });
  await notifyEmail(farmer, 'farmer', proposalTitle, proposalMessage, result.id);

  return withRelations(id);
};

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
    // Draft = Enterprise dang soan thao, chua gui cho Farmer -- khong duoc thay,
    // bat ke co truyen status filter hay khong.
    qb.andWhere("contract.status <> 'draft'");
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

export const getContractSummaryForUser = async (
  userId: string,
  role: string
) => {
  const qb = contractRepo()
    .createQueryBuilder('contract')
    .select('COUNT(contract.id)', 'totalContracts')
    .addSelect('COALESCE(SUM(contract.totalValue), 0)', 'totalContractValue')
    .addSelect("SUM(CASE WHEN contract.status = 'active' THEN 1 ELSE 0 END)", 'activeContracts')
    .addSelect("SUM(CASE WHEN contract.status = 'pending' THEN 1 ELSE 0 END)", 'pendingContracts');

  if (role === 'farmer') {
    qb.where('contract.farmerId = :userId', { userId });
  } else if (role === 'enterprise') {
    qb.where('contract.enterpriseId = :userId', { userId });
  } else {
    throw makeError('Vai tro nguoi dung khong hop le', 403);
  }

  // "Tổng hợp đồng" có cùng semantics cho cả hai role: proposal đã được gửi
  // trở đi, miễn chưa bị hủy. Draft chỉ là bản nháp riêng của Enterprise.
  qb.andWhere("contract.status NOT IN (:...excludedStatuses)", {
    excludedStatuses: ['draft', 'cancelled'],
  });

  const summary = await qb.getRawOne();

  return {
    totalContracts: Number(summary?.totalContracts || 0),
    totalContractValue: Number(summary?.totalContractValue || 0),
    activeContracts: Number(summary?.activeContracts || 0),
    pendingContracts: Number(summary?.pendingContracts || 0),
  };
};

export const getContractForUser = async (id: string, userId: string) => {
  const contract = await withRelations(id);
  if (!contract) throw makeError('Khong tim thay hop dong', 404);
  if (contract.farmerId !== userId && contract.enterpriseId !== userId) {
    throw makeError('Ban khong co quyen xem hop dong nay', 403);
  }
  // Draft = Enterprise dang soan thao, chua gui cho Farmer -- Farmer khong duoc xem.
  if (contract.status === 'draft' && contract.farmerId === userId) {
    throw makeError('Khong tim thay hop dong', 404);
  }
  return contract;
};

export const signContract = async (id: string, userId: string, role: string) => {
  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);

      // Contract is always locked first. If this signature completes the contract,
      // Product is locked second before stock is reserved. This matches the global
      // Contract -> Product ordering used by cancellation and reduces deadlocks.
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      const isFarmer = role === 'farmer' && contract.farmerId === userId;
      const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;
      if (!isFarmer && !isEnterprise) {
        throw makeError('Ban khong co quyen ky hop dong nay', 403);
      }

      if (TERMINAL_STATUSES.includes(contract.status)) {
        throw makeError('Hop dong da ket thuc, khong the ky');
      }

      if (isFarmer && contract.status === 'draft') {
        throw makeError('Hop dong chua duoc gui de xac nhan', 400);
      }

      // Signature is only a legal transition while the proposal is pending.
      // This also blocks signing while a cancellation is being processed.
      if (contract.status !== 'pending') {
        throw makeError('Hop dong khong o trang thai cho phep ky', 409);
      }

      if (isFarmer) {
        if (contract.signedByFarmer) throw makeError('Ban da ky hop dong nay roi');
        contract.signedByFarmer = true;
      } else {
        if (contract.signedByEnterprise) throw makeError('Ban da ky hop dong nay roi');
        if (!contract.signedByFarmer) {
          throw makeError('Cho nong dan xac nhan hop dong truoc khi doanh nghiep ky');
        }
        contract.signedByEnterprise = true;
      }

      const bothSigned = contract.signedByFarmer && contract.signedByEnterprise;

      if (bothSigned) {
        // Product row is locked and the latest remaining quantity is re-read HERE,
        // inside the same transaction. Two contracts competing for the last stock
        // therefore cannot both succeed on a stale Remaining value.
        await adjustProductInventory(manager, contract, 'reserve');
        contract.status = 'approved';
        contract.signedAt = new Date();
      } else {
        contract.status = 'pending';
      }

      contract.updatedBy = userId;
      await txContractRepo.save(contract);

      const partnerId = isFarmer ? contract.enterpriseId : contract.farmerId;
      const partnerRole: 'farmer' | 'enterprise' = isFarmer ? 'enterprise' : 'farmer';
      const signerName = isFarmer ? contract.farmerName : contract.enterpriseName;

      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        partnerId,
        partnerRole,
        signerName,
        bothSigned,
      };
    },
    { label: 'contract.sign' }
  );

  const signTitle = result.bothSigned ? 'Hop dong da duoc ky du hai ben' : 'Hop dong cho ban xac nhan ky';
  const signMessage = result.bothSigned
    ? `${result.signerName || 'Doi tac'} da ky hop dong ${result.contractCode}. Hop dong da duoc ky du hai ben, dang cho Doanh nghiep khoa ky quy de chinh thuc co hieu luc.`
    : `${result.signerName || 'Doi tac'} da ky hop dong ${result.contractCode}. Vui long xac nhan ky de hop dong co hieu luc.`;

  await notificationRepo().save(
    notificationRepo().create({
      userId: result.partnerId,
      type: result.bothSigned ? 'contract_signed' : 'contract_sign_pending',
      title: signTitle,
      message: signMessage,
      relatedId: result.contractId,
      relatedModel: 'Contract',
      severity: 'info',
      isRead: false,
      emailSent: false,
    })
  );

  const partner = await userRepo().findOne({ where: { id: result.partnerId } });
  await notifyEmail(partner, result.partnerRole, signTitle, signMessage, result.contractId);

  return withRelations(id);
};

// Hop dong 'draft' chua tung gui cho Farmer nen khong can luong huy (khong co ai de
// thong bao/xac nhan) -- Enterprise xoa han thay vi huy, xem deleteContract() ben duoi.
const CANCELLABLE_STATUSES = ['pending', 'approved'];

// Enterprise xoa han hop dong con o trang thai 'draft' (chua gui cho Farmer).
// Khac voi cancelContract: khong doi status, khong gui thong bao -- vi Farmer
// chua bao gio thay hop dong nay.
export const deleteContract = async (id: string, userId: string, role: string) => {
  const deleted = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      if (role !== 'enterprise' || contract.enterpriseId !== userId) {
        throw makeError('Ban khong co quyen xoa hop dong nay', 403);
      }

      if (contract.status !== 'draft') {
        throw makeError('Chi co the xoa hop dong o trang thai nhap, chua gui cho nong dan', 400);
      }

      const snapshot = {
        id: contract.id,
        contractCode: contract.contractCode,
        enterpriseName: contract.enterpriseName,
      };

      await txContractRepo.remove(contract);
      return snapshot;
    },
    { label: 'contract.deleteDraft' }
  );

  logAction({
    category: 'contract',
    action: 'contract_deleted',
    message: `${deleted.enterpriseName || 'Doanh nghiep'} da xoa hop dong nhap ${deleted.contractCode}`,
    userId,
    targetType: 'Contract',
    targetId: deleted.id,
    metadata: { contractCode: deleted.contractCode },
  });
};

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

  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      const isFarmer = role === 'farmer' && contract.farmerId === userId;
      const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;
      if (!isFarmer && !isEnterprise) {
        throw makeError('Ban khong co quyen huy hop dong nay', 403);
      }

      if (!CANCELLABLE_STATUSES.includes(contract.status)) {
        throw makeError('Hop dong o trang thai hien tai khong the huy', 400);
      }

      // Active contracts are intentionally not cancellable here. In the normal flow
      // active means escrow is funded; disputes must settle the money first.
      if (contract.escrowStatus === 'funded' || Number(contract.paidAmount || 0) > 0) {
        throw makeError('Hop dong da phat sinh thanh toan, khong the huy truc tiep', 400);
      }

      const partnerId = isFarmer ? contract.enterpriseId : contract.farmerId;
      const partnerRole: 'farmer' | 'enterprise' = isFarmer ? 'enterprise' : 'farmer';
      const cancelledByName = isFarmer ? contract.farmerName : contract.enterpriseName;
      const requiresConfirmation = contract.status === 'approved';

      contract.updatedBy = userId;

      if (requiresConfirmation) {
        // Inventory remains reserved while the other party is deciding. It is restored
        // atomically only in confirmCancelContract().
        contract.status = 'cancel_pending';
        contract.cancelReason = reason;
        contract.cancelRequestedBy = userId;
      } else {
        // pending contracts have never reserved product inventory.
        contract.status = 'cancelled';
        contract.cancelReason = reason;
        contract.cancelledAt = new Date();
      }

      await txContractRepo.save(contract);

      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        partnerId,
        partnerRole,
        cancelledByName,
        requiresConfirmation,
      };
    },
    { label: 'contract.cancelRequest' }
  );

  const partnerUser = await userRepo().findOne({ where: { id: result.partnerId } });

  if (result.requiresConfirmation) {
    const requestTitle = 'Yeu cau huy hop dong';
    const requestMessage = `${result.cancelledByName || 'Doi tac'} muon huy hop dong ${result.contractCode}. Ly do: ${reason}. Vui long xac nhan hoac tu choi.`;

    await notificationRepo().save(
      notificationRepo().create({
        userId: result.partnerId,
        type: 'contract_cancel_requested',
        title: requestTitle,
        message: requestMessage,
        relatedId: result.contractId,
        relatedModel: 'Contract',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      })
    );
    await notifyEmail(partnerUser, result.partnerRole, requestTitle, requestMessage, result.contractId);
  } else {
    const cancelledTitle = 'Hop dong da bi huy';
    const cancelledMessage = `${result.cancelledByName || 'Doi tac'} da huy hop dong ${result.contractCode}. Ly do: ${reason}`;

    await notificationRepo().save(
      notificationRepo().create({
        userId: result.partnerId,
        type: 'contract_cancelled',
        title: cancelledTitle,
        message: cancelledMessage,
        relatedId: result.contractId,
        relatedModel: 'Contract',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      })
    );
    await notifyEmail(partnerUser, result.partnerRole, cancelledTitle, cancelledMessage, result.contractId);
  }

  return withRelations(id);
};

// Ben khong yeu cau huy xac nhan dong y -- hop dong chuyen sang 'cancelled' chinh thuc.
export const confirmCancelContract = async (id: string, userId: string, role: string) => {
  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      const isFarmer = role === 'farmer' && contract.farmerId === userId;
      const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;
      if (!isFarmer && !isEnterprise) {
        throw makeError('Ban khong co quyen xac nhan huy hop dong nay', 403);
      }
      if (contract.status !== 'cancel_pending') {
        throw makeError('Hop dong khong o trang thai cho xac nhan huy', 400);
      }
      if (contract.cancelRequestedBy === userId) {
        throw makeError('Ban la nguoi gui yeu cau huy, khong the tu xac nhan', 400);
      }
      if (contract.escrowStatus === 'funded' || Number(contract.paidAmount || 0) > 0) {
        throw makeError('Hop dong da phat sinh thanh toan, khong the huy truc tiep', 409);
      }

      const requesterId = contract.cancelRequestedBy;
      const confirmerName = isFarmer ? contract.farmerName : contract.enterpriseName;

      // cancel_pending is only entered from approved, and approved means inventory was
      // reserved when the second signature committed. Restore it BEFORE marking the
      // contract cancelled, in the same Contract -> Product locked transaction.
      await adjustProductInventory(manager, contract, 'restore');

      contract.status = 'cancelled';
      contract.cancelledAt = new Date();
      contract.updatedBy = userId;
      await txContractRepo.save(contract);

      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        farmerId: contract.farmerId,
        requesterId,
        confirmerName,
      };
    },
    { label: 'contract.confirmCancel' }
  );

  if (result.requesterId) {
    const confirmTitle = 'Yeu cau huy hop dong da duoc chap nhan';
    const confirmMessage = `${result.confirmerName || 'Doi tac'} da dong y huy hop dong ${result.contractCode}.`;

    await notificationRepo().save(
      notificationRepo().create({
        userId: result.requesterId,
        type: 'contract_cancel_confirmed',
        title: confirmTitle,
        message: confirmMessage,
        relatedId: result.contractId,
        relatedModel: 'Contract',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      })
    );

    const requesterRole: 'farmer' | 'enterprise' = result.requesterId === result.farmerId ? 'farmer' : 'enterprise';
    const requester = await userRepo().findOne({ where: { id: result.requesterId } });
    await notifyEmail(requester, requesterRole, confirmTitle, confirmMessage, result.contractId);
  }

  return withRelations(id);
};

// Ben khong yeu cau huy tu choi -- hop dong quay lai 'approved' nhu cu.
export const declineCancelContract = async (id: string, userId: string, role: string) => {
  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      const isFarmer = role === 'farmer' && contract.farmerId === userId;
      const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;
      if (!isFarmer && !isEnterprise) {
        throw makeError('Ban khong co quyen phan hoi yeu cau huy nay', 403);
      }
      if (contract.status !== 'cancel_pending') {
        throw makeError('Hop dong khong o trang thai cho xac nhan huy', 400);
      }
      if (contract.cancelRequestedBy === userId) {
        throw makeError('Ban la nguoi gui yeu cau huy, khong the tu choi', 400);
      }

      const requesterId = contract.cancelRequestedBy;
      const declinerName = isFarmer ? contract.farmerName : contract.enterpriseName;

      // Inventory was never released while cancel_pending, so declining only restores
      // the state machine to approved; no Product update is required.
      contract.status = 'approved';
      contract.cancelReason = null as any;
      contract.cancelRequestedBy = null as any;
      contract.updatedBy = userId;
      await txContractRepo.save(contract);

      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        farmerId: contract.farmerId,
        requesterId,
        declinerName,
      };
    },
    { label: 'contract.declineCancel' }
  );

  if (result.requesterId) {
    const declineTitle = 'Yeu cau huy hop dong bi tu choi';
    const declineMessage = `${result.declinerName || 'Doi tac'} khong dong y huy hop dong ${result.contractCode}. Hop dong tiep tuc co hieu luc.`;

    await notificationRepo().save(
      notificationRepo().create({
        userId: result.requesterId,
        type: 'contract_cancel_declined',
        title: declineTitle,
        message: declineMessage,
        relatedId: result.contractId,
        relatedModel: 'Contract',
        severity: 'info',
        isRead: false,
        emailSent: false,
      })
    );

    const requesterRole: 'farmer' | 'enterprise' = result.requesterId === result.farmerId ? 'farmer' : 'enterprise';
    const requester = await userRepo().findOne({ where: { id: result.requesterId } });
    await notifyEmail(requester, requesterRole, declineTitle, declineMessage, result.contractId);
  }

  return withRelations(id);
};

export const rejectContract = async (id: string, userId: string, reason?: string) => {
  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        id,
        () => makeError('Khong tim thay hop dong', 404)
      );

      if (contract.farmerId !== userId) {
        throw makeError('Ban khong co quyen tu choi hop dong nay', 403);
      }
      if (TERMINAL_STATUSES.includes(contract.status)) {
        throw makeError('Hop dong da ket thuc, khong the tu choi');
      }
      if (contract.status === 'draft') {
        throw makeError('Hop dong chua duoc gui de xac nhan', 400);
      }
      if (contract.status !== 'pending') {
        throw makeError('Hop dong khong o trang thai cho phep tu choi', 409);
      }
      if (contract.signedByFarmer) {
        throw makeError('Ban da ky hop dong nay, khong the tu choi');
      }

      contract.status = 'cancelled';
      contract.cancelReason = reason ?? '';
      contract.cancelledAt = new Date();
      contract.updatedBy = userId;
      await txContractRepo.save(contract);

      return {
        contractId: contract.id,
        contractCode: contract.contractCode,
        farmerName: contract.farmerName,
        enterpriseId: contract.enterpriseId,
      };
    },
    { label: 'contract.reject' }
  );

  const rejectTitle = 'Hop dong bi tu choi';
  const rejectMessage = `${result.farmerName || 'Nong dan'} da tu choi hop dong ${result.contractCode}.${reason ? ` Ly do: ${reason}` : ''}`;

  await notificationRepo().save(
    notificationRepo().create({
      userId: result.enterpriseId,
      type: 'contract_rejected',
      title: rejectTitle,
      message: rejectMessage,
      relatedId: result.contractId,
      relatedModel: 'Contract',
      severity: 'warning',
      isRead: false,
      emailSent: false,
    })
  );

  const enterprise = await userRepo().findOne({ where: { id: result.enterpriseId } });
  await notifyEmail(enterprise, 'enterprise', rejectTitle, rejectMessage, result.contractId);

  return withRelations(id);
};

// Dung cho cron job: hop dong da gui cho Farmer ('pending') nhung Farmer chua ky
// qua han CONTRACT_CONFIG.FARMER_SIGN_DEADLINE_DAYS ke tu luc GUI DE XUAT thi tu dong
// chuyen 'cancelled'. updatedAt duoc cap nhat khi draft -> pending, nen draft nam lau
// khong bi tinh nham vao thoi gian Farmer co de phan hoi.
export const expireUnsignedContracts = async () => {
  const deadline = new Date(
    Date.now() - CONTRACT_CONFIG.FARMER_SIGN_DEADLINE_DAYS * 24 * 60 * 60 * 1000
  );

  // Preliminary scan only. Every candidate is locked and re-checked below before
  // changing state, so a Farmer signing concurrently can never be overwritten by cron.
  const candidates = await contractRepo().find({
    where: { status: 'pending', signedByFarmer: false, updatedAt: LessThan(deadline) },
    select: ['id'],
  });

  let expiredCount = 0;

  for (const candidate of candidates) {
    const result = await runLockedTransaction(
      async (manager) => {
        const txContractRepo = manager.getRepository(Contract);
        const contract = await lockById(manager, Contract, candidate.id);
        if (!contract) return null;

        const updatedAt = contract.updatedAt ? new Date(contract.updatedAt).getTime() : 0;
        if (
          contract.status !== 'pending' ||
          contract.signedByFarmer ||
          updatedAt >= deadline.getTime()
        ) {
          return null;
        }

        contract.status = 'cancelled';
        contract.cancelReason = `Tu dong huy: nong dan khong xac nhan ky hop dong trong vong ${CONTRACT_CONFIG.FARMER_SIGN_DEADLINE_DAYS} ngay`;
        contract.cancelledAt = new Date();
        await txContractRepo.save(contract);

        return {
          contractId: contract.id,
          contractCode: contract.contractCode,
          farmerId: contract.farmerId,
          enterpriseId: contract.enterpriseId,
        };
      },
      { label: 'contract.expireUnsigned' }
    );

    if (!result) continue;
    expiredCount += 1;

    const farmerMessage = `Hop dong ${result.contractCode} da tu dong chuyen sang trang thai huy do ban khong xac nhan ky trong vong ${CONTRACT_CONFIG.FARMER_SIGN_DEADLINE_DAYS} ngay.`;
    const enterpriseMessage = `Hop dong ${result.contractCode} da tu dong chuyen sang trang thai huy do nong dan khong xac nhan ky trong vong ${CONTRACT_CONFIG.FARMER_SIGN_DEADLINE_DAYS} ngay.`;
    const autoCancelTitle = 'Hop dong da tu dong huy';

    await notificationRepo().save([
      notificationRepo().create({
        userId: result.farmerId,
        type: 'contract_auto_cancelled',
        title: autoCancelTitle,
        message: farmerMessage,
        relatedId: result.contractId,
        relatedModel: 'Contract',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      }),
      notificationRepo().create({
        userId: result.enterpriseId,
        type: 'contract_auto_cancelled',
        title: autoCancelTitle,
        message: enterpriseMessage,
        relatedId: result.contractId,
        relatedModel: 'Contract',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      }),
    ]);

    const [farmer, enterprise] = await Promise.all([
      userRepo().findOne({ where: { id: result.farmerId } }),
      userRepo().findOne({ where: { id: result.enterpriseId } }),
    ]);
    await notifyEmail(farmer, 'farmer', autoCancelTitle, farmerMessage, result.contractId);
    await notifyEmail(enterprise, 'enterprise', autoCancelTitle, enterpriseMessage, result.contractId);
  }

  return expiredCount;
};
