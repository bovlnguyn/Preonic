import { LessThanOrEqual, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { User } from '../models/User.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';
import { Notification } from '../models/Notification.entity';
import { buildMilestones, getMilestoneRequiredRole, MILESTONE_CONFIG } from '../utils/milestone.util';
import { logAction, logError } from './systemLog.service';
import { sendNotificationEmail, buildContractUrl } from './email.service';
import { displayName } from '../utils/user.util';

const contractRepo = () => AppDataSource.getRepository(Contract);
const userRepo = () => AppDataSource.getRepository(User);
const escrowRepo = () => AppDataSource.getRepository(Escrow);
const milestoneRepo = () => AppDataSource.getRepository(EscrowMilestone);
const notificationRepo = () => AppDataSource.getRepository(Notification);

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Email khong duoc lam gian doan luong nghiep vu ky quy -- loi gui mail chi log, khong throw.
const notifyEmail = async (
  user: User | null | undefined,
  role: 'farmer' | 'enterprise',
  title: string,
  message: string,
  contractId: string
) => {
  if (!user?.email) return;
  try {
    await sendNotificationEmail(user.email, displayName(user), title, message, buildContractUrl(role, contractId));
  } catch (err: any) {
    console.error('Loi gui email thong bao ky quy:', err.message || err);
  }
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

  if (contract.status !== 'approved') {
    throw makeError('Hop dong chua duoc ky du hai ben hoac chua o trang thai cho khoa ky quy', 400);
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

  const escrowFundedTitle = 'Hop dong da duoc nap ky quy';
  const escrowFundedMessage = `${contract.enterpriseName || 'Doanh nghiep'} da nap ky quy ${amount.toLocaleString('vi-VN')} VND cho hop dong ${contract.contractCode}. Hop dong chinh thuc co hieu luc, bat dau theo doi tien do cac moc thanh toan.`;

  let escrowId: string;
  try {
    escrowId = await AppDataSource.transaction(async (manager) => {
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

    contract.status = 'active';
    contract.escrowStatus = 'funded';
    contract.paidAmount = amount;
    contract.remainingAmount = Number(contract.totalValue) - amount;
    contract.updatedBy = enterpriseId;
    await txContractRepo.save(contract);

    await txNotificationRepo.save(
      txNotificationRepo.create({
        userId: contract.farmerId,
        type: 'escrow_funded',
        title: escrowFundedTitle,
        message: escrowFundedMessage,
        relatedId: contract.id,
        relatedModel: 'Contract',
        severity: 'info',
        isRead: false,
        emailSent: false,
      })
    );

    return escrow.id;
    });
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'escrow_deposit_failed',
      message: `Loi nap ky quy hop dong ${contract.contractCode}: ${err.message || err}`,
      userId: enterpriseId,
      targetType: 'Contract',
      targetId: contract.id,
      metadata: { contractCode: contract.contractCode, amount },
      error: err,
    });
    throw err;
  }

  logAction({
    category: 'escrow',
    action: 'escrow_deposit',
    message: `${enterprise.fullName || enterprise.email} da nap ky quy ${amount.toLocaleString('vi-VN')} VND cho hop dong ${contract.contractCode}`,
    userId: enterpriseId,
    targetType: 'Escrow',
    targetId: escrowId,
    metadata: { contractCode: contract.contractCode, amount },
  });

  const farmer = await userRepo().findOne({ where: { id: contract.farmerId } });
  await notifyEmail(farmer, 'farmer', escrowFundedTitle, escrowFundedMessage, contract.id);

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
  if (!requiredRole) {
    throw makeError('Moc thanh toan khong hop le', 400);
  }
  // Moc cuoi (Hoan tat) can CA HAI ben bam xac nhan moi giai ngan — con lai
  // (step 1-4) chi can dung mot ben (nguoi duoc chi dinh) xac nhan la xong ngay.
  const requiresBoth = requiredRole === 'both';
  if (!requiresBoth) {
    if (requiredRole === 'farmer' && !isFarmer) {
      throw makeError('Moc nay can nong dan xac nhan', 403);
    }
    if (requiredRole === 'enterprise' && !isEnterprise) {
      throw makeError('Moc nay can doanh nghiep xac nhan', 403);
    }
  }

  if (milestone.status === 'completed') {
    throw makeError('Moc nay da duoc xac nhan truoc do', 400);
  }
  if (milestone.status === 'disputed') {
    throw makeError('Moc dang trong tranh chap, khong the xac nhan', 400);
  }
  if (isFarmer && milestone.farmerConfirmed) {
    throw makeError('Ban da xac nhan moc nay roi, dang cho ben con lai xac nhan', 400);
  }
  if (isEnterprise && milestone.enterpriseConfirmed) {
    throw makeError('Ban da xac nhan moc nay roi, dang cho ben con lai xac nhan', 400);
  }

  if (step > 1) {
    const previous = escrow.milestones.find((m) => m.step === step - 1);
    if (!previous || previous.status !== 'completed') {
      throw makeError('Vui long hoan tat moc truoc do', 400);
    }
  }

  // Voi moc "ca hai ben": chi thuc su hoan tat + giai ngan khi ben con lai
  // da xac nhan tu truoc; neu day la nguoi dau tien xac nhan thi chi ghi
  // nhan phan cua ho va cho ben kia.
  const otherSideAlreadyConfirmed = isFarmer ? milestone.enterpriseConfirmed : milestone.farmerConfirmed;
  const willComplete = !requiresBoth || otherSideAlreadyConfirmed;

  const releaseAmount = willComplete ? Number(milestone.releaseAmount || 0) : 0;
  const contractCode = escrow.contract?.contractCode ?? '';

  const confirmerName = isFarmer ? 'Nong dan' : 'Doanh nghiep';
  const partnerId = isFarmer ? escrow.enterpriseId : escrow.farmerId;
  const partnerRole: 'farmer' | 'enterprise' = isFarmer ? 'enterprise' : 'farmer';
  const milestoneTitle = willComplete ? `Da xac nhan moc: ${milestone.name}` : `Cho ban xac nhan: ${milestone.name}`;
  const milestoneMessage = willComplete
    ? (releaseAmount > 0
        ? `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contractCode}). He thong da giai ngan ${releaseAmount.toLocaleString('vi-VN')} VND cho nong dan.`
        : `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contractCode}).`)
    : `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contractCode}). Vui long xac nhan de hoan tat va giai ngan so du con lai.`;
  const completedTitle = 'Hop dong da hoan tat';
  const completedMessage = `Hop dong ${contractCode} da giai ngan het ky quy va chuyen sang trang thai Hoan tat.`;

  let escrowId: string;
  try {
    escrowId = await AppDataSource.transaction(async (manager) => {
    const txMilestoneRepo = manager.getRepository(EscrowMilestone);
    const txEscrowRepo = manager.getRepository(Escrow);
    const txUserRepo = manager.getRepository(User);
    const txTransactionRepo = manager.getRepository(EscrowTransaction);
    const txNotificationRepo = manager.getRepository(Notification);
    const txContractRepo = manager.getRepository(Contract);

    const now = new Date();
    if (isFarmer) {
      milestone.farmerConfirmed = true;
      milestone.farmerConfirmedAt = now;
    } else {
      milestone.enterpriseConfirmed = true;
      milestone.enterpriseConfirmedAt = now;
    }
    if (willComplete) {
      milestone.status = 'completed';
      milestone.completedAt = now;
    } else {
      milestone.status = 'waiting_confirmation';
    }
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

        // Da giai ngan het ky quy (thuong la sau khi ca hai ben xac nhan moc 5 "Hoan tat")
        // -- hop dong chinh thuc chuyen sang trang thai 'completed'.
        const finishedContract = escrow.contract;
        if (finishedContract) {
          finishedContract.status = 'completed';
          finishedContract.completedAt = now;
          finishedContract.escrowStatus = 'released';
          finishedContract.paidAmount = Number(escrow.releasedAmount);
          finishedContract.remainingAmount = 0;
          finishedContract.updatedBy = userId;
          await txContractRepo.save(finishedContract);
        }
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

    await txNotificationRepo.save(
      txNotificationRepo.create({
        userId: partnerId,
        type: 'milestone_confirmed',
        title: milestoneTitle,
        message: milestoneMessage,
        relatedId: escrow.contractId,
        relatedModel: 'Contract',
        severity: 'info',
        isRead: false,
        emailSent: false,
      })
    );

    if (escrow.status === 'completed') {
      await txNotificationRepo.save(
        [escrow.farmerId, escrow.enterpriseId].map((uid) =>
          txNotificationRepo.create({
            userId: uid,
            type: 'contract_completed',
            title: completedTitle,
            message: completedMessage,
            relatedId: escrow.contractId,
            relatedModel: 'Contract',
            severity: 'info',
            isRead: false,
            emailSent: false,
          })
        )
      );
    }

    return escrow.id;
    });
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'escrow_release_failed',
      message: `Loi giai ngan moc ${step} hop dong ${contractCode}: ${err.message || err}`,
      userId,
      targetType: 'Contract',
      targetId: contractId,
      metadata: { step, releaseAmount },
      error: err,
    });
    throw err;
  }

  if (releaseAmount > 0) {
    logAction({
      category: 'escrow',
      action: 'escrow_release',
      message: `Giai ngan moc ${step} (${releaseAmount.toLocaleString('vi-VN')} VND) cho hop dong ${contractCode}`,
      userId,
      targetType: 'Escrow',
      targetId: escrowId,
      metadata: { contractCode, step, releaseAmount },
    });
  }

  const partner = await userRepo().findOne({ where: { id: partnerId } });
  await notifyEmail(partner, partnerRole, milestoneTitle, milestoneMessage, escrow.contractId);

  if ((escrow.status as string) === 'completed') {
    const [farmer, enterprise] = await Promise.all([
      userRepo().findOne({ where: { id: escrow.farmerId } }),
      userRepo().findOne({ where: { id: escrow.enterpriseId } }),
    ]);
    await notifyEmail(farmer, 'farmer', completedTitle, completedMessage, escrow.contractId);
    await notifyEmail(enterprise, 'enterprise', completedTitle, completedMessage, escrow.contractId);
  }

  return withEscrowRelations(escrowId);
};

