import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { AuthRequest } from '../types';
import { sendError } from '../utils/controller.util';
import { cleanupCloudinaryUrls, cleanupUploadedFiles } from '../middlewares/uploads.middlewares';


const parseStoredImageUrls = (product: any): string[] => {
  if (!product) return [];
  const urls: string[] = [];
  if (product.image) urls.push(String(product.image));
  if (product.images) {
    try {
      const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      if (Array.isArray(parsed)) urls.push(...parsed.map(String));
    } catch {
      // Legacy data có thể chỉ chứa một URL thay vì JSON.
      if (typeof product.images === 'string' && /^https?:\/\//i.test(product.images)) {
        urls.push(product.images);
      }
    }
  }
  return [...new Set(urls.filter(Boolean))];
};

// ── Helper parse multipart files thành imagePaths / certifications ──
const parseUploadedFiles = (req: AuthRequest) => {
  const files = req.files as {
    images?: Express.Multer.File[];
    certifications?: Express.Multer.File[];
  } | undefined;

  const imagePaths = (files?.images || []).map((file) => file.path);
  const certFiles = files?.certifications || [];

  let existingCertifications: { value: string; fileUrl?: string }[] = [];
  if (Object.prototype.hasOwnProperty.call(req.body, 'existingCertifications')) {
    try {
      const parsed = JSON.parse(req.body.existingCertifications || '[]');
      if (Array.isArray(parsed)) {
        existingCertifications = parsed
          .map((certification) => ({
            value: String(certification?.value || '').trim(),
            fileUrl: certification?.fileUrl ? String(certification.fileUrl) : undefined,
          }))
          .filter((certification) => certification.value);
      }
    } catch {
      existingCertifications = [];
    }
  }

  let certNames: string[] = [];
  if (req.body.certificationNames) {
    try {
      const parsed = JSON.parse(req.body.certificationNames);
      certNames = Array.isArray(parsed)
        ? parsed.map((value) => String(value || '').trim())
        : [];
    } catch {
      certNames = [];
    }
  }

  // File mới và tên mới phải cùng thứ tự. Nếu thiếu tên, dùng originalname làm fallback.
  const uploadedCertifications = certFiles
    .map((file, index) => ({
      value: certNames[index] || file.originalname || `Chứng chỉ ${index + 1}`,
      fileUrl: file.path,
    }))
    .filter((certification) => certification.value?.trim());

  const certifications = [...existingCertifications, ...uploadedCertifications];

  const hasCertificationPayload =
    Object.prototype.hasOwnProperty.call(req.body, 'existingCertifications') ||
    Object.prototype.hasOwnProperty.call(req.body, 'certificationNames') ||
    certFiles.length > 0;

  let commitments: string[] = [];
  if (req.body.commitments) {
    try {
      commitments = JSON.parse(req.body.commitments);
    } catch {
      commitments = [];
    }
  }

  return {
    imagePaths,
    certifications,
    commitments,
    hasCertificationPayload,
  };
};

