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
  signedAt: contract.signedAt,

  cancelReason: contract.cancelReason,
  cancelledAt: contract.cancelledAt,

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

// export const listContracts = async (req: AuthRequest, res: Response) => {
//   try {
//     const status = typeof req.query.status === 'string' ? req.query.status : undefined;
//     const contracts = await contractService.listContractsForUser(
//       req.user!.id,
//       req.user!.role,
//       status
//     );

//     res.status(200).json({
//       success: true,
//       data: { contracts: contracts.map(formatContract) },
//     });
//   } catch (err: any) {
//     res.status(err.statusCode || 500).json({
//       success: false,
//       message: err.message || 'Lay danh sach hop dong that bai',
//     });
//   }
// };

export const listContracts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await contractService.listContractsForUser(
      req.user!.id,
      req.user!.role,
      {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
        order: typeof req.query.order === 'string' ? req.query.order : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        contracts: result.contracts.map(formatContract),
        pagination: result.pagination,
        filters: result.filters,
      },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay danh sach hop dong that bai',
    });
  }
};

export const getContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.getContractForUser(req.params.id, req.user!.id);

    res.status(200).json({
      success: true,
      data: { contract: formatContract(contract) },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay hop dong that bai',
    });
  }
};

export const signContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.signContract(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      message: 'Ky hop dong thanh cong',
      data: { contract: formatContract(contract) },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Ky hop dong that bai',
    });
  }
};

export const rejectContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.rejectContract(
      req.params.id,
      req.user!.id,
      req.body?.reason
    );

    res.status(200).json({
      success: true,
      message: 'Tu choi hop dong thanh cong',
      data: { contract: formatContract(contract) },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Tu choi hop dong that bai',
    });
  }
};