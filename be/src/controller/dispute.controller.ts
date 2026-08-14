import { Response } from 'express';
import { AuthRequest } from '../types';
import * as disputeService from '../services/dispute.service';
import { sendError } from '../utils/controller.util';
import { cleanupUploadedFiles } from '../middlewares/uploads.middlewares';

const parseEvidenceUrls = (value: any): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) return value.map(String);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const getUploadedEvidenceFiles = (files: any) => {
  const evidenceFiles = files?.evidences || files?.evidence || [];

  if (!Array.isArray(evidenceFiles)) return [];

  return evidenceFiles.map((file: Express.Multer.File) => ({
    fileUrl: file.path,
    fileType: file.mimetype,
  }));
};

const formatDispute = (dispute: any) => ({
  id: dispute.id,
  contractId: dispute.contractId,
  escrowId: dispute.escrowId,
  milestoneStep: dispute.milestoneStep,
  raisedBy: dispute.raisedBy,
  raisedByRole: dispute.raisedByRole,
  againstUserId: dispute.againstUserId,
  reason: dispute.reason,
  status: dispute.status,
  adminNotes: dispute.adminNotes,
  resolution: dispute.resolution,
  resolvedAt: dispute.resolvedAt,
  createdAt: dispute.createdAt,
  updatedAt: dispute.updatedAt,

  contract: dispute.contract
    ? {
        id: dispute.contract.id,
        contractCode: dispute.contract.contractCode,
        status: dispute.contract.status,
        productName: dispute.contract.productName,
        farmerName: dispute.contract.farmerName,
        enterpriseName: dispute.contract.enterpriseName,
      }
    : undefined,

  evidences: (dispute.evidences || []).map((item: any) => ({
    id: item.id,
    fileUrl: item.fileUrl,
    fileType: item.fileType,
    uploadedAt: item.uploadedAt,
  })),
});

export const createDispute = async (req: AuthRequest, res: Response) => {
  try {
    const dispute = await disputeService.createDispute(
      req.user!.id,
      req.user!.role,
      {
        contractId: req.body.contractId,
        milestoneStep:
          req.body.milestoneStep !== undefined && req.body.milestoneStep !== ''
            ? Number(req.body.milestoneStep)
            : undefined,
        reason: req.body.reason,
        evidenceUrls: parseEvidenceUrls(req.body.evidenceUrls),
        evidenceFiles: getUploadedEvidenceFiles(req.files),
      }
    );

    res.status(201).json({
      success: true,
      message: 'Tao tranh chap thanh cong',
      data: {
        dispute: formatDispute(dispute),
      },
    });
  } catch (err: any) {
    await cleanupUploadedFiles(req);
    sendError(res, err, 'Tao tranh chap that bai');
  }
};

export const getDispute = async (req: AuthRequest, res: Response) => {
  try {
    const dispute = await disputeService.getDisputeForUser(
      req.params.id,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      data: {
        dispute: formatDispute(dispute),
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay tranh chap that bai');
  }
};

export const listDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const result = await disputeService.listDisputesForUser(
      req.user!.id,
      req.user!.role,
      {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 10),
      }
    );

    res.status(200).json({
      success: true,
      data: {
        disputes: result.disputes.map(formatDispute),
        pagination: result.pagination,
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay danh sach tranh chap that bai');
  }
};