import { Response } from 'express';
import * as productService from '../services/product.service';
import { AuthRequest } from '../types';

// ══════════════════════════════════════════
// TẠO SẢN PHẨM MỚI (form 4 bước)
// POST /api/v1/products
// ══════════════════════════════════════════
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // ── Lấy file đã upload (multer lưu vào req.files) ──
    const files = req.files as {
      images?: Express.Multer.File[];
      certifications?: Express.Multer.File[];
    } | undefined;

    const imagePaths = (files?.images || []).map(
      f => `/uploads/products/${f.filename}`
    );

    const certFiles = files?.certifications || [];

    // ── Parse dữ liệu text gửi kèm (multipart/form-data nên các field khác đều là string) ──
    const body = req.body;

    // commitments gửi dạng JSON string từ FE: '["Cam kết 1","Cam kết 2"]'
    let commitments: string[] = [];
    if (body.commitments) {
      try {
        commitments = JSON.parse(body.commitments);
      } catch {
        commitments = [];
      }
    }

    // certifications (tên) gửi dạng JSON string: '["VietGAP","GlobalGAP"]'
    // ghép với file tương ứng theo thứ tự upload (nếu có)
    let certNames: string[] = [];
    if (body.certificationNames) {
      try {
        certNames = JSON.parse(body.certificationNames);
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

    const product = await productService.createProduct(userId, {
      // Bước 1
      name:     body.name,
      category: body.category,
      region:   body.region,
      type:     body.type,
      location: body.location,
      farm:     body.farm,

      // Bước 2
      priceMin:      body.priceMin      ? Number(body.priceMin)      : undefined,
      priceMax:      body.priceMax      ? Number(body.priceMax)      : undefined,
      unit:          body.unit,
      totalQuantity: body.totalQuantity ? Number(body.totalQuantity) : undefined,
      expectedDate:  body.expectedDate,
      description:   body.description,
      nutritionInfo: body.nutritionInfo,
      note:          body.note,
      badge:         body.badge,
      commitments,

      // Bước 3
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