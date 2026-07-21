import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { User } from '../models/User.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';
import { Notification } from '../models/Notification.entity';
import { buildMilestones, getMilestoneRequiredRole, MILESTONE_CONFIG } from '../utils/milestone.util';

const contractRepo = () => AppDataSource.getRepository(Contract);
const userRepo = () => AppDataSource.getRepository(User);
const escrowRepo = () => AppDataSource.getRepository(Escrow);

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const ESCROW_RELATIONS = ['milestones', 'transactions', 'contract', 'farmer', 'enterprise'];

const sortMilestones = (escrow: Escrow) => {
  if (escrow.milestones) {
    escrow.milestones = escrow.milestones.slice().sort((a, b) => a.step - b.step);
  }
  return escrow;
};

const withEscrowRelations = async (id: string) => {
  const escrow = await escrowRepo().findOne({ where: { id }, relations: ESCROW_RELATIONS });
  return escrow ? sortMilestones(escrow) : escrow;
};

export const depositEscrow = async (contractId: string, enterpriseId: string) => {
  const contract = await contractRepo().findOne({ where: { id: contractId } });
  if (!contract) throw makeError('Khong tim thay hop dong', 404);

  if (contract.enterpriseId !== enterpriseId) {
    throw makeError('Ban khong co quyen nap ky quy cho hop dong nay', 403);
  }

  if (contract.status !== 'active') {
    throw makeError('Hop dong chua duoc ky du hai ben, khong the nap ky quy', 400);
  }

  if (contract.escrowStatus && contract.escrowStatus !== 'none') {
    throw makeError('Hop dong da duoc nap ky quy', 400);
  }

  const existingEscrow = await escrowRepo().findOne({ where: { contractId } });
  if (existingEscrow) {
    throw makeError('Hop dong da co tai khoan ky quy', 400);
  }

  const amount = Number(contract.totalValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw makeError('Gia tri hop dong khong hop le', 400);
  }

  const enterprise = await userRepo().findOne({ where: { id: enterpriseId } });
  if (!enterprise) throw makeError('Khong tim thay doanh nghiep', 404);
  if (Number(enterprise.virtualBalance) < amount) {
    throw makeError('So du khong du de nap ky quy hop dong', 400);
  }

  const escrowId = await AppDataSource.transaction(async (manager) => {
    const txUserRepo = manager.getRepository(User);
    const txContractRepo = manager.getRepository(Contract);
    const txEscrowRepo = manager.getRepository(Escrow);
    const txMilestoneRepo = manager.getRepository(EscrowMilestone);
    const txTransactionRepo = manager.getRepository(EscrowTransaction);
    const txNotificationRepo = manager.getRepository(Notification);

    enterprise.virtualBalance = Number(enterprise.virtualBalance) - amount;
    await txUserRepo.save(enterprise);

    // Cơ chế: doanh nghiệp nạp 100% total vào escrow, hệ thống giải ngân ngay theo điều khoản.
    // Step 1 (Ký quỹ) hoàn tất ngay khi nạp và giải ngân ngay phần release của step 1 cho nông dân.
    const milestonesData = buildMilestones(contract.paymentTerms, amount);
    const step1ReleaseAmount = Number(milestonesData.find((m) => m.step === 1)?.releaseAmount ?? 0);

    const escrow = await txEscrowRepo.save(
      txEscrowRepo.create({
        contractId: contract.id,
        farmerId: contract.farmerId,
        enterpriseId: contract.enterpriseId,
        totalAmount: amount,
        depositedAmount: amount,
        releasedAmount: step1ReleaseAmount,
        // Escrows.Status chi cho phep: pending/active/completed/disputed/refunded/cancelled
        // (CK_Escrows_Status) -- 'active' nghia la da ky quy va dang theo doi milestone.
        status: 'active',
      })
    );

    // buildMilestones() tra ve requiredBy la vai tro (farmer/enterprise/system),
    // khong phai deadline nen khong gan vao cot EscrowMilestone.requiredBy (datetime2).
    const milestones = milestonesData.map(({ requiredBy, ...m }) => {
      const entity = txMilestoneRepo.create({ ...m, escrowId: escrow.id });
      if (m.step === 1) {
        entity.status = 'completed';
        entity.enterpriseConfirmed = true;
        entity.enterpriseConfirmedAt = new Date();
        entity.completedAt = new Date();
      }
      return entity;
    });
    await txMilestoneRepo.save(milestones);

    await txTransactionRepo.save(
      txTransactionRepo.create({
        escrowId: escrow.id,
        type: 'deposit',
        amount,
        fromUserId: enterpriseId,
        description: `Doanh nghiep nap ky quy hop dong ${contract.contractCode}`,
      })
    );

    if (step1ReleaseAmount > 0) {
      const farmer = await txUserRepo.findOne({ where: { id: contract.farmerId } });
      if (!farmer) throw makeError('Khong tim thay nong dan', 404);
      farmer.virtualBalance = Number(farmer.virtualBalance) + step1ReleaseAmount;
      await txUserRepo.save(farmer);

      await txTransactionRepo.save(
        txTransactionRepo.create({
          escrowId: escrow.id,
          type: 'release',
          amount: step1ReleaseAmount,
          fromUserId: enterpriseId,
          toUserId: contract.farmerId,
          milestoneStep: 1,
          description: `Giai ngan moc 1 (Ky quy) hop dong ${contract.contractCode}`,
        })
      );
    }

    contract.escrowStatus = 'funded';
    contract.paidAmount = amount;
    contract.remainingAmount = Number(contract.totalValue) - amount;
    contract.updatedBy = enterpriseId;
    await txContractRepo.save(contract);

    await txNotificationRepo.save(
      txNotificationRepo.create({
        userId: contract.farmerId,
        type: 'escrow_funded',
        title: 'Hop dong da duoc nap ky quy',
        message: `${contract.enterpriseName || 'Doanh nghiep'} da nap ky quy ${amount.toLocaleString('vi-VN')} VND cho hop dong ${contract.contractCode}. Hop dong chinh thuc co hieu luc, bat dau theo doi tien do cac moc thanh toan.`,
        relatedId: contract.id,
        relatedModel: 'Contract',
        severity: 'info',
        isRead: false,
        emailSent: false,
      })
    );

    return escrow.id;
  });

  return withEscrowRelations(escrowId);
};

