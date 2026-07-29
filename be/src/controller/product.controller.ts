import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { AuthRequest } from '../types';

// ── Helper parse multipart files thành imagePaths / certifications ──
const parseUploadedFiles = (req: AuthRequest) => {
  const files = req.files as {
    images?: Express.Multer.File[];
    certifications?: Express.Multer.File[];
  } | undefined;

  const imagePaths = (files?.images || []).map(
    f => `/uploads/products/${f.filename}`
  );

  const certFiles = files?.certifications || [];

  let certNames: string[] = [];
  if (req.body.certificationNames) {
    try {
      certNames = JSON.parse(req.body.certificationNames);
    } catch {
      certNames = [];
    }
  }

  const certifications = certNames.map((value, index) => ({
    value,
    fileUrl: certFiles[index]
      ? `/uploads/products/${certFiles[index].filename}`
      : undefined,
  }));

  let commitments: string[] = [];
  if (req.body.commitments) {
    try {
      commitments = JSON.parse(req.body.commitments);
    } catch {
      commitments = [];
    }
  }

  return { imagePaths, certifications, commitments };
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy danh sách sản phẩm thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy chi tiết sản phẩm thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy sản phẩm tương tự thất bại',
    });
  }
};

// ══════════════════════════════════════════
// GET /products/region/:region — sản phẩm theo vùng miền
// ══════════════════════════════════════════
export const getByRegion = async (req: Request, res: Response) => {
  try {
    const products = await productService.getByRegion(req.params.region);
    res.status(200).json({ success: true, data: products });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy sản phẩm theo vùng miền thất bại',
    });
  }
};

// ══════════════════════════════════════════
// GET /products/my-products — sản phẩm của farmer đang đăng nhập
// ══════════════════════════════════════════
export const getMyProducts = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getMyProducts userId:', req.user?.id);
    const products = await productService.getByUser(req.user!.id);
    res.status(200).json({ success: true, data: products });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy sản phẩm của bạn thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Đăng bán sản phẩm thất bại',
    });
  }
};

// ══════════════════════════════════════════
// PUT /products/:id — cập nhật sản phẩm (chỉ chủ sở hữu)
// ══════════════════════════════════════════
export const update = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { imagePaths, certifications, commitments } = parseUploadedFiles(req);
    const body = req.body;

    const updateDto: Record<string, any> = {};

    if (body.name)          updateDto.name = body.name;
    if (body.category)      updateDto.category = body.category;
    if (body.region)        updateDto.region = body.region;
    if (body.type)          updateDto.type = body.type;
    if (body.location)      updateDto.location = body.location;
    if (body.farm)          updateDto.farm = body.farm;
    if (body.variety)       updateDto.variety = body.variety;
    if (body.area)          updateDto.area = Number(body.area);
    if (body.priceMin)      updateDto.priceMin = Number(body.priceMin);
    if (body.priceMax)      updateDto.priceMax = Number(body.priceMax);
    if (body.unit)          updateDto.unit = body.unit;
    if (body.priceUnit)     updateDto.priceUnit = body.priceUnit;
    if (body.totalQuantity) updateDto.totalQuantity = Number(body.totalQuantity);
    if (body.plantDate)     updateDto.plantDate = body.plantDate;
    if (body.expectedDate)  updateDto.expectedDate = body.expectedDate;
    if (body.description)   updateDto.description = body.description;
    if (body.nutritionInfo) updateDto.nutritionInfo = body.nutritionInfo;
    if (body.note)          updateDto.note = body.note;
    if (body.badge)         updateDto.badge = body.badge;

    if (imagePaths.length > 0)      updateDto.imagePaths = imagePaths;
    if (commitments.length > 0)     updateDto.commitments = commitments;
    if (certifications.length > 0)  updateDto.certifications = certifications;

    const product = await productService.update(req.params.id, userId, updateDto);

    res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: { product },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Cập nhật sản phẩm thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Xóa sản phẩm thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy đánh giá thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Đánh giá sản phẩm thất bại',
    });
  }
};