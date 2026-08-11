import { EntityManager, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../models/Product.entity';
import { ProductCertification } from '../models/ProductCertification.entity';
import { ProductCommitment } from '../models/ProductCommitment.entity';
import { Review } from '../models/Review.entity';
import { User } from '../models/User.entity';
import { Contract } from '../models/Contract.entity';
import { Escrow } from '../models/Escrow.entity';
import { EscrowMilestone } from '../models/EscrowMilestone.entity';
import { PRODUCT_CONFIG } from '../constants';
import { makeError } from '../utils/error.util';
import { lockByIdOrFail, runLockedTransaction } from '../utils/transaction-lock.util';

const productRepo   = () => AppDataSource.getRepository(Product);
const certRepo      = () => AppDataSource.getRepository(ProductCertification);
const commitRepo    = () => AppDataSource.getRepository(ProductCommitment);
const reviewRepo    = () => AppDataSource.getRepository(Review);
const userRepo      = () => AppDataSource.getRepository(User);
const contractRepo  = () => AppDataSource.getRepository(Contract);
const milestoneRepo = () => AppDataSource.getRepository(EscrowMilestone);

// Moc 4 (Kiem tra chat luong) hoan tat = doanh nghiep da thuc su nhan hang.
// Chi doanh nghiep da tung nhan hang cua san pham nay (o bat ky hop dong nao)
// moi duoc danh gia — tranh review ao tu nguoi chua tung giao dich.
const RECEIVED_GOODS_MILESTONE_STEP = 4;

const hasReceivedGoods = async (productId: string, enterpriseId: string) => {
  const received = await milestoneRepo()
    .createQueryBuilder('milestone')
    .innerJoin(Escrow, 'escrow', 'escrow.id = milestone.escrowId')
    .innerJoin(Contract, 'contract', 'contract.id = escrow.contractId')
    .where('contract.productId = :productId', { productId })
    .andWhere('contract.enterpriseId = :enterpriseId', { enterpriseId })
    .andWhere('milestone.step = :step', { step: RECEIVED_GOODS_MILESTONE_STEP })
    .andWhere('milestone.status = :status', { status: 'completed' })
    .getOne();

  return Boolean(received);
};

// Trạng thái hợp đồng đã vượt qua đề xuất ban đầu ('draft') và chưa bị hủy —
// một khi tồn tại, sản phẩm liên quan không còn được sửa/xóa nữa.
const LOCKED_CONTRACT_STATUSES = ['pending', 'approved', 'active', 'cancel_pending', 'completed', 'disputed'];

const assertNoLockedContract = async (productId: string, manager?: EntityManager) => {
  const repo = manager ? manager.getRepository(Contract) : contractRepo();
  const count = await repo.count({
    where: { productId, status: In(LOCKED_CONTRACT_STATUSES) },
  });
  if (count > 0) {
    throw makeError('Sản phẩm đã có hợp đồng được xác nhận, không thể chỉnh sửa hoặc xóa', 409);
  }
};

// ══════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════
export interface CreateProductDto {
  // Bước 1 — Thông tin cơ bản
  name:     string;
  category: 'fruit' | 'vegetable' | 'rice' | 'coffee' | 'tea' | 'spice' | 'grain' | 'other';
  region:   'north' | 'central' | 'south';
  type:     'fresh' | 'dried' | 'processed';
  variety?:  string;
  area?:     number;

  // Bước 2 — Chi tiết
  priceMin?:      number;
  priceMax?:      number;
  unit?:          string;
  priceUnit?:     string;
  totalQuantity?: number;
  plantDate?:     string;
  expectedDate?:  string;
  description?:   string;
  nutritionInfo?: string;
  note?:          string;
  badge?:         string;
  commitments?:   string[];

  // Bước 3 — Hình ảnh / Chứng chỉ
  imagePaths?: string[];
  certifications?: {
    value: string;
    fileUrl?: string;
  }[];
}

export type UpdateProductDto = Partial<CreateProductDto>;

export type ProductFilters = {
  category?: string;
  region?:   string;
  type?:     string;
  search?:   string;
  minPrice?: number;
  maxPrice?: number;
  page?:     number;
  limit?:    number;
  sort?:     string;
};

const PRODUCT_SORT_OPTIONS: Record<string, { column: string; direction: 'ASC' | 'DESC' }> = {
  default:    { column: 'product.createdAt', direction: 'DESC' },
  price_asc:  { column: 'product.priceMin',  direction: 'ASC'  },
  price_desc: { column: 'product.priceMax',  direction: 'DESC' },
  rating:     { column: 'product.rating',    direction: 'DESC' },
  name:       { column: 'product.name',      direction: 'ASC'  },
};

// ── Các field cho phép cập nhật qua API update ──
const UPDATABLE_FIELDS: (keyof Product)[] = [
  'name', 'location', 'farm', 'variety', 'area', 'image', 'images',
  'priceMin', 'priceMax', 'unit', 'priceUnit', 'plantDate', 'expectedDate',
  'progress', 'remaining', 'totalQuantity',
  'note', 'badge', 'category', 'region', 'type',
  'description', 'nutritionInfo',
];

// ══════════════════════════════════════════
// HELPER — build query filter
// ══════════════════════════════════════════
const buildFilteredQuery = (filters: ProductFilters) => {
  const qb = productRepo()
    .createQueryBuilder('product')
    .where('product.isActive = :isActive', { isActive: true });

  if (filters.category) {
    qb.andWhere('product.category = :category', { category: filters.category });
  }
  if (filters.region) {
    qb.andWhere('product.region = :region', { region: filters.region });
  }
  if (filters.type) {
    qb.andWhere('product.type = :type', { type: filters.type });
  }
  if (filters.search) {
    qb.andWhere(
      '(product.name LIKE :search OR product.location LIKE :search OR product.farm LIKE :search OR product.description LIKE :search)',
      { search: `%${filters.search}%` }
    );
  }
  // Lọc theo khoảng giá — sản phẩm hợp lệ nếu khoảng giá của nó giao với khoảng yêu cầu
  if (filters.minPrice != null) {
    qb.andWhere('(product.priceMax IS NULL OR product.priceMax >= :minPrice)', { minPrice: filters.minPrice });
  }
  if (filters.maxPrice != null) {
    qb.andWhere('(product.priceMin IS NULL OR product.priceMin <= :maxPrice)', { maxPrice: filters.maxPrice });
  }

  return qb;
};

// ══════════════════════════════════════════
// LẤY DANH SÁCH SẢN PHẨM (có filter + phân trang)
// ══════════════════════════════════════════
export const getAll = async (filters: ProductFilters) => {
  const page  = filters.page  || 1;
  const limit = filters.limit || PRODUCT_CONFIG.DEFAULT_PAGE_SIZE;
  const skip  = (page - 1) * limit;

  const sortOption = PRODUCT_SORT_OPTIONS[filters.sort || 'default'] || PRODUCT_SORT_OPTIONS.default;

  const qb = buildFilteredQuery(filters)
    .orderBy(sortOption.column, sortOption.direction)
    .skip(skip)
    .take(limit);

  const [products, total] = await qb.getManyAndCount();

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// ══════════════════════════════════════════
// LẤY SẢN PHẨM THEO ID
// ══════════════════════════════════════════
export const getById = async (productId: string) => {
  const product = await productRepo().findOne({
    where: { id: productId },
    relations: ['certifications', 'commitments'],
  });

  if (!product || !product.isActive) {
    throw makeError('Sản phẩm không tồn tại', 404);
  }

  return product;
};

// ══════════════════════════════════════════
// SẢN PHẨM TƯƠNG TỰ (cùng vùng miền hoặc nhóm sản phẩm)
// ══════════════════════════════════════════
export const getSimilar = async (productId: string, limit: number = 4) => {
  const product = await productRepo().findOne({ where: { id: productId } });
  if (!product) throw makeError('Sản phẩm không tồn tại', 404);

  return productRepo()
    .createQueryBuilder('product')
    .where('product.id != :id', { id: productId })
    .andWhere('product.isActive = :isActive', { isActive: true })
    .andWhere('(product.region = :region OR product.category = :category)', {
      region:   product.region,
      category: product.category,
    })
    .orderBy('product.rating', 'DESC')
    .take(limit)
    .getMany();
};

// ══════════════════════════════════════════
// SẢN PHẨM THEO VÙNG MIỀN
// ══════════════════════════════════════════
export const getByRegion = async (region: string) => {
  return productRepo().find({
    where: { region: region as any, isActive: true },
    order: { rating: 'DESC' },
  });
};

// ══════════════════════════════════════════
// SẢN PHẨM THEO NGƯỜI ĐĂNG (farmer)
// ══════════════════════════════════════════
export const getByUser = async (userId: string) => {
  return productRepo()
    .createQueryBuilder('product')
    .where('product.createdBy = :userId', { userId })
    .andWhere('product.isActive = :isActive', { isActive: true })
    .orderBy('product.createdAt', 'DESC')
    .leftJoinAndSelect('product.certifications', 'certifications')
    .leftJoinAndSelect('product.commitments', 'commitments')
    .getMany();
};

// ══════════════════════════════════════════
// TẠO SẢN PHẨM MỚI (form 4 bước)
// ══════════════════════════════════════════
export const create = async (userId: string, dto: CreateProductDto) => {
  if (!dto.name?.trim()) throw makeError('Tên sản phẩm là bắt buộc');
  if (!dto.category)     throw makeError('Vui lòng chọn loại nông sản');
  if (!dto.region)       throw makeError('Vui lòng chọn vùng miền');
  if (!dto.type)         throw makeError('Vui lòng chọn hình thức (tươi/khô/đã sơ chế)');

  if (dto.priceMin != null && dto.priceMax != null && dto.priceMin > dto.priceMax) {
    throw makeError('Giá tối thiểu không được lớn hơn giá tối đa');
  }

  if (dto.totalQuantity != null && (!Number.isFinite(dto.totalQuantity) || dto.totalQuantity < 0)) {
    throw makeError('Tổng sản lượng không hợp lệ');
  }

  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) throw makeError('Không tìm thấy người dùng', 404);
  if (user.role !== 'farmer') throw makeError('Chỉ Nông dân mới có thể đăng bán sản phẩm', 403);

  const imagePaths = dto.imagePaths || [];
  const mainImage  = imagePaths[0] || null;
  const sellerName = user.fullName?.trim() || PRODUCT_CONFIG.DEFAULT_SELLER_NAME;

  const savedProductId = await runLockedTransaction(
    async (manager) => {
      const txProductRepo = manager.getRepository(Product);
      const txCommitRepo = manager.getRepository(ProductCommitment);
      const txCertRepo = manager.getRepository(ProductCertification);

      const product = txProductRepo.create({
        name:          dto.name.trim(),
        category:      dto.category,
        region:        dto.region,
        type:          dto.type,
        // farm/location là snapshot từ hồ sơ người bán, không nhận từ client
        farm:          user.farmName?.trim() || undefined,
        location:      [user.ward, user.district, user.province].filter(Boolean).join(', ') || undefined,
        variety:       dto.variety?.trim(),
        area:          dto.area ?? null,

        priceMin:      dto.priceMin ?? null,
        priceMax:      dto.priceMax ?? null,
        unit:          dto.unit?.trim(),
        priceUnit:     dto.priceUnit?.trim() || dto.unit?.trim(),
        totalQuantity: dto.totalQuantity ?? null,
        remaining:     dto.totalQuantity ?? null,
        progress:      0,
        plantDate:     dto.plantDate ? new Date(dto.plantDate) : undefined,
        expectedDate:  dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        description:   dto.description?.trim(),
        nutritionInfo: dto.nutritionInfo?.trim(),
        note:          dto.note?.trim(),
        badge:         dto.badge?.trim(),

        image:  mainImage,
        images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : null,

        sellerUserId:         user.id,
        sellerName,
        sellerAvatar:         user.avatar,
        sellerRating:         user.reputationScore ?? PRODUCT_CONFIG.DEFAULT_SELLER_RATING,
        sellerTotalContracts: PRODUCT_CONFIG.DEFAULT_TOTAL_CONTRACTS,

        createdBy: user.id,
        isActive:  true,
      } as Partial<Product>);

      const savedProduct = await txProductRepo.save(product);

      if (dto.commitments && dto.commitments.length > 0) {
        const commitEntities = dto.commitments
          .filter(c => c?.trim())
          .map((value, index) =>
            txCommitRepo.create({
              productId: savedProduct.id,
              value: value.trim(),
              sortOrder: index,
            })
          );
        if (commitEntities.length > 0) await txCommitRepo.save(commitEntities);
      }

      if (dto.certifications && dto.certifications.length > 0) {
        const certEntities = dto.certifications
          .filter(c => c?.value?.trim())
          .map((c, index) =>
            txCertRepo.create({
              productId: savedProduct.id,
              value: c.value.trim(),
              fileUrl: c.fileUrl,
              sortOrder: index,
            })
          );
        if (certEntities.length > 0) await txCertRepo.save(certEntities);
      }

      return savedProduct.id;
    },
    { label: 'product.create' }
  );

  return getById(savedProductId);
};

// ══════════════════════════════════════════
// CẬP NHẬT SẢN PHẨM (chỉ chủ sở hữu)
// ══════════════════════════════════════════
export const update = async (
  productId: string,
  userId: string,
  dto: UpdateProductDto
) => {
  await runLockedTransaction(
    async (manager) => {
      const txProductRepo = manager.getRepository(Product);
      const txCommitRepo = manager.getRepository(ProductCommitment);
      const txCertRepo = manager.getRepository(ProductCertification);

      const product = await lockByIdOrFail(
        manager,
        Product,
        productId,
        () => makeError('Sản phẩm không tồn tại', 404)
      );

      if (!product.isActive) {
        throw makeError('Sản phẩm không tồn tại', 404);
      }

      if (product.createdBy !== userId) {
        throw makeError('Bạn không có quyền chỉnh sửa sản phẩm này', 403);
      }

      // Kiểm tra trong CÙNG transaction sau khi Product đã bị khóa, tránh
      // xóa/chèn commitments/certifications rồi mới phát hiện hợp đồng thay đổi trạng thái.
      await assertNoLockedContract(productId, manager);

      const effectiveMin = dto.priceMin !== undefined ? dto.priceMin : product.priceMin;
      const effectiveMax = dto.priceMax !== undefined ? dto.priceMax : product.priceMax;
      if (effectiveMin != null && effectiveMax != null && Number(effectiveMin) > Number(effectiveMax)) {
        throw makeError('Giá tối thiểu không được lớn hơn giá tối đa');
      }

      if (
        dto.totalQuantity !== undefined &&
        dto.totalQuantity !== null &&
        (!Number.isFinite(Number(dto.totalQuantity)) || Number(dto.totalQuantity) < 0)
      ) {
        throw makeError('Tổng sản lượng không hợp lệ');
      }

      const updatePayload: Record<string, any> = {};
      for (const field of UPDATABLE_FIELDS) {
        if ((dto as any)[field] !== undefined) {
          updatePayload[field] = (dto as any)[field];
        }
      }

      if (dto.imagePaths) {
        updatePayload.image  = dto.imagePaths[0] || null;
        updatePayload.images = dto.imagePaths.length > 0 ? JSON.stringify(dto.imagePaths) : null;
      }

      if (dto.plantDate !== undefined) {
        updatePayload.plantDate = dto.plantDate ? new Date(dto.plantDate) : null;
      }

      if (dto.expectedDate !== undefined) {
        updatePayload.expectedDate = dto.expectedDate ? new Date(dto.expectedDate) : null;
      }

      // Khi chưa có hợp đồng khóa sản phẩm, remaining phải đi cùng totalQuantity.
      // FE hiện chỉ gửi totalQuantity; nếu không đồng bộ, edit 1.000 -> 1.500 kg
      // sẽ để remaining cũ 1.000 kg và giao diện/contract dùng số liệu sai.
      if (dto.totalQuantity !== undefined) {
        updatePayload.remaining = dto.totalQuantity;
      }

      if (Object.keys(updatePayload).length > 0) {
        await txProductRepo.update({ id: productId }, updatePayload);
      }

      if (dto.commitments !== undefined) {
        await txCommitRepo.delete({ productId });
        const commitEntities = dto.commitments
          .filter(c => c?.trim())
          .map((value, index) =>
            txCommitRepo.create({ productId, value: value.trim(), sortOrder: index })
          );
        if (commitEntities.length > 0) await txCommitRepo.save(commitEntities);
      }

      if (dto.certifications !== undefined) {
        await txCertRepo.delete({ productId });
        const certEntities = dto.certifications
          .filter(c => c?.value?.trim())
          .map((c, index) =>
            txCertRepo.create({ productId, value: c.value.trim(), fileUrl: c.fileUrl, sortOrder: index })
          );
        if (certEntities.length > 0) await txCertRepo.save(certEntities);
      }
    },
    { label: 'product.update' }
  );

  return getById(productId);
};

// ══════════════════════════════════════════
// XÓA SẢN PHẨM (soft delete, chỉ chủ sở hữu)
// ══════════════════════════════════════════
export const remove = async (productId: string, userId: string) => {
  await runLockedTransaction(
    async (manager) => {
      const txProductRepo = manager.getRepository(Product);
      const product = await lockByIdOrFail(
        manager,
        Product,
        productId,
        () => makeError('Sản phẩm không tồn tại', 404)
      );

      if (!product.isActive) {
        throw makeError('Sản phẩm không tồn tại', 404);
      }

      if (product.createdBy !== userId) {
        throw makeError('Bạn không có quyền xóa sản phẩm này', 403);
      }

      await assertNoLockedContract(productId, manager);
      product.isActive = false;
      await txProductRepo.save(product);
    },
    { label: 'product.remove' }
  );
};

// ══════════════════════════════════════════
// LẤY DANH SÁCH REVIEW CỦA SẢN PHẨM
// ══════════════════════════════════════════
export const getReviews = async (productId: string) => {
  return reviewRepo().find({
    where: { productId },
    order: { createdAt: 'DESC' },
  });
};

// ══════════════════════════════════════════
// KIỂM TRA QUYỀN ĐÁNH GIÁ (enterprise đã nhận hàng, chưa từng đánh giá)
// ══════════════════════════════════════════
export const getReviewEligibility = async (
  productId: string,
  reviewerId: string,
  reviewerRole: string
) => {
  if (reviewerRole !== 'enterprise') {
    return { canReview: false, alreadyReviewed: false, hasPurchased: false };
  }

  const [existing, hasPurchased] = await Promise.all([
    reviewRepo().findOne({ where: { productId, reviewerId } }),
    hasReceivedGoods(productId, reviewerId),
  ]);

  const alreadyReviewed = Boolean(existing);

  return {
    canReview: hasPurchased && !alreadyReviewed,
    alreadyReviewed,
    hasPurchased,
  };
};

// ══════════════════════════════════════════
// THÊM REVIEW (enterprise, mỗi user 1 review/sản phẩm)
// ══════════════════════════════════════════
export const addReview = async (
  productId: string,
  reviewerId: string,
  reviewerName: string,
  reviewerRole: string,
  rating: number,
  text: string
) => {
  if (reviewerRole !== 'enterprise') {
    throw makeError('Chỉ doanh nghiệp mới có thể đánh giá sản phẩm', 403);
  }

  const product = await productRepo().findOne({ where: { id: productId } });
  if (!product || !product.isActive) {
    throw makeError('Sản phẩm không tồn tại', 404);
  }

  if (rating < 1 || rating > 5) {
    throw makeError('Đánh giá phải từ 1 đến 5 sao');
  }

  const existing = await reviewRepo().findOne({ where: { productId, reviewerId } });
  if (existing) {
    throw makeError('Bạn đã đánh giá sản phẩm này rồi', 400);
  }

  if (!(await hasReceivedGoods(productId, reviewerId))) {
    throw makeError(
      'Bạn cần nhận hàng (hoàn tất mốc Kiểm tra chất lượng) ở một hợp đồng với sản phẩm này trước khi đánh giá',
      403
    );
  }

  const review = reviewRepo().create({
    productId,
    reviewerId,
    reviewerName,
    reviewerAvatar: reviewerName.slice(0, 1).toUpperCase(),
    rating,
    text: text?.trim(),
  });
  const savedReview = await reviewRepo().save(review);

  const allReviews = await reviewRepo().find({ where: { productId } });
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await productRepo().update(
    { id: productId },
    {
      rating: Math.round(avg * 10) / 10,
      reviewCount: allReviews.length,
    }
  );

  return savedReview;
};