export const getEscrowByContract = async (contractId: string, userId: string) => {
  const escrow = await escrowRepo().findOne({
    where: { contractId },
    relations: ESCROW_RELATIONS,
  });
  if (!escrow) throw makeError('Hop dong chua duoc nap ky quy', 404);
  if (escrow.farmerId !== userId && escrow.enterpriseId !== userId) {
    throw makeError('Ban khong co quyen xem ky quy cua hop dong nay', 403);
  }
  return sortMilestones(escrow);
};

export const listEscrowsForUser = async (userId: string, role: string) => {
  if (role !== 'farmer' && role !== 'enterprise') {
    throw makeError('Vai tro nguoi dung khong hop le', 403);
  }

  const where = role === 'farmer' ? { farmerId: userId } : { enterpriseId: userId };

  const escrows = await escrowRepo().find({
    where,
    relations: ESCROW_RELATIONS,
    order: { createdAt: 'DESC' },
  });

  return escrows.map(sortMilestones);
};

export interface ConfirmMilestoneDto {
  evidence?: string;
}

export const confirmMilestone = async (
  contractId: string,
  step: number,
  userId: string,
  role: string,
  dto: ConfirmMilestoneDto = {}
) => {
  if (!Number.isInteger(step) || step < 1 || step > MILESTONE_CONFIG.COUNT) {
    throw makeError('Moc thanh toan khong hop le', 400);
  }

  const escrow = await escrowRepo().findOne({
    where: { contractId },
    relations: ['milestones', 'contract'],
  });
  if (!escrow) throw makeError('Hop dong chua duoc nap ky quy', 404);

  if (escrow.status !== 'active') {
    throw makeError('Ky quy khong o trang thai co the xac nhan moc', 400);
  }

  const isFarmer = role === 'farmer' && escrow.farmerId === userId;
  const isEnterprise = role === 'enterprise' && escrow.enterpriseId === userId;
  if (!isFarmer && !isEnterprise) {
    throw makeError('Ban khong co quyen xac nhan moc cua hop dong nay', 403);
  }

  const milestone = escrow.milestones.find((m) => m.step === step);
  if (!milestone) throw makeError('Khong tim thay moc thanh toan', 404);

  const requiredRole = getMilestoneRequiredRole(step);
  if (!requiredRole || requiredRole === 'system') {
    throw makeError('Moc nay do he thong tu dong xu ly, khong the xac nhan thu cong', 400);
  }
  if (requiredRole === 'farmer' && !isFarmer) {
    throw makeError('Moc nay can nong dan xac nhan', 403);
  }
  if (requiredRole === 'enterprise' && !isEnterprise) {
    throw makeError('Moc nay can doanh nghiep xac nhan', 403);
  }

  if (milestone.status === 'completed') {
    throw makeError('Moc nay da duoc xac nhan truoc do', 400);
  }
  if (milestone.status === 'disputed') {
    throw makeError('Moc dang trong tranh chap, khong the xac nhan', 400);
  }

  if (step > 1) {
    const previous = escrow.milestones.find((m) => m.step === step - 1);
    if (!previous || previous.status !== 'completed') {
      throw makeError('Vui long hoan tat moc truoc do', 400);
    }
  }

  const releaseAmount = Number(milestone.releaseAmount || 0);
  const contractCode = escrow.contract?.contractCode ?? '';

  const escrowId = await AppDataSource.transaction(async (manager) => {
    const txMilestoneRepo = manager.getRepository(EscrowMilestone);
    const txEscrowRepo = manager.getRepository(Escrow);
    const txUserRepo = manager.getRepository(User);
    const txTransactionRepo = manager.getRepository(EscrowTransaction);
    const txNotificationRepo = manager.getRepository(Notification);

    const now = new Date();
    if (isFarmer) {
      milestone.farmerConfirmed = true;
      milestone.farmerConfirmedAt = now;
    } else {
      milestone.enterpriseConfirmed = true;
      milestone.enterpriseConfirmedAt = now;
    }
    milestone.status = 'completed';
    milestone.completedAt = now;
    if (dto.evidence) milestone.evidence = dto.evidence;
    await txMilestoneRepo.save(milestone);

    if (releaseAmount > 0) {
      const farmer = await txUserRepo.findOne({ where: { id: escrow.farmerId } });
      if (!farmer) throw makeError('Khong tim thay nong dan', 404);
      farmer.virtualBalance = Number(farmer.virtualBalance) + releaseAmount;
      await txUserRepo.save(farmer);

      escrow.releasedAmount = Number(escrow.releasedAmount) + releaseAmount;
      if (escrow.releasedAmount >= Number(escrow.depositedAmount)) {
        escrow.status = 'completed';
      }
      await txEscrowRepo.save(escrow);

      await txTransactionRepo.save(
        txTransactionRepo.create({
          escrowId: escrow.id,
          type: 'release',
          amount: releaseAmount,
          fromUserId: escrow.enterpriseId,
          toUserId: escrow.farmerId,
          milestoneStep: step,
          description: `Giai ngan moc ${step} (${milestone.name}) hop dong ${contractCode}`,
        })
      );
    }

    const confirmerName = isFarmer ? 'Nong dan' : 'Doanh nghiep';
    const partnerId = isFarmer ? escrow.enterpriseId : escrow.farmerId;
    await txNotificationRepo.save(
      txNotificationRepo.create({
        userId: partnerId,
        type: 'milestone_confirmed',
        title: `Da xac nhan moc: ${milestone.name}`,
        message:
          releaseAmount > 0
            ? `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contractCode}). He thong da giai ngan ${releaseAmount.toLocaleString('vi-VN')} VND cho nong dan.`
            : `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contractCode}).`,
        relatedId: escrow.contractId,
        relatedModel: 'Contract',
        severity: 'info',
        isRead: false,
        emailSent: false,
      })
    );

    return escrow.id;
  });

  return withEscrowRelations(escrowId);
};
