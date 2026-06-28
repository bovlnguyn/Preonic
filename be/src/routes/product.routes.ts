import { Router, RequestHandler } from 'express';
import { createProduct } from '../controller/product.controller';
import { protect } from '../middlewares/auth.middlewares';
import { uploadProductFiles } from '../middlewares/uploads.middlewares';

const router = Router();

// ── Đăng bán sản phẩm mới (form 4 bước, gửi 1 request multipart/form-data) ──
router.post(
  '/',
  protect as RequestHandler,
  uploadProductFiles,
  createProduct as RequestHandler
);

export default router;