// ══════════════════════════════════════════
// GET /products — danh sách (có filter + phân trang)
// ══════════════════════════════════════════
export const getAll = async (req: Request, res: Response) => {
  try {
    const { category, region, type, search, sort } = req.query;
    const page     = req.query.page     ? Number(req.query.page)     : undefined;
    const limit    = req.query.limit    ? Number(req.query.limit)    : undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

    const result = await productService.getAll({
      category: category as string,
      region:   region   as string,
      type:     type     as string,
      search:   search   as string,
      sort:     sort     as string,
      minPrice,
      maxPrice,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: {
        page:       result.page,
        total:      result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách sản phẩm thất bại');
  }
};

// ══════════════════════════════════════════
// GET /products/:id — chi tiết sản phẩm
// ══════════════════════════════════════════
export const getById = async (req: Request, res: Response) => {
  try {
    const product = await productService.getById(req.params.id);
    res.status(200).json({ success: true, data: { product } });
  } catch (err: any) {
    sendError(res, err, 'Lấy chi tiết sản phẩm thất bại');
  }
};

// ══════════════════════════════════════════
// GET /products/:id/similar — sản phẩm tương tự
// ══════════════════════════════════════════
export const getSimilar = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 4;
    const products = await productService.getSimilar(req.params.id, limit);
    res.status(200).json({ success: true, data: products });
  } catch (err: any) {
    sendError(res, err, 'Lấy sản phẩm tương tự thất bại');
  }
};

// ══════════════════════════════════════════
// GET /products/region/:region — sản phẩm theo vùng miền
// ══════════════════════════════════════════
export const getByRegion = async (req: Request, res: Response) => {
  try {
    const result = await productService.getByRegion(
      req.params.region,
      req.query.page ? Number(req.query.page) : 1,
      req.query.limit ? Number(req.query.limit) : 24
    );
    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy sản phẩm theo vùng miền thất bại');
  }
};

// ══════════════════════════════════════════
// GET /products/my-products — sản phẩm của farmer đang đăng nhập
// ══════════════════════════════════════════
export const getMyProducts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await productService.getByUser(req.user!.id, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      includeSummary: req.query.includeSummary === 'true',
    });
    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
      ...(result.summary ? { summary: result.summary } : {}),
      ...(result.categories ? { categories: result.categories } : {}),
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy sản phẩm của bạn thất bại');
  }
};

// ══════════════════════════════════════════
// POST /products — tạo sản phẩm mới (form 4 bước)
// ══════════════════════════════════════════
export const create = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { imagePaths, certifications, commitments } = parseUploadedFiles(req);
    const body = req.body;

    const product = await productService.create(userId, {
      name:     body.name,
      category: body.category,
      region:   body.region,
      type:     body.type,
      variety:  body.variety,
      area:     body.area ? Number(body.area) : undefined,

      priceMin:      body.priceMin      ? Number(body.priceMin)      : undefined,
      priceMax:      body.priceMax      ? Number(body.priceMax)      : undefined,
      unit:          body.unit,
      priceUnit:     body.priceUnit,
      totalQuantity: body.totalQuantity ? Number(body.totalQuantity) : undefined,
      coverageRate:  body.coverageRate !== undefined && body.coverageRate !== '' ? Number(body.coverageRate) : undefined,
      plantDate:     body.plantDate,
      expectedDate:  body.expectedDate,
      description:   body.description,
      nutritionInfo: body.nutritionInfo,
      note:          body.note,
      badge:         body.badge,
      commitments,

      imagePaths,
      certifications,
    });

    res.status(201).json({
      success: true,
      message: 'Đăng bán sản phẩm thành công! Sản phẩm đang chờ tiếp cận doanh nghiệp thu mua.',
      data: { product },
    });
  } catch (err: any) {
    await cleanupUploadedFiles(req);
    sendError(res, err, 'Đăng bán sản phẩm thất bại');
  }
};

