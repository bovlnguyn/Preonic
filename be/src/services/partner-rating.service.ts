import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { User } from '../models/User.entity';
import { PartnerRating } from '../models/PartnerRating.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { AppError } from '../middlewares/error.middleware';

const contractRepo       = () => AppDataSource.getRepository(Contract);
const userRepo           = () => AppDataSource.getRepository(User);
const partnerRatingRepo  = () => AppDataSource.getRepository(PartnerRating);
const milestoneRepo      = () => AppDataSource.getRepository(EscrowMilestone);

export type UserRole = 'farmer' | 'enterprise';

export interface FarmerToEnterpriseCriteria {
  transparency: number;
  paymentPunctuality: number;
  coordination: number;
}

export interface EnterpriseToFarmerCriteria {
  quality: number;
  onTimeDelivery: number;
  committedVolume: number;
}

export type RatingCriteria = FarmerToEnterpriseCriteria | EnterpriseToFarmerCriteria;

export interface CreatePartnerRatingDto {
  contractId: string;
  revieweeId: string;
  criteria: RatingCriteria;
  comment: string;
}

export interface EligiblePartnerContract {
  contractId: string;
  contractCode: string;
  productName: string;
  status: string;
  deliveryDate: Date;
}

export interface EligiblePartner {
  partnerId: string;
  partnerName: string;
  partnerRole: UserRole;
  reputationScore: number;
  totalRatings: number;
  contracts: EligiblePartnerContract[];
}

// Moc 4 (Kiem tra chat luong) hoan tat = doanh nghiep da nhan hang va giao hang
// coi nhu hoan thanh — chi luc nay hai ben moi duoc phep danh gia doi tac.
const DELIVERY_MILESTONE_STEP = 4;

const hasCompletedDelivery = async (contractId: string): Promise<boolean> => {
  const milestone = await milestoneRepo()
    .createQueryBuilder('milestone')
    .innerJoin(Escrow, 'escrow', 'escrow.id = milestone.escrowId')
    .where('escrow.contractId = :contractId', { contractId })
    .andWhere('milestone.step = :step', { step: DELIVERY_MILESTONE_STEP })
    .andWhere('milestone.status = :status', { status: 'completed' })
    .getOne();

  return Boolean(milestone);
};

const isValidScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;

const computeAverage = (values: number[]): number =>
  Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));

const ensureDirection = (role: UserRole, revieweeRole: UserRole): void => {
  if (role === revieweeRole) {
    throw new AppError('Bạn chỉ có thể đánh giá đối tác khác vai trò', 400);
  }
  if (role === 'farmer' && revieweeRole !== 'enterprise') {
    throw new AppError('Nông dân chỉ được đánh giá doanh nghiệp', 400);
  }
  if (role === 'enterprise' && revieweeRole !== 'farmer') {
    throw new AppError('Doanh nghiệp chỉ được đánh giá nông dân', 400);
  }
};

// Farmer -> Enterprise: transparency/paymentPunctuality/coordination.
// Enterprise -> Farmer: quality/onTimeDelivery/committedVolume.
// Ca hai duoc luu chung 1 bang PartnerRatings (cac cot con lai de null).
const normalizeCriteriaByRole = (role: UserRole, criteria: RatingCriteria): RatingCriteria => {
  if (role === 'farmer') {
    const payload = criteria as Partial<FarmerToEnterpriseCriteria>;
    if (
      !isValidScore(payload.transparency) ||
      !isValidScore(payload.paymentPunctuality) ||
      !isValidScore(payload.coordination)
    ) {
      throw new AppError(
        'Điểm đánh giá doanh nghiệp không hợp lệ. Yêu cầu 3 tiêu chí từ 1 đến 5.',
        400
      );
    }

    return {
      transparency: payload.transparency,
      paymentPunctuality: payload.paymentPunctuality,
      coordination: payload.coordination,
    };
  }

  const payload = criteria as Partial<EnterpriseToFarmerCriteria>;
  if (
    !isValidScore(payload.quality) ||
    !isValidScore(payload.onTimeDelivery) ||
    !isValidScore(payload.committedVolume)
  ) {
    throw new AppError(
      'Điểm đánh giá nông dân không hợp lệ. Yêu cầu 3 tiêu chí từ 1 đến 5.',
      400
    );
  }

  return {
    quality: payload.quality,
    onTimeDelivery: payload.onTimeDelivery,
    committedVolume: payload.committedVolume,
  };
};

const extractCriteriaScores = (criteria: RatingCriteria): number[] =>
  'transparency' in criteria
    ? [criteria.transparency, criteria.paymentPunctuality, criteria.coordination]
    : [criteria.quality, criteria.onTimeDelivery, criteria.committedVolume];

const recalculateUserReputation = async (userId: string): Promise<void> => {
  const { avg, total } = await partnerRatingRepo()
    .createQueryBuilder('rating')
    .select('AVG(rating.overallRating)', 'avg')
    .addSelect('COUNT(*)', 'total')
    .where('rating.revieweeId = :userId', { userId })
    .getRawOne();

  const reputationScore = avg ? Number(Number(avg).toFixed(2)) : 5;
  const totalRatings = Number(total) || 0;

  await userRepo().update({ id: userId }, { reputationScore, totalRatings });
};

