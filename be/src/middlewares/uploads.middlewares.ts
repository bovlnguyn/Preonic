import multer from 'multer';
import { Request } from 'express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// ── Cấu hình lưu file lên Cloudinary (thay vì đĩa cục bộ) ──
// Ảnh upload từ máy dev nào cũng lên chung 1 nơi, không cần commit
// file nhị phân vào git để đồng bộ giữa các thành viên.
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: 'preonic/products',
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
  }),
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

// ── Cấu hình lưu ảnh đại diện ──
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'preonic/avatars',
    resource_type: 'image',
  }),
});

const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const avatarFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (AVATAR_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh JPG hoặc PNG'));
  }
};

const disputeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: 'preonic/disputes',
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
  }),
});

export const uploadDisputeFiles = multer({
  storage: disputeStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields([
  { name: 'evidences', maxCount: 10 },
  { name: 'evidence', maxCount: 10 },
]);

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('avatar');

export default uploadProductFiles;