const QUALITY_CHECK_REMINDER_DELAY_MS = 2 * 24 * 60 * 60 * 1000; // 2 ngay ke tu khi giao hang
const QUALITY_CHECK_REMINDER_DEDUPE_MS = 22 * 60 * 60 * 1000; // khong nhac lai trong 22h

// Nong dan da xac nhan "Giao hang" (moc 3) tu 2 ngay truoc nhung doanh nghiep
// van chua xac nhan "Kiem tra chat luong" (moc 4) — nhac doanh nghiep xu ly,
// vi moc 4 la dieu kien de he thong tu dong giai ngan not con lai (moc 5).
export const remindPendingQualityChecks = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - QUALITY_CHECK_REMINDER_DELAY_MS);

  const shippedMilestones = await milestoneRepo().find({
    where: { step: 3, status: 'completed', completedAt: LessThanOrEqual(cutoff) },
  });

  let notified = 0;

  for (const shipped of shippedMilestones) {
    const escrow = await escrowRepo().findOne({
      where: { id: shipped.escrowId },
      relations: ['milestones', 'contract'],
    });
    if (!escrow || escrow.status !== 'active') continue;

    const qualityCheck = escrow.milestones.find((m) => m.step === 4);
    if (!qualityCheck || qualityCheck.status !== 'pending') continue;

    const recentReminder = await notificationRepo().findOne({
      where: {
        userId: escrow.enterpriseId,
        type: 'shipping_reminder',
        relatedId: escrow.contractId,
        createdAt: MoreThan(new Date(Date.now() - QUALITY_CHECK_REMINDER_DEDUPE_MS)),
      },
    });
    if (recentReminder) continue;

    const contractCode = escrow.contract?.contractCode ?? '';
    const daysSince = Math.floor((Date.now() - shipped.completedAt.getTime()) / (24 * 60 * 60 * 1000));
    const reminderTitle = 'Hang da giao — can kiem tra chat luong';
    const reminderMessage = `Nong dan da xac nhan giao hang cho hop dong ${contractCode} tu ${daysSince} ngay truoc. Vui long kiem tra va xac nhan chat luong de he thong giai ngan phan con lai.`;

    await notificationRepo().save(
      notificationRepo().create({
        userId: escrow.enterpriseId,
        type: 'shipping_reminder',
        title: reminderTitle,
        message: reminderMessage,
        relatedId: escrow.contractId,
        relatedModel: 'Contract',
        severity: 'warning',
        isRead: false,
        emailSent: false,
      })
    );

    const enterprise = await userRepo().findOne({ where: { id: escrow.enterpriseId } });
    await notifyEmail(enterprise, 'enterprise', reminderTitle, reminderMessage, escrow.contractId);

    notified++;
  }

  return notified;
};