// ══════════════════════════════════════════
// PUT /products/:id — cập nhật sản phẩm (chỉ chủ sở hữu)
// ══════════════════════════════════════════
export const update = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { imagePaths, certifications, commitments, hasCertificationPayload } = parseUploadedFiles(req);
    const body = req.body;

    // Nếu request thay asset, giữ snapshot URL cũ để chỉ dọn Cloudinary SAU KHI DB update thành công.
    // Không xóa trước transaction để tránh DB rollback nhưng file cũ đã biến mất.
    const previousProduct = imagePaths.length > 0 || hasCertificationPayload
      ? await productService.getById(req.params.id)
      : null;

    const updateDto: Record<string, any> = {};

    if (body.name !== undefined)          updateDto.name = body.name;
    if (body.category !== undefined)      updateDto.category = body.category;
    if (body.region !== undefined)        updateDto.region = body.region;
    if (body.type !== undefined)          updateDto.type = body.type;
    if (body.variety !== undefined)       updateDto.variety = body.variety;
    if (body.area !== undefined)          updateDto.area = body.area === '' ? null : Number(body.area);
    if (body.priceMin !== undefined)      updateDto.priceMin = body.priceMin === '' ? null : Number(body.priceMin);
    if (body.priceMax !== undefined)      updateDto.priceMax = body.priceMax === '' ? null : Number(body.priceMax);
    if (body.unit !== undefined)          updateDto.unit = body.unit;
    if (body.priceUnit !== undefined)     updateDto.priceUnit = body.priceUnit;
    if (body.totalQuantity !== undefined) updateDto.totalQuantity = body.totalQuantity === '' ? null : Number(body.totalQuantity);
    if (body.coverageRate !== undefined)  updateDto.coverageRate = Number(body.coverageRate);
    if (body.plantDate !== undefined)     updateDto.plantDate = body.plantDate === '' ? null : body.plantDate;
    if (body.expectedDate !== undefined)  updateDto.expectedDate = body.expectedDate === '' ? null : body.expectedDate;
    if (body.description !== undefined)   updateDto.description = body.description;
    if (body.nutritionInfo !== undefined) updateDto.nutritionInfo = body.nutritionInfo;
    if (body.note !== undefined)          updateDto.note = body.note;
    if (body.badge !== undefined)         updateDto.badge = body.badge;

    if (imagePaths.length > 0)      updateDto.imagePaths = imagePaths;
    if (commitments.length > 0)     updateDto.commitments = commitments;
    if (hasCertificationPayload)          updateDto.certifications = certifications;

    const product = await productService.update(req.params.id, userId, updateDto);

    if (previousProduct) {
      const staleUrls: string[] = [];
      if (imagePaths.length > 0) staleUrls.push(...parseStoredImageUrls(previousProduct));

      if (hasCertificationPayload) {
        const kept = new Set(certifications.map((item: any) => item?.fileUrl).filter(Boolean));
        const previousCertUrls = (previousProduct.certifications || [])
          .map((item: any) => item?.fileUrl)
          .filter(Boolean);
        staleUrls.push(...previousCertUrls.filter((url: string) => !kept.has(url)));
      }

      // Cleanup không được làm hỏng response nghiệp vụ nếu provider đang lỗi.
      void cleanupCloudinaryUrls(staleUrls);
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: { product },
    });
  } catch (err: any) {
    await cleanupUploadedFiles(req);
    sendError(res, err, 'Cập nhật sản phẩm thất bại');
  }
};

// ══════════════════════════════════════════
// DELETE /products/:id — ẩn/xóa sản phẩm (soft delete, chỉ chủ sở hữu)
// ══════════════════════════════════════════
export const remove = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await productService.remove(req.params.id, userId);

    res.status(200).json({
      success: true,
      message: 'Đã ẩn sản phẩm khỏi danh sách công khai',
    });
  } catch (err: any) {
    sendError(res, err, 'Xóa sản phẩm thất bại');
  }
};

// ══════════════════════════════════════════
// GET /products/:id/reviews — danh sách đánh giá
// ══════════════════════════════════════════
export const getReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await productService.getReviews(req.params.id);
    res.status(200).json({ success: true, data: reviews });
  } catch (err: any) {
    sendError(res, err, 'Lấy đánh giá thất bại');
  }
};

// ══════════════════════════════════════════
// GET /products/:id/reviews/eligibility — enterprise hiện tại có được đánh giá không
// ══════════════════════════════════════════
export const getReviewEligibility = async (req: AuthRequest, res: Response) => {
  try {
    const eligibility = await productService.getReviewEligibility(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.status(200).json({ success: true, data: eligibility });
  } catch (err: any) {
    sendError(res, err, 'Kiểm tra quyền đánh giá thất bại');
  }
};

// ══════════════════════════════════════════
// POST /products/:id/reviews — thêm đánh giá (enterprise)
// ══════════════════════════════════════════
export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    const reviewerId   = req.user!.id;
    const reviewerName = req.user!.fullName || 'Doanh nghiệp';
    const reviewerRole = req.user!.role;
    const { rating, text } = req.body;

    const review = await productService.addReview(
      req.params.id,
      reviewerId,
      reviewerName,
      reviewerRole,
      Number(rating),
      text
    );

    res.status(201).json({
      success: true,
      message: 'Đánh giá sản phẩm thành công',
      data: { review },
    });
  } catch (err: any) {
    sendError(res, err, 'Đánh giá sản phẩm thất bại');
  }
};