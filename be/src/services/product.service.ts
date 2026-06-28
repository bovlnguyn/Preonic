import { AppDataSource } from '../config/database';
import { Product } from '../models/Product.entity';
import { ProductCertification } from '../models/ProductCertification.entity';
import { ProductCommitment } from '../models/ProductCommitment.entity';
import { User } from '../models/User.entity';

const productRepo  = () => AppDataSource.getRepository(Product);
const certRepo      = () => AppDataSource.getRepository(ProductCertification);
const commitRepo    = () => AppDataSource.getRepository(ProductCommitment);
const userRepo      = () => AppDataSource.getRepository(User);

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ══════════════════════════════════════════
// DTO — dữ liệu nhận từ form 4 bước
// ══════════════════════════════════════════
export interface CreateProductDto {
  // Bước 1 — Thông tin cơ bản
  name:     string;
  category: 'fruit' | 'vegetable' | 'rice' | 'coffee' | 'tea' | 'spice' | 'grain' | 'other';
  region:   'north' | 'central' | 'south';
  type:     'fresh' | 'dried' | 'processed';
  location?: string;
  farm?:     string;

  // Bước 2 — Chi tiết
  priceMin?:      number;
  priceMax?:      number;
  unit?:          string;
  totalQuantity?: number;
  expectedDate?:  string; // ISO date string
  description?:   string;
  nutritionInfo?: string;
  note?:          string;
  badge?:         string;
  commitments?:   string[]; // ["Không thuốc trừ sâu", "Thu hoạch đúng vụ", ...]

  // Bước 3 — Hình ảnh / Chứng chỉ
  // (đường dẫn file đã upload, xử lý ở controller trước khi gọi service)
  imagePaths?: string[];           // toàn bộ ảnh upload
  certifications?: {
    value: string;     // tên chứng chỉ, ví dụ "VietGAP"
    fileUrl?: string;  // đường dẫn file minh chứng (ảnh/PDF) nếu có
  }[];

  // Bước 4 — Xác nhận (không có field riêng, chỉ là bước review ở FE)
}

// ══════════════════════════════════════════
// TẠO SẢN PHẨM MỚI
// ══════════════════════════════════════════
export const createProduct = async (userId: string, dto: CreateProductDto) => {
  // ── Validate cơ bản ──
  if (!dto.name?.trim())     throw makeError('Tên sản phẩm là bắt buộc');
  if (!dto.category)         throw makeError('Vui lòng chọn loại nông sản');
  if (!dto.region)           throw makeError('Vui lòng chọn vùng miền');
  if (!dto.type)             throw makeError('Vui lòng chọn hình thức (tươi/khô/đã sơ chế)');

  if (dto.priceMin != null && dto.priceMax != null && dto.priceMin > dto.priceMax) {
    throw makeError('Giá tối thiểu không được lớn hơn giá tối đa');
  }

  // ── Lấy thông tin farmer để snapshot vào Product (seller info) ──
  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) throw makeError('Không tìm thấy người dùng', 404);
  if (user.role !== 'farmer') throw makeError('Chỉ Nông dân mới có thể đăng bán sản phẩm', 403);

  // ── Ảnh đại diện = ảnh đầu tiên trong danh sách upload ──
  const imagePaths = dto.imagePaths || [];
  const mainImage  = imagePaths[0] || null;

  // ── Tạo Product ──
  const product = productRepo().create({
    name:          dto.name.trim(),
    category:      dto.category,
    region:        dto.region,
    type:          dto.type,
    location:      dto.location?.trim(),
    farm:          dto.farm?.trim(),

    priceMin:      dto.priceMin ?? null,
    priceMax:      dto.priceMax ?? null,
    unit:          dto.unit?.trim(),
    totalQuantity: dto.totalQuantity ?? null,
    remaining:     dto.totalQuantity ?? null, // ban đầu remaining = totalQuantity
    progress:      0,
    expectedDate:  dto.expectedDate ? new Date(dto.expectedDate) : undefined,
    description:   dto.description?.trim(),
    nutritionInfo: dto.nutritionInfo?.trim(),
    note:          dto.note?.trim(),
    badge:         dto.badge?.trim(),

    image:  mainImage,
    images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : null,

    // Seller snapshot
    sellerUserId:         user.id,
    sellerName:           user.fullName,
    sellerAvatar:         user.avatar,
    sellerRating:         user.reputationScore,
    sellerTotalContracts: 0,

    createdBy: user.id,
    isActive:  true,
  }as Partial<Product>);

  const savedProduct = await productRepo().save(product);

  // ── Lưu Commitments (cam kết của farmer) ──
  if (dto.commitments && dto.commitments.length > 0) {
    const commitEntities = dto.commitments
      .filter(c => c?.trim())
      .map((value, index) =>
        commitRepo().create({
          productId: savedProduct.id,
          value:     value.trim(),
          sortOrder: index,
        })
      );
    await commitRepo().save(commitEntities);
  }

  // ── Lưu Certifications (chứng chỉ kèm file) ──
  if (dto.certifications && dto.certifications.length > 0) {
    const certEntities = dto.certifications
      .filter(c => c?.value?.trim())
      .map((c, index) =>
        certRepo().create({
          productId: savedProduct.id,
          value:     c.value.trim(),
          fileUrl:   c.fileUrl,
          sortOrder: index,
        })
      );
    await certRepo().save(certEntities);
  }

  // ── Trả về product đầy đủ kèm relations ──
  const result = await productRepo().findOne({
    where: { id: savedProduct.id },
    relations: ['certifications', 'commitments'],
  });

  return result;
};