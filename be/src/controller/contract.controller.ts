import { Response } from 'express';
import { AuthRequest } from '../types';
import * as contractService from '../services/contract.service';

const toNumber = (value: any) =>
  value === undefined || value === null || value === '' ? undefined : Number(value);

const buildDto = (body: any) => {
  const product = body.product || {};
  const terms = body.terms || {};
  const payment = body.payment || {};
  const insurance = body.insurance || {};

  return {
    productId: body.productId || product.productId,
    quantity: toNumber(body.quantity ?? product.quantity),
    pricePerUnit: toNumber(body.pricePerUnit ?? product.pricePerUnit),
    unit: body.unit ?? product.unit,

    paymentTerms: body.paymentTerms ?? terms.paymentTerms,
    deliveryDate: body.deliveryDate ?? terms.deliveryDate,
    notes: body.notes ?? terms.notes,
    farmLocation: body.farmLocation ?? terms.farmLocation,

    depositPercentage: toNumber(body.depositPercentage ?? payment.depositPercentage),

    insuranceEnabled: body.insuranceEnabled ?? insurance.enabled,
    insuranceProvider: body.insuranceProvider ?? insurance.provider,
    insurancePackage: body.insurancePackage ?? insurance.package,
    insuranceFee: toNumber(body.insuranceFee ?? insurance.fee),
  };
};

const formatContract = (contract: any) => ({
  id: contract.id,
  contractCode: contract.contractCode,
  status: contract.status,

  product: {
    id: contract.productId,
    name: contract.productName,
  },
  farmer: {
    id: contract.farmerId,
    name: contract.farmerName,
  },
  enterprise: {
    id: contract.enterpriseId,
    name: contract.enterpriseName,
  },

  quantity: contract.quantity,
  unit: contract.unit,
  pricePerUnit: contract.pricePerUnit,
  totalValue: contract.totalValue,

  commission: contract.commission,
  commissionRate: contract.commissionRate,
  depositAmount: contract.depositAmount,
  depositPercentage: contract.depositPercentage,

  paymentTerms: contract.paymentTerms,
  deliveryDate: contract.deliveryDate,
  notes: contract.notes,
  farmLocation: contract.farmLocation,

  insuranceEnabled: contract.insuranceEnabled,
  insuranceProvider: contract.insuranceProvider,
  insurancePackage: contract.insurancePackage,
  insuranceFee: contract.insuranceFee,
  insuranceStatus: contract.insuranceStatus,

  escrowStatus: contract.escrowStatus,
  deliveryStatus: contract.deliveryStatus,

  signedByFarmer: contract.signedByFarmer,
  signedByEnterprise: contract.signedByEnterprise,

  createdAt: contract.createdAt,
  updatedAt: contract.updatedAt,
});

export const createContract = async (req: AuthRequest, res: Response) => {
  try {
    const enterpriseId = req.user!.id;
    const dto = buildDto(req.body);

    const contract = await contractService.createContractProposal(
      enterpriseId,
      dto as contractService.CreateContractDto
    );

    res.status(201).json({
      success: true,
      message: 'Tao de xuat hop dong thanh cong',
      data: {
        contract: formatContract(contract),
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Tao de xuat hop dong that bai',
    });
  }
};