import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// ── Thư mục lưu file ──
const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Cấu hình lưu file ──
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// ── Giới hạn loại file: JPG, PNG, PDF ──
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file JPG, PNG hoặc PDF'));
  }
};

// ── Giới hạn 5MB/file ──
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadProductFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields([
  { name: 'images', maxCount: 10 },        // nhiều ảnh sản phẩm
  { name: 'certifications', maxCount: 10 }, // nhiều file chứng chỉ (ảnh/PDF)
]);

export default uploadProductFiles;