import { LessThanOrEqual, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { Product } from '../models/Product.entity';
import { User } from '../models/User.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { EscrowTransaction } from '../models/EscrowTransaction.entity';
import { Notification } from '../models/Notification.entity';
import { buildMilestones, getMilestoneRequiredRole, MILESTONE_CONFIG } from '../utils/milestone.util';
import { logAction, logError } from './systemLog.service';
import { makeError } from '../utils/error.util';
import { notifyContractEmail as notifyEmail } from '../utils/notify.util';
import { lockByIdOrFail, lockOne, lockOneOrFail, runLockedTransaction } from '../utils/transaction-lock.util';
import { getHarvestEligibility } from '../utils/harvet.util';

const contractRepo = () => AppDataSource.getRepository(Contract);
const userRepo = () => AppDataSource.getRepository(User);
const escrowRepo = () => AppDataSource.getRepository(Escrow);
const milestoneRepo = () => AppDataSource.getRepository(EscrowMilestone);
const notificationRepo = () => AppDataSource.getRepository(Notification);

// Detail API/response chi su dung milestones; transactions/user relations duoc tai rieng khi can.
const ESCROW_RELATIONS = ['milestones'];

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
  let failedContractCode = contractId;
  let failedAmount: number | undefined;

  try {
    const result = await runLockedTransaction(
      async (manager) => {
        const txUserRepo = manager.getRepository(User);
        const txContractRepo = manager.getRepository(Contract);
        const txEscrowRepo = manager.getRepository(Escrow);
        const txMilestoneRepo = manager.getRepository(EscrowMilestone);
        const txTransactionRepo = manager.getRepository(EscrowTransaction);
        const txNotificationRepo = manager.getRepository(Notification);

        // Contract la "gate row" cua luong nap ky quy. Hai request nap cho cung mot
        // hop dong buoc phai noi duoi nhau tai day truoc khi kiem tra trang thai.
        const contract = await lockByIdOrFail(
          manager,
          Contract,
          contractId,
          () => makeError('Khong tim thay hop dong', 404)
        );

        failedContractCode = contract.contractCode || contractId;

        if (contract.enterpriseId !== enterpriseId) {
          throw makeError('Ban khong co quyen nap ky quy cho hop dong nay', 403);
        }

        if (contract.status !== 'approved') {
          throw makeError('Hop dong chua duoc ky du hai ben hoac chua o trang thai cho khoa ky quy', 400);
        }

        if (contract.escrowStatus && contract.escrowStatus !== 'none') {
          throw makeError('Hop dong da duoc nap ky quy', 400);
        }

        // Defense-in-depth: ContractId cua Escrow da UNIQUE trong DB. Kiem tra lai
        // ben trong transaction de request thu hai khong the tao escrow thu hai.
        const existingEscrow = await lockOne(manager, Escrow, { contractId });
        if (existingEscrow) {
          throw makeError('Hop dong da co tai khoan ky quy', 400);
        }

        const amount = Number(contract.totalValue);
        failedAmount = amount;
        if (!Number.isFinite(amount) || amount <= 0) {
          throw makeError('Gia tri hop dong khong hop le', 400);
        }

        // Lock doanh nghiep TRUOC khi doc balance. Khong su dung object User duoc
        // doc ngoai transaction, vi withdrawal/topup co the thay doi balance dong thoi.
        const enterprise = await lockByIdOrFail(
          manager,
          User,
          enterpriseId,
          () => makeError('Khong tim thay doanh nghiep', 404)
        );

        const enterpriseBalance = Number(enterprise.virtualBalance);
        if (!Number.isFinite(enterpriseBalance) || enterpriseBalance < amount) {
          throw makeError('So du khong du de nap ky quy hop dong', 400);
        }

        const milestonesData = buildMilestones(
          contract.paymentTerms,
          amount,
          Number(contract.depositPercentage)
        );
        const step1ReleaseAmount = Number(
          milestonesData.find((m) => m.step === 1)?.releaseAmount ?? 0
        );

        if (!Number.isFinite(step1ReleaseAmount) || step1ReleaseAmount < 0 || step1ReleaseAmount > amount) {
          throw makeError('Cau hinh giai ngan moc ky quy khong hop le', 500);
        }

        // Neu moc 1 giai ngan ngay, lock nong dan truoc khi thay doi so du.
        // Lock nay cung nam trong transaction nen moi phep cong tien khac phai cho.
        let farmer: User | null = null;
        if (step1ReleaseAmount > 0) {
          farmer = await lockByIdOrFail(
            manager,
            User,
            contract.farmerId,
            () => makeError('Khong tim thay nong dan', 404)
          );
        }

        enterprise.virtualBalance = enterpriseBalance - amount;
        await txUserRepo.save(enterprise);

        // Doanh nghiep nap 100% total vao escrow. Step 1 co the giai ngan ngay
        // tuy paymentTerms, phan con lai duoc giu lai cho cac milestone sau.
        const escrow = await txEscrowRepo.save(
          txEscrowRepo.create({
            contractId: contract.id,
            farmerId: contract.farmerId,
            enterpriseId: contract.enterpriseId,
            totalAmount: amount,
            depositedAmount: amount,
            releasedAmount: step1ReleaseAmount,
            status: 'active',
          })
        );

        const now = new Date();
        const milestones = milestonesData.map(({ requiredBy, ...m }) => {
          const entity = txMilestoneRepo.create({ ...m, escrowId: escrow.id });
          if (m.step === 1) {
            entity.status = 'completed';
            entity.enterpriseConfirmed = true;
            entity.enterpriseConfirmedAt = now;
            entity.completedAt = now;
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

        let commissionAmount = 0;
        if (step1ReleaseAmount > 0 && farmer) {
          const farmerBalance = Number(farmer.virtualBalance);
          if (!Number.isFinite(farmerBalance)) {
            throw makeError('So du nong dan khong hop le', 500);
          }

          // Dieu khoan "100% tra truoc": moc 1 giai ngan het toan bo gia tri hop dong,
          // day cung la lan chi tra duy nhat cho nong dan nen phai tru hoa hong ngay tai day.
          if (step1ReleaseAmount >= amount) {
            commissionAmount = Math.min(Math.max(Number(contract.commission) || 0, 0), step1ReleaseAmount);
          }

          farmer.virtualBalance = farmerBalance + step1ReleaseAmount - commissionAmount;
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

          if (commissionAmount > 0) {
            await txTransactionRepo.save(
              txTransactionRepo.create({
                escrowId: escrow.id,
                type: 'commission',
                amount: commissionAmount,
                fromUserId: contract.farmerId,
                milestoneStep: 1,
                description: `Phi hoa hong nen tang ${Number(contract.commissionRate) || 0}% hop dong ${contract.contractCode}`,
              })
            );
          }
        }

        contract.status = 'active';
        contract.escrowStatus = 'funded';
        contract.paidAmount = amount;
        contract.remainingAmount = Number(contract.totalValue) - amount;
        contract.updatedBy = enterpriseId;
        await txContractRepo.save(contract);

        const escrowFundedTitle = 'Hop dong da duoc nap ky quy';
        const escrowFundedMessage = `${contract.enterpriseName || 'Doanh nghiep'} da nap ky quy ${amount.toLocaleString('vi-VN')} VND cho hop dong ${contract.contractCode}. Hop dong chinh thuc co hieu luc, bat dau theo doi tien do cac moc thanh toan.`;

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

        return {
          escrowId: escrow.id,
          contractId: contract.id,
          contractCode: contract.contractCode,
          farmerId: contract.farmerId,
          amount,
          commissionAmount,
          enterpriseDisplayName: enterprise.fullName || enterprise.email,
          escrowFundedTitle,
          escrowFundedMessage,
        };
      },
      { label: 'escrow.deposit' }
    );

    // Side effects ngoai DB chi chay SAU COMMIT. runLockedTransaction co the retry
    // khi deadlock nen khong gui email/log ben trong callback transaction.
    logAction({
      category: 'escrow',
      action: 'escrow_deposit',
      message: `${result.enterpriseDisplayName} da nap ky quy ${result.amount.toLocaleString('vi-VN')} VND cho hop dong ${result.contractCode}`,
      userId: enterpriseId,
      targetType: 'Escrow',
      targetId: result.escrowId,
      metadata: { contractCode: result.contractCode, amount: result.amount, commissionAmount: result.commissionAmount },
    });

    const farmer = await userRepo().findOne({ where: { id: result.farmerId } });
    await notifyEmail(
      farmer,
      'farmer',
      result.escrowFundedTitle,
      result.escrowFundedMessage,
      result.contractId
    );

    return withEscrowRelations(result.escrowId);
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'escrow_deposit_failed',
      message: `Loi nap ky quy hop dong ${failedContractCode}: ${err.message || err}`,
      userId: enterpriseId,
      targetType: 'Contract',
      targetId: contractId,
      metadata: {
        contractCode: failedContractCode,
        ...(failedAmount != null ? { amount: failedAmount } : {}),
      },
      error: err,
    });
    throw err;
  }
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

export interface ListEscrowsQuery {
  page?: number;
  limit?: number;
  status?: string;
  contractIds?: string[];
}

const normalizeEscrowListQuery = (query: ListEscrowsQuery = {}) => {
  const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0
    ? Math.floor(Number(query.page))
    : 1;
  const limit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
    ? Math.min(Math.floor(Number(query.limit)), 50)
    : 12;
  const contractIds = Array.isArray(query.contractIds)
    ? Array.from(new Set(query.contractIds.filter(Boolean))).slice(0, 50)
    : [];

  return { page, limit, status: query.status, contractIds };
};

/**
 * Danh sach escrow duoc phan trang theo root row truoc, sau do moi nap relation
 * can cho UI (Contract + Milestones). Khong nap Transactions/Farmer/Enterprise
 * cho list view de tranh nhan ban row va overfetch khi lich su escrow tang lon.
 */
export const listEscrowsForUser = async (
  userId: string,
  role: string,
  query: ListEscrowsQuery = {}
) => {
  if (role !== 'farmer' && role !== 'enterprise') {
    throw makeError('Vai tro nguoi dung khong hop le', 403);
  }

  const { page, limit, status, contractIds } = normalizeEscrowListQuery(query);
  const ownerColumn = role === 'farmer' ? 'escrow.farmerId' : 'escrow.enterpriseId';

  const base = escrowRepo()
    .createQueryBuilder('escrow')
    .where(`${ownerColumn} = :userId`, { userId });

  if (status) {
    base.andWhere('escrow.status = :status', { status });
  }
  if (contractIds.length > 0) {
    base.andWhere('escrow.contractId IN (:...contractIds)', { contractIds });
  }

  const total = await base.clone().getCount();
  if (total === 0) {
    return {
      escrows: [] as Escrow[],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // Lay ID cua root rows truoc de pagination khong bi anh huong boi JOIN one-to-many milestones.
  const idRows = await base
    .clone()
    .select('escrow.id', 'id')
    .orderBy('escrow.createdAt', 'DESC')
    .addOrderBy('escrow.id', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .getRawMany<{ id: string }>();

  const ids = idRows.map((row) => row.id).filter(Boolean);
  if (ids.length === 0) {
    return {
      escrows: [] as Escrow[],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  const escrows = await escrowRepo()
    .createQueryBuilder('escrow')
    // List card chỉ cần vài snapshot từ Contract, không cần Notes/Insurance/...
    .leftJoin('escrow.contract', 'contract')
    .addSelect([
      'contract.id',
      'contract.contractCode',
      'contract.productName',
      'contract.farmerName',
      'contract.enterpriseName',
    ])
    // List view không hiển thị evidence; bỏ nvarchar(max) này khỏi payload DB.
    .leftJoin('escrow.milestones', 'milestones')
    .addSelect([
      'milestones.id',
      'milestones.escrowId',
      'milestones.step',
      'milestones.name',
      'milestones.description',
      'milestones.status',
      'milestones.farmerConfirmed',
      'milestones.farmerConfirmedAt',
      'milestones.enterpriseConfirmed',
      'milestones.enterpriseConfirmedAt',
      'milestones.releaseAmount',
      'milestones.releasePercentage',
      'milestones.completedAt',
    ])
    .where('escrow.id IN (:...ids)', { ids })
    .orderBy('escrow.createdAt', 'DESC')
    .addOrderBy('milestones.step', 'ASC')
    .getMany();

  return {
    escrows: escrows.map(sortMilestones),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * KPI escrow duoc tinh truc tiep tai SQL thay vi tai FE sau khi tai toan bo
 * lich su + milestones. Endpoint nay rat nhe va dung cho Dashboard/Overview.
 */
export const getEscrowSummaryForUser = async (userId: string, role: string) => {
  if (role !== 'farmer' && role !== 'enterprise') {
    throw makeError('Vai tro nguoi dung khong hop le', 403);
  }

  const ownerColumn = role === 'farmer' ? 'escrow.farmerId' : 'escrow.enterpriseId';
  const row = await escrowRepo()
    .createQueryBuilder('escrow')
    .select('COUNT_BIG(*)', 'totalEscrows')
    .addSelect('COALESCE(SUM(escrow.depositedAmount), 0)', 'totalDeposited')
    .addSelect('COALESCE(SUM(escrow.releasedAmount), 0)', 'totalReleased')
    .addSelect(
      `COALESCE(SUM(CASE WHEN escrow.status = 'active' THEN escrow.totalAmount - escrow.releasedAmount ELSE 0 END), 0)`,
      'pendingAmount'
    )
    .addSelect(`SUM(CASE WHEN escrow.status = 'active' THEN 1 ELSE 0 END)`, 'activeCount')
    .where(`${ownerColumn} = :userId`, { userId })
    .getRawOne();

  return {
    totalEscrows: Number(row?.totalEscrows || 0),
    totalDeposited: Number(row?.totalDeposited || 0),
    totalReleased: Number(row?.totalReleased || 0),
    pendingAmount: Number(row?.pendingAmount || 0),
    activeCount: Number(row?.activeCount || 0),
  };
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

  let failedContractCode = contractId;
  let failedReleaseAmount = 0;

  try {
    const result = await runLockedTransaction(
      async (manager) => {
        const txMilestoneRepo = manager.getRepository(EscrowMilestone);
        const txEscrowRepo = manager.getRepository(Escrow);
        const txUserRepo = manager.getRepository(User);
        const txTransactionRepo = manager.getRepository(EscrowTransaction);
        const txNotificationRepo = manager.getRepository(Notification);
        const txContractRepo = manager.getRepository(Contract);

        // Thu tu lock co dinh: Contract -> Escrow -> Milestone -> User.
        // Moi confirm tren cung hop dong se noi duoi nhau tai Escrow, do do hai request
        // khong the cung doc mot milestone cu va giai ngan hai lan.
        const contract = await lockByIdOrFail(
          manager,
          Contract,
          contractId,
          () => makeError('Khong tim thay hop dong', 404)
        );
        failedContractCode = contract.contractCode || contractId;

        const escrow = await lockOneOrFail(
          manager,
          Escrow,
          { contractId },
          () => makeError('Hop dong chua duoc nap ky quy', 404)
        );

        if (escrow.status !== 'active') {
          throw makeError('Ky quy khong o trang thai co the xac nhan moc', 400);
        }

        const isFarmer = role === 'farmer' && escrow.farmerId === userId;
        const isEnterprise = role === 'enterprise' && escrow.enterpriseId === userId;
        if (!isFarmer && !isEnterprise) {
          throw makeError('Ban khong co quyen xac nhan moc cua hop dong nay', 403);
        }

        // Step 3 la moc Farmer xac nhan da giao hang. Backend phai tu enforce
        // ngay thu hoach, khong chi dua vao nut bi disable o FE vi API co the bi
        // goi truc tiep. Product da bi khoa chinh sua khi contract active, nen doc
        // snapshot ngay thu hoach tai day la du de bao ve business rule.
        if (step === 3) {
          const product = await manager.getRepository(Product).findOne({
            where: { id: contract.productId },
          });
          if (!product) {
            throw makeError('Khong tim thay san pham cua hop dong', 404);
          }

          const harvest = getHarvestEligibility(product.expectedDate);
          if (!harvest.shippingAllowed) {
            throw makeError(harvest.reason || 'Chua den ngay thu hoach', 409);
          }
        }

        const milestone = await lockOneOrFail(
          manager,
          EscrowMilestone,
          { escrowId: escrow.id, step },
          () => makeError('Khong tim thay moc thanh toan', 404)
        );

        const requiredRole = getMilestoneRequiredRole(step);
        if (!requiredRole) {
          throw makeError('Moc thanh toan khong hop le', 400);
        }

        // Moc cuoi can ca hai ben. Step 1-4 chi nguoi duoc chi dinh duoc confirm.
        const requiresBoth = requiredRole === 'both';
        if (!requiresBoth) {
          if (requiredRole === 'farmer' && !isFarmer) {
            throw makeError('Moc nay can nong dan xac nhan', 403);
          }
          if (requiredRole === 'enterprise' && !isEnterprise) {
            throw makeError('Moc nay can doanh nghiep xac nhan', 403);
          }
        }

        // Toan bo validation trang thai duoc thuc hien SAU KHI row da lock.
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
          const previous = await lockOne(
            manager,
            EscrowMilestone,
            { escrowId: escrow.id, step: step - 1 }
          );
          if (!previous || previous.status !== 'completed') {
            throw makeError('Vui long hoan tat moc truoc do', 400);
          }
        }

        // Voi moc ca hai ben: request dau tien chi ghi nhan xac nhan; request thu hai
        // (sau khi cho lock) doc duoc trang thai moi va moi duoc phep giai ngan.
        const otherSideAlreadyConfirmed = isFarmer
          ? milestone.enterpriseConfirmed
          : milestone.farmerConfirmed;
        const willComplete = !requiresBoth || otherSideAlreadyConfirmed;
        const releaseAmount = willComplete ? Number(milestone.releaseAmount || 0) : 0;
        failedReleaseAmount = releaseAmount;

        if (!Number.isFinite(releaseAmount) || releaseAmount < 0) {
          throw makeError('So tien giai ngan cua moc khong hop le', 500);
        }

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

        let escrowCompleted = false;
        let commissionAmount = 0;

        if (releaseAmount > 0) {
          // Defense-in-depth cho du lieu cu/bat thuong: neu da co release transaction
          // cho cung milestone thi tuyet doi khong cong tien lan nua.
          const existingRelease = await txTransactionRepo.findOne({
            where: {
              escrowId: escrow.id,
              type: 'release',
              milestoneStep: step,
            },
          });
          if (existingRelease) {
            throw makeError('Moc nay da duoc giai ngan truoc do', 409);
          }

          const farmer = await lockByIdOrFail(
            manager,
            User,
            escrow.farmerId,
            () => makeError('Khong tim thay nong dan', 404)
          );

          const farmerBalance = Number(farmer.virtualBalance);
          const releasedBefore = Number(escrow.releasedAmount || 0);
          const depositedAmount = Number(escrow.depositedAmount || 0);

          if (
            !Number.isFinite(farmerBalance) ||
            !Number.isFinite(releasedBefore) ||
            !Number.isFinite(depositedAmount) ||
            depositedAmount < 0
          ) {
            throw makeError('Du lieu so du ky quy khong hop le', 500);
          }

          let releasedAfter = releasedBefore + releaseAmount;
          // Cho phep sai so toi da 1 xu do cot decimal(18,2), nhung khong bao gio
          // duoc giai ngan vuot depositedAmount mot cach thuc su.
          if (releasedAfter > depositedAmount + 0.01) {
            throw makeError('So tien giai ngan vuot qua so tien da ky quy', 409);
          }
          if (Math.abs(releasedAfter - depositedAmount) <= 0.01) {
            releasedAfter = depositedAmount;
          }

          const fundsFullyReleased = releasedAfter >= depositedAmount;
          // Phi hoa hong chi thu MOT LAN khi dot giai ngan nay lam toan bo tien
          // trong escrow duoc chi het. Tuy nhien, tien chi het KHONG dong nghia
          // contract da hoan tat: 100_delivery co the chi het tien o step 4 nhung
          // van phai doi ca hai ben xac nhan step 5.
          if (fundsFullyReleased) {
            commissionAmount = Math.min(Math.max(Number(contract.commission) || 0, 0), releaseAmount);
          }

          farmer.virtualBalance = farmerBalance + releaseAmount - commissionAmount;
          await txUserRepo.save(farmer);

          escrow.releasedAmount = releasedAfter;
          const isFinalMilestone = step === MILESTONE_CONFIG.COUNT && willComplete;
          if (fundsFullyReleased && isFinalMilestone) {
            escrow.status = 'completed';
            escrowCompleted = true;

            contract.status = 'completed';
            contract.completedAt = now;
            contract.escrowStatus = 'released';
            contract.paidAmount = releasedAfter;
            contract.remainingAmount = 0;
            contract.updatedBy = userId;
            await txContractRepo.save(contract);
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
              description: `Giai ngan moc ${step} (${milestone.name}) hop dong ${contract.contractCode}`,
            })
          );

          if (commissionAmount > 0) {
            await txTransactionRepo.save(
              txTransactionRepo.create({
                escrowId: escrow.id,
                type: 'commission',
                amount: commissionAmount,
                fromUserId: escrow.farmerId,
                milestoneStep: step,
                description: `Phi hoa hong nen tang ${Number(contract.commissionRate) || 0}% hop dong ${contract.contractCode}`,
              })
            );
          }
        } else if (step === MILESTONE_CONFIG.COUNT && willComplete) {
          // Mot so dieu khoan (100_upfront, 100_delivery) co the da giai ngan het
          // tien truoc step 5. Step 5 van la gate nghiep vu bat buoc de ca hai ben
          // xac nhan hoan tat; chi tai day moi chuyen Escrow/Contract sang completed.
          const releasedBefore = Number(escrow.releasedAmount || 0);
          const depositedAmount = Number(escrow.depositedAmount || 0);
          if (
            Number.isFinite(releasedBefore) &&
            Number.isFinite(depositedAmount) &&
            depositedAmount > 0 &&
            releasedBefore >= depositedAmount - 0.01
          ) {
            escrow.status = 'completed';
            escrowCompleted = true;

            contract.status = 'completed';
            contract.completedAt = now;
            contract.escrowStatus = 'released';
            contract.paidAmount = releasedBefore;
            contract.remainingAmount = 0;
            contract.updatedBy = userId;
            await txContractRepo.save(contract);
            await txEscrowRepo.save(escrow);
          }
        }

        await txMilestoneRepo.save(milestone);

        const confirmerName = isFarmer ? 'Nong dan' : 'Doanh nghiep';
        const partnerId = isFarmer ? escrow.enterpriseId : escrow.farmerId;
        const partnerRole: 'farmer' | 'enterprise' = isFarmer ? 'enterprise' : 'farmer';
        const milestoneTitle = willComplete
          ? `Da xac nhan moc: ${milestone.name}`
          : `Cho ban xac nhan: ${milestone.name}`;
        const farmerNetAmount = releaseAmount - commissionAmount;
        const commissionNote =
          commissionAmount > 0
            ? ` (da tru ${commissionAmount.toLocaleString('vi-VN')} VND phi hoa hong nen tang ${Number(contract.commissionRate) || 0}%)`
            : '';
        const milestoneMessage = willComplete
          ? releaseAmount > 0
            ? `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contract.contractCode}). He thong da giai ngan ${farmerNetAmount.toLocaleString('vi-VN')} VND cho nong dan${commissionNote}.`
            : `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contract.contractCode}).`
          : `${confirmerName} da xac nhan moc "${milestone.name}" (hop dong ${contract.contractCode}). Vui long xac nhan de hoan tat va giai ngan so du con lai.`;

        const completedTitle = 'Hop dong da hoan tat';
        const completedMessage = `Hop dong ${contract.contractCode} da giai ngan het ky quy va chuyen sang trang thai Hoan tat.`;

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

        if (escrowCompleted) {
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

        return {
          escrowId: escrow.id,
          contractId: escrow.contractId,
          contractCode: contract.contractCode,
          farmerId: escrow.farmerId,
          enterpriseId: escrow.enterpriseId,
          partnerId,
          partnerRole,
          milestoneTitle,
          milestoneMessage,
          completedTitle,
          completedMessage,
          releaseAmount,
          commissionAmount,
          escrowCompleted,
        };
      },
      { label: `escrow.confirmMilestone.${step}` }
    );

    // Log/email chi chay mot lan sau khi transaction da COMMIT thanh cong.
    if (result.releaseAmount > 0) {
      logAction({
        category: 'escrow',
        action: 'escrow_release',
        message: `Giai ngan moc ${step} (${result.releaseAmount.toLocaleString('vi-VN')} VND) cho hop dong ${result.contractCode}${
          result.commissionAmount > 0
            ? `, thu hoa hong ${result.commissionAmount.toLocaleString('vi-VN')} VND`
            : ''
        }`,
        userId,
        targetType: 'Escrow',
        targetId: result.escrowId,
        metadata: {
          contractCode: result.contractCode,
          step,
          releaseAmount: result.releaseAmount,
          commissionAmount: result.commissionAmount,
        },
      });
    }

    const partner = await userRepo().findOne({ where: { id: result.partnerId } });
    await notifyEmail(
      partner,
      result.partnerRole,
      result.milestoneTitle,
      result.milestoneMessage,
      result.contractId
    );

    if (result.escrowCompleted) {
      const [farmer, enterprise] = await Promise.all([
        userRepo().findOne({ where: { id: result.farmerId } }),
        userRepo().findOne({ where: { id: result.enterpriseId } }),
      ]);
      await notifyEmail(
        farmer,
        'farmer',
        result.completedTitle,
        result.completedMessage,
        result.contractId
      );
      await notifyEmail(
        enterprise,
        'enterprise',
        result.completedTitle,
        result.completedMessage,
        result.contractId
      );
    }

    return withEscrowRelations(result.escrowId);
  } catch (err: any) {
    logError({
      category: 'payment',
      action: 'escrow_release_failed',
      message: `Loi giai ngan moc ${step} hop dong ${failedContractCode}: ${err.message || err}`,
      userId,
      targetType: 'Contract',
      targetId: contractId,
      metadata: { step, releaseAmount: failedReleaseAmount },
      error: err,
    });
    throw err;
  }
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
