import { Response } from 'express';
import { AuthRequest } from '../types';
import * as escrowService from '../services/escrow.service';
import { getMilestoneRequiredRole } from '../utils/milestone.util';
import { sendError } from '../utils/controller.util';

const formatMilestone = (m: any) => ({
  id: m.id,
  step: m.step,
  name: m.name,
  description: m.description,
  status: m.status,
  requiredBy: getMilestoneRequiredRole(m.step) ?? null,
  farmerConfirmed: m.farmerConfirmed,
  farmerConfirmedAt: m.farmerConfirmedAt,
  enterpriseConfirmed: m.enterpriseConfirmed,
  enterpriseConfirmedAt: m.enterpriseConfirmedAt,
  releaseAmount: m.releaseAmount,
  releasePercentage: m.releasePercentage,
  completedAt: m.completedAt,
  evidence: m.evidence,
});

const formatEscrow = (escrow: any) => {
  const milestones = (escrow.milestones || []).map(formatMilestone);
  const completedCount = milestones.filter((m: any) => m.status === 'completed').length;
  const totalAmount = Number(escrow.totalAmount) || 0;
  const releasedAmount = Number(escrow.releasedAmount) || 0;

  return {
    id: escrow.id,
    contractId: escrow.contractId,
    farmerId: escrow.farmerId,
    enterpriseId: escrow.enterpriseId,
    totalAmount: escrow.totalAmount,
    depositedAmount: escrow.depositedAmount,
    releasedAmount: escrow.releasedAmount,
    refundedAmount: escrow.refundedAmount,
    status: escrow.status,
    createdAt: escrow.createdAt,
    updatedAt: escrow.updatedAt,
    milestones,
    progress: {
      totalMilestones: milestones.length,
      completedMilestones: completedCount,
      percentComplete: milestones.length
        ? Math.round((completedCount / milestones.length) * 100)
        : 0,
      percentReleased: totalAmount > 0 ? Math.round((releasedAmount / totalAmount) * 100) : 0,
    },
  };
};

const formatEscrowListItem = (escrow: any, userId: string) => {
  const contract = escrow.contract;
  const isFarmer = escrow.farmerId === userId;

  return {
    ...formatEscrow(escrow),
    contractCode: contract?.contractCode ?? null,
    productName: contract?.productName ?? null,
    partnerName: (isFarmer ? contract?.enterpriseName : contract?.farmerName) ?? null,
  };
};

export const listEscrows = async (req: AuthRequest, res: Response) => {
  try {
    const escrows = await escrowService.listEscrowsForUser(req.user!.id, req.user!.role);

    res.status(200).json({
      success: true,
      data: { escrows: escrows.map((e) => formatEscrowListItem(e, req.user!.id)) },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay danh sach ky quy that bai');
  }
};

export const depositEscrow = async (req: AuthRequest, res: Response) => {
  try {
    const escrow = await escrowService.depositEscrow(req.params.contractId, req.user!.id);

    res.status(201).json({
      success: true,
      message: 'Nap ky quy thanh cong, hop dong da duoc kich hoat',
      data: { escrow: formatEscrow(escrow) },
    });
  } catch (err: any) {
    sendError(res, err, 'Nap ky quy that bai');
  }
};

export const getEscrow = async (req: AuthRequest, res: Response) => {
  try {
    const escrow = await escrowService.getEscrowByContract(req.params.contractId, req.user!.id);

    res.status(200).json({
      success: true,
      data: { escrow: formatEscrow(escrow) },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay thong tin ky quy that bai');
  }
};

export const confirmMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const step = Number(req.params.step);
    const escrow = await escrowService.confirmMilestone(
      req.params.contractId,
      step,
      req.user!.id,
      req.user!.role,
      { evidence: typeof req.body?.evidence === 'string' ? req.body.evidence : undefined }
    );

    res.status(200).json({
      success: true,
      message: 'Xac nhan moc thanh toan thanh cong',
      data: { escrow: formatEscrow(escrow) },
    });
  } catch (err: any) {
    sendError(res, err, 'Xac nhan moc thanh toan that bai');
  }
};
