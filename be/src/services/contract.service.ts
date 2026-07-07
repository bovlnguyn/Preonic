import { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CONTRACT_CONFIG } from '../constants';
import { Contract } from '../models/Contract.entity';
import { Product } from '../models/Product.entity';
import { User } from '../models/User.entity';

const contractRepo = () => AppDataSource.getRepository(Contract);
const productRepo = () => AppDataSource.getRepository(Product);
const userRepo = () => AppDataSource.getRepository(User);

const PAYMENT_TERMS = ['50_50', '30_70', '100_delivery', '100_upfront'] as const;
type PaymentTerms = (typeof PAYMENT_TERMS)[number];

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

const displayName = (user: User) =>
  user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

const ensurePaymentTerms = (value: string): PaymentTerms => {
  if (!PAYMENT_TERMS.includes(value as PaymentTerms)) {
    throw makeError('Dieu khoan thanh toan khong hop le');
  }
  return value as PaymentTerms;
};

const generateContractCode = async () => {
  for (let i = 0; i < CONTRACT_CONFIG.MAX_CODE_GENERATION_ATTEMPTS; i++) {
    const sequence = Math.floor(
      CONTRACT_CONFIG.CODE_SEQUENCE_MIN +
      Math.random() * CONTRACT_CONFIG.CODE_SEQUENCE_SPAN
    );
    const timestamp = Date.now().toString().slice(-7);
    const code = `${CONTRACT_CONFIG.CODE_PREFIX}${timestamp}${sequence}`.slice(0, 20);

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
  if (product.remaining != null && Number(product.remaining) < dto.quantity) {
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
