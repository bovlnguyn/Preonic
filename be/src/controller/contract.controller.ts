import { Response } from 'express';
import { AuthRequest } from '../types';
import * as contractService from '../services/contract.service';
import { sendError } from '../utils/controller.util';

const toNumber = (value: any) =>
  value === undefined || value === null || value === '' ? undefined : Number(value);

const buildDto = (body: any) => {
  const product = body.product || {};
  const terms = body.terms || {};
  const payment = body.payment || {};
  // Bao hiem nong nghiep ma doanh nghiep da mua san tu ben ngoai, nhap kem theo
  // de xuat hop dong (payload.insuranceEnterprise) -- fallback body.insurance de
  // tuong thich nguoc voi dang du lieu phang cu.
  const insuranceEnterprise = body.insuranceEnterprise || null;
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
    deliveryAddress: body.deliveryAddress ?? terms.deliveryAddress,

    depositPercentage: toNumber(body.depositPercentage ?? payment.depositPercentage),

    insuranceEnabled: body.insuranceEnabled ?? insurance.enabled ?? Boolean(insuranceEnterprise),
    insuranceProvider: insuranceEnterprise?.insuranceCompany ?? (body.insuranceProvider ?? insurance.provider),
    insurancePackage: body.insurancePackage ?? insurance.package,
    insuranceFee: toNumber(body.insuranceFee ?? insurance.fee),
    insurancePolicyNumber: insuranceEnterprise?.policyNumber,
    insuredValue: toNumber(insuranceEnterprise?.insuredValue),
    insuranceCoveredEvents: insuranceEnterprise?.coveredEvents,
    insuranceValidFrom: insuranceEnterprise?.validFrom,
    insuranceValidTo: insuranceEnterprise?.validTo,
    insuranceRiskSharingTerms: insuranceEnterprise?.riskSharingTerms,
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
  deliveryAddress: contract.deliveryAddress,

  insuranceEnabled: contract.insuranceEnabled,
  insuranceProvider: contract.insuranceProvider,
  insurancePackage: contract.insurancePackage,
  insuranceFee: contract.insuranceFee,
  insuranceStatus: contract.insuranceStatus,
  insurancePolicyNumber: contract.insurancePolicyNumber,
  insuredValue: contract.insuredValue,
  insuranceCoveredEvents: contract.insuranceCoveredEvents,
  insuranceValidFrom: contract.insuranceValidFrom,
  insuranceValidTo: contract.insuranceValidTo,
  insuranceRiskSharingTerms: contract.insuranceRiskSharingTerms,

  escrowStatus: contract.escrowStatus,
  deliveryStatus: contract.deliveryStatus,

  signedByFarmer: contract.signedByFarmer,
  signedByEnterprise: contract.signedByEnterprise,
  signedAt: contract.signedAt,

  cancelReason: contract.cancelReason,
  cancelledAt: contract.cancelledAt,
  cancelRequestedBy: contract.cancelRequestedBy,

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
    sendError(res, err, 'Tao de xuat hop dong that bai');
  }
};

export const submitContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.submitContractProposal(
      req.params.id,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'Gui de xuat hop dong thanh cong',
      data: { contract: formatContract(contract) },
    });
  } catch (err: any) {
    sendError(res, err, 'Gui de xuat hop dong that bai');
  }
};

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
    sendError(res, err, 'Lay danh sach hop dong that bai');
  }
};

export const getContractSummary = async (req: AuthRequest, res: Response) => {
  try {
    const summary = await contractService.getContractSummaryForUser(
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      data: {
        summary,
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay tong quan hop dong that bai');
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
    sendError(res, err, 'Lay hop dong that bai');
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
    sendError(res, err, 'Ky hop dong that bai');
  }
};
export const deleteContract = async (req: AuthRequest, res: Response) => {
  try {
    await contractService.deleteContract(req.params.id, req.user!.id, req.user!.role);

    res.status(200).json({
      success: true,
      message: 'Xoa hop dong thanh cong',
    });
  } catch (err: any) {
    sendError(res, err, 'Xoa hop dong that bai');
  }
};

export const cancelContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.cancelContract(
      req.params.id,
      req.user!.id,
      req.user!.role,
      {
        reason: req.body?.reason,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Huy hop dong thanh cong',
      data: {
        contract: formatContract(contract),
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Huy hop dong that bai');
  }
};
export const confirmCancelContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.confirmCancelContract(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      message: 'Da xac nhan huy hop dong',
      data: { contract: formatContract(contract) },
    });
  } catch (err: any) {
    sendError(res, err, 'Xac nhan huy hop dong that bai');
  }
};

export const declineCancelContract = async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractService.declineCancelContract(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      message: 'Da tu choi yeu cau huy hop dong',
      data: { contract: formatContract(contract) },
    });
  } catch (err: any) {
    sendError(res, err, 'Tu choi yeu cau huy hop dong that bai');
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
    sendError(res, err, 'Tu choi hop dong that bai');
  }
};
