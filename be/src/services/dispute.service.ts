import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { Dispute } from '../models/Dispute.entity';
import { DisputeEvidence } from '../models/DisputeEvidence.entity';
import { Notification } from '../models/Notification.entity';

const contractRepo = () => AppDataSource.getRepository(Contract);
const escrowRepo = () => AppDataSource.getRepository(Escrow);
const milestoneRepo = () => AppDataSource.getRepository(EscrowMilestone);
const disputeRepo = () => AppDataSource.getRepository(Dispute);
const evidenceRepo = () => AppDataSource.getRepository(DisputeEvidence);
const notificationRepo = () => AppDataSource.getRepository(Notification);

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export interface CreateDisputeDto {
  contractId: string;
  milestoneStep?: number;
  reason: string;
  evidenceUrls?: string[];
  evidenceFiles?: Array<{
    fileUrl: string;
    fileType?: string;
  }>;
}

const DISPUTABLE_CONTRACT_STATUSES = ['active', 'disputed'];
const DISPUTABLE_ESCROW_STATUSES = ['active', 'disputed'];
const DISPUTABLE_MILESTONE_STATUSES = ['pending', 'waiting_confirmation', 'disputed'];

const normalizeEvidenceUrls = (value?: string[]) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((fileUrl) => ({
      fileUrl,
      fileType: getFileType(fileUrl),
    }));
};

const getFileType = (fileUrl: string) => {
  const lower = fileUrl.toLowerCase();

  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';

  return 'unknown';
};

const getPartnerId = (contract: Contract, userId: string) => {
  if (contract.farmerId === userId) return contract.enterpriseId;
  if (contract.enterpriseId === userId) return contract.farmerId;
  return null;
};

const getUserRoleInContract = (contract: Contract, userId: string) => {
  if (contract.farmerId === userId) return 'farmer';
  if (contract.enterpriseId === userId) return 'enterprise';
  return null;
};