export const getEligiblePartners = async (
  userId: string,
  role: UserRole
): Promise<EligiblePartner[]> => {
  const contracts = await contractRepo()
    .createQueryBuilder('contract')
    .innerJoin(Escrow, 'escrow', 'escrow.contractId = contract.id')
    .innerJoin(
      EscrowMilestone,
      'milestone',
      'milestone.escrowId = escrow.id AND milestone.step = :step AND milestone.status = :status',
      { step: DELIVERY_MILESTONE_STEP, status: 'completed' }
    )
    .leftJoinAndSelect('contract.farmer', 'farmer')
    .leftJoinAndSelect('contract.enterprise', 'enterprise')
    .where(
      role === 'farmer' ? 'contract.farmerId = :userId' : 'contract.enterpriseId = :userId',
      { userId }
    )
    .orderBy('contract.createdAt', 'DESC')
    .getMany();

  const map = new Map<string, EligiblePartner>();

  for (const contract of contracts) {
    const partner = role === 'farmer' ? contract.enterprise : contract.farmer;
    if (!partner) continue;

    if (!map.has(partner.id)) {
      map.set(partner.id, {
        partnerId: partner.id,
        partnerName: partner.fullName || 'Đối tác',
        partnerRole: partner.role as UserRole,
        reputationScore: Number(partner.reputationScore) || 5,
        totalRatings: partner.totalRatings || 0,
        contracts: [],
      });
    }

    map.get(partner.id)!.contracts.push({
      contractId: contract.id,
      contractCode: contract.contractCode,
      productName: contract.productName,
      status: contract.status,
      deliveryDate: contract.deliveryDate,
    });
  }

  return Array.from(map.values());
};

export const createRating = async (
  reviewerId: string,
  reviewerRole: UserRole,
  dto: CreatePartnerRatingDto
) => {
  const { contractId, revieweeId, criteria, comment } = dto;

  if (!contractId || !revieweeId || !criteria || !comment?.trim()) {
    throw new AppError('Thiếu dữ liệu đánh giá bắt buộc', 400);
  }

  const contract = await contractRepo().findOne({ where: { id: contractId } });
  if (!contract) {
    throw new AppError('Hợp đồng không tồn tại', 404);
  }

  if (!(await hasCompletedDelivery(contractId))) {
    throw new AppError(
      'Chỉ có thể đánh giá đối tác sau khi hoàn thành giao hàng (mốc Kiểm tra chất lượng) ở hợp đồng này',
      400
    );
  }

  const isReviewerParty =
    (reviewerRole === 'farmer' && contract.farmerId === reviewerId) ||
    (reviewerRole === 'enterprise' && contract.enterpriseId === reviewerId);

  if (!isReviewerParty) {
    throw new AppError('Bạn không thuộc hợp đồng này', 403);
  }

  const revieweeUser = await userRepo().findOne({ where: { id: revieweeId } });
  if (!revieweeUser) {
    throw new AppError('Đối tác cần đánh giá không tồn tại', 404);
  }

  if (revieweeUser.role === 'admin') {
    throw new AppError('Admin không thuộc đối tượng đánh giá đối tác', 400);
  }

  const revieweeRole = revieweeUser.role as UserRole;
  ensureDirection(reviewerRole, revieweeRole);

  const expectedRevieweeId = reviewerRole === 'farmer' ? contract.enterpriseId : contract.farmerId;
  if (expectedRevieweeId !== revieweeId) {
    throw new AppError('Bạn chỉ được đánh giá đúng đối tác trong hợp đồng đã chọn', 400);
  }

  const normalizedCriteria = normalizeCriteriaByRole(reviewerRole, criteria);

  const existed = await partnerRatingRepo().findOne({ where: { contractId, reviewerId } });
  if (existed) {
    throw new AppError('Bạn đã đánh giá đối tác trong hợp đồng này rồi', 400);
  }

  const overallRating = computeAverage(extractCriteriaScores(normalizedCriteria));

  const created = await partnerRatingRepo().save(
    partnerRatingRepo().create({
      contractId,
      reviewerId,
      revieweeId,
      reviewerRole,
      revieweeRole,
      ...normalizedCriteria,
      overallRating,
      comment: comment.trim(),
    })
  );

  await recalculateUserReputation(revieweeId);

  return created;
};

export const getMyRatings = async (userId: string, role: UserRole) => {
  const [givenRatings, receivedRatings] = await Promise.all([
    partnerRatingRepo().find({
      where: { reviewerId: userId, reviewerRole: role },
      relations: ['reviewee', 'contract'],
      order: { createdAt: 'DESC' },
    }),
    partnerRatingRepo().find({
      where: { revieweeId: userId, revieweeRole: role },
      relations: ['reviewer', 'contract'],
      order: { createdAt: 'DESC' },
    }),
  ]);

  return { givenRatings, receivedRatings };
};
