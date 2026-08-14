import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { Dispute } from '../models/Dispute.entity';
import { DisputeEvidence } from '../models/DisputeEvidence.entity';
import { Notification } from '../models/Notification.entity';
import { makeError } from '../utils/error.util';
import { notifyContractEmail as notifyEmail } from '../utils/notify.util';
import {
  lockByIdOrFail,
  lockOne,
  runLockedTransaction,
} from '../utils/transaction-lock.util';

const disputeRepo = () => AppDataSource.getRepository(Dispute);

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

  if (userRole !== 'farmer' && userRole !== 'enterprise') {
    throw makeError('Chi farmer hoac enterprise moi co the tao tranh chap', 403);
  }

  const evidenceItems = [
    ...normalizeEvidenceUrls(dto.evidenceUrls),
    ...(dto.evidenceFiles || []),
  ];

  const result = await runLockedTransaction(
    async (manager) => {
      const txContractRepo = manager.getRepository(Contract);
      const txEscrowRepo = manager.getRepository(Escrow);
      const txMilestoneRepo = manager.getRepository(EscrowMilestone);
      const txDisputeRepo = manager.getRepository(Dispute);
      const txEvidenceRepo = manager.getRepository(DisputeEvidence);
      const txNotificationRepo = manager.getRepository(Notification);

      // Cùng thứ tự lock với escrow/admin resolution:
      // Contract -> Escrow -> Dispute check -> Milestone.
      // Lock Contract là mutex nghiệp vụ cho mọi thao tác tạo dispute trên cùng hợp đồng.
      const contract = await lockByIdOrFail(
        manager,
        Contract,
        contractId,
        () => makeError('Khong tim thay hop dong', 404)
      );

      const roleInContract = getUserRoleInContract(contract, userId);
      if (!roleInContract) {
        throw makeError('Ban khong co quyen tao tranh chap cho hop dong nay', 403);
      }

      if (roleInContract !== userRole) {
        throw makeError('Vai tro tai khoan khong khop voi hop dong', 403);
      }

      if (!DISPUTABLE_CONTRACT_STATUSES.includes(contract.status)) {
        throw makeError('Chi co the tao tranh chap voi hop dong dang hoat dong', 400);
      }

      const escrow = await lockOne(manager, Escrow, { contractId: contract.id });
      if (!escrow) {
        throw makeError('Hop dong chua co ky quy, khong the tao tranh chap theo milestone', 400);
      }

      if (!DISPUTABLE_ESCROW_STATUSES.includes(escrow.status)) {
        throw makeError('Ky quy hien tai khong o trang thai co the tao tranh chap', 400);
      }

      // Business rule Fix 04: một Contract chỉ được có MỘT dispute đang hoạt động.
      // Kiểm tra này nằm sau Contract row lock nên hai request đồng thời không thể
      // cùng đọc "chưa có dispute" rồi cùng insert.
      const existingActiveDispute = await txDisputeRepo.findOne({
        where: [
          { contractId: contract.id, status: 'open' },
          { contractId: contract.id, status: 'under_review' },
        ],
        order: { createdAt: 'DESC' },
      });

      if (existingActiveDispute) {
        throw makeError(
          'Hop dong nay da co tranh chap dang xu ly. Vui long cho tranh chap hien tai duoc giai quyet.',
          409
        );
      }

      let milestone: EscrowMilestone | null = null;
      if (dto.milestoneStep !== undefined && dto.milestoneStep !== null) {
        const step = Number(dto.milestoneStep);

        if (!Number.isInteger(step) || step < 1) {
          throw makeError('Moc milestone khong hop le', 400);
        }

        milestone = await lockOne(manager, EscrowMilestone, {
          escrowId: escrow.id,
          step,
        });

        if (!milestone) {
          throw makeError('Khong tim thay milestone can tranh chap', 404);
        }

        if (!DISPUTABLE_MILESTONE_STATUSES.includes(milestone.status)) {
          throw makeError('Milestone hien tai khong the tao tranh chap', 400);
        }
      }

      const againstUserId = getPartnerId(contract, userId);
      if (!againstUserId) {
        throw makeError('Khong xac dinh duoc doi tac trong hop dong', 400);
      }

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

      const againstRole: 'farmer' | 'enterprise' =
        roleInContract === 'farmer' ? 'enterprise' : 'farmer';

      return {
        disputeId: dispute.id,
        contractId: contract.id,
        title,
        message,
        againstRole,
      };
    },
    { label: 'dispute.create' }
  );

  // Side effect ngoài transaction: transaction helper có thể retry khi deadlock.
  const createdDispute = await disputeRepo().findOne({
    where: { id: result.disputeId },
    relations: ['contract', 'escrow', 'raisedByUser', 'againstUser', 'evidences'],
  });

  if (!createdDispute) {
    throw makeError('Tranh chap da duoc tao nhung khong the tai lai du lieu', 500);
  }

  await notifyEmail(
    createdDispute.againstUser,
    result.againstRole,
    result.title,
    result.message,
    result.contractId
  );

  return createdDispute;
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

export interface ListDisputesQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export const listDisputesForUser = async (
  userId: string,
  role: string,
  query: ListDisputesQuery = {}
) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Math.floor(Number(query.page))
    : 1;
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

  // List view chỉ lấy relation thực sự được format ra response. Escrow/user relation
  // chỉ cần ở detail/resolution flow, tránh join thừa cho mỗi dòng danh sách.
  const qb = disputeRepo()
    .createQueryBuilder('dispute')
    .leftJoinAndSelect('dispute.contract', 'contract')
    .leftJoinAndSelect('dispute.evidences', 'evidences');

  if (role === 'admin') {
    qb.where('1 = 1');
  } else {
    qb.where('(dispute.raisedBy = :userId OR dispute.againstUserId = :userId)', {
      userId,
    });
  }

  if (query.status) {
    qb.andWhere('dispute.status = :status', { status: query.status });
  }

  qb.orderBy('dispute.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [disputes, total] = await qb.getManyAndCount();

  return {
    disputes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};