export const createDispute = async (
  userId: string,
  userRole: string,
  dto: CreateDisputeDto
) => {
  const contractId = dto.contractId?.trim();
  const reason = dto.reason?.trim();

  if (!contractId) {
    throw makeError('Vui long chon hop dong can tao tranh chap', 400);
  }

  if (!reason) {
    throw makeError('Vui long nhap mo ta tranh chap', 400);
  }

  if (reason.length < 10) {
    throw makeError('Mo ta tranh chap phai co it nhat 10 ky tu', 400);
  }

  if (reason.length > 2000) {
    throw makeError('Mo ta tranh chap khong duoc vuot qua 2000 ky tu', 400);
  }

  const contract = await contractRepo().findOne({
    where: { id: contractId },
    relations: ['farmer', 'enterprise', 'product'],
  });

  if (!contract) {
    throw makeError('Khong tim thay hop dong', 404);
  }

  const roleInContract = getUserRoleInContract(contract, userId);
  if (!roleInContract) {
    throw makeError('Ban khong co quyen tao tranh chap cho hop dong nay', 403);
  }

  if (userRole !== 'farmer' && userRole !== 'enterprise') {
    throw makeError('Chi farmer hoac enterprise moi co the tao tranh chap', 403);
  }

  if (!DISPUTABLE_CONTRACT_STATUSES.includes(contract.status)) {
    throw makeError('Chi co the tao tranh chap voi hop dong dang hoat dong', 400);
  }

  const escrow = await escrowRepo().findOne({
    where: { contractId: contract.id },
  });

  if (!escrow) {
    throw makeError('Hop dong chua co ky quy, khong the tao tranh chap theo milestone', 400);
  }

  if (!DISPUTABLE_ESCROW_STATUSES.includes(escrow.status)) {
    throw makeError('Ky quy hien tai khong o trang thai co the tao tranh chap', 400);
  }

  let milestone: EscrowMilestone | null = null;
  if (dto.milestoneStep !== undefined && dto.milestoneStep !== null) {
    const step = Number(dto.milestoneStep);

    if (!Number.isInteger(step) || step < 1) {
      throw makeError('Moc milestone khong hop le', 400);
    }

    milestone = await milestoneRepo().findOne({
      where: {
        escrowId: escrow.id,
        step,
      },
    });

    if (!milestone) {
      throw makeError('Khong tim thay milestone can tranh chap', 404);
    }

    if (!DISPUTABLE_MILESTONE_STATUSES.includes(milestone.status)) {
      throw makeError('Milestone hien tai khong the tao tranh chap', 400);
    }
  }

  const existingOpenDispute = await disputeRepo().findOne({
    where: {
      contractId: contract.id,
      escrowId: escrow.id,
      milestoneStep: milestone?.step,
      status: 'open',
    },
  });

  if (existingOpenDispute) {
    throw makeError('Milestone nay da co tranh chap dang mo', 400);
  }

  const againstUserId = getPartnerId(contract, userId);
  if (!againstUserId) {
    throw makeError('Khong xac dinh duoc doi tac trong hop dong', 400);
  }

  const evidenceItems = [
    ...normalizeEvidenceUrls(dto.evidenceUrls),
    ...(dto.evidenceFiles || []),
  ];

  const disputeId = await AppDataSource.transaction(async (manager) => {
    const txDisputeRepo = manager.getRepository(Dispute);
    const txEvidenceRepo = manager.getRepository(DisputeEvidence);
    const txContractRepo = manager.getRepository(Contract);
    const txEscrowRepo = manager.getRepository(Escrow);
    const txMilestoneRepo = manager.getRepository(EscrowMilestone);
    const txNotificationRepo = manager.getRepository(Notification);

    const dispute = await txDisputeRepo.save(
      txDisputeRepo.create({
        contractId: contract.id,
        escrowId: escrow.id,
        milestoneStep: milestone?.step,
        raisedBy: userId,
        raisedByRole: roleInContract,
        againstUserId,
        reason,
        status: 'open',
      })
    );

    if (evidenceItems.length > 0) {
      await txEvidenceRepo.save(
        evidenceItems.map((item) =>
          txEvidenceRepo.create({
            disputeId: dispute.id,
            fileUrl: item.fileUrl,
            fileType: item.fileType || getFileType(item.fileUrl),
            uploadedAt: new Date(),
          })
        )
      );
    }

    contract.status = 'disputed';
    contract.updatedBy = userId;
    await txContractRepo.save(contract);

    escrow.status = 'disputed';
    await txEscrowRepo.save(escrow);

    if (milestone) {
      milestone.status = 'disputed';
      await txMilestoneRepo.save(milestone);
    }

    const title = 'Hop dong co tranh chap moi';
    const message = `${roleInContract === 'farmer' ? contract.farmerName || 'Nong dan' : contract.enterpriseName || 'Doanh nghiep'} da tao tranh chap cho hop dong ${contract.contractCode}${milestone ? ` tai moc ${milestone.step} - ${milestone.name}` : ''}. Ly do: ${reason}`;

    await txNotificationRepo.save(
      txNotificationRepo.create({
        userId: againstUserId,
        type: 'dispute_created',
        title,
        message,
        relatedId: dispute.id,
        relatedModel: 'Dispute',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      })
    );

    return dispute.id;
  });

  return disputeRepo().findOne({
    where: { id: disputeId },
    relations: ['contract', 'escrow', 'raisedByUser', 'againstUser', 'evidences'],
  });
};

export const getDisputeForUser = async (
  disputeId: string,
  userId: string,
  role: string
) => {
  const dispute = await disputeRepo().findOne({
    where: { id: disputeId },
    relations: ['contract', 'escrow', 'raisedByUser', 'againstUser', 'evidences'],
  });

  if (!dispute) {
    throw makeError('Khong tim thay tranh chap', 404);
  }

  if (
    role !== 'admin' &&
    dispute.raisedBy !== userId &&
    dispute.againstUserId !== userId
  ) {
    throw makeError('Ban khong co quyen xem tranh chap nay', 403);
  }

  return dispute;
};

export const listDisputesForUser = async (
  userId: string,
  role: string,
  status?: string
) => {
  const qb = disputeRepo()
    .createQueryBuilder('dispute')
    .leftJoinAndSelect('dispute.contract', 'contract')
    .leftJoinAndSelect('dispute.escrow', 'escrow')
    .leftJoinAndSelect('dispute.raisedByUser', 'raisedByUser')
    .leftJoinAndSelect('dispute.againstUser', 'againstUser')
    .leftJoinAndSelect('dispute.evidences', 'evidences');

  if (role === 'admin') {
    qb.where('1 = 1');
  } else {
    qb.where('(dispute.raisedBy = :userId OR dispute.againstUserId = :userId)', {
      userId,
    });
  }

  if (status) {
    qb.andWhere('dispute.status = :status', { status });
  }

  qb.orderBy('dispute.createdAt', 'DESC');

  return qb.getMany();
};