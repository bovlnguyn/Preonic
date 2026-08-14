import multer from 'multer';
import { Request, RequestHandler } from 'express';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { mkdirSync } from 'fs';
import { open, unlink } from 'fs/promises';
import cloudinary from '../config/cloudinary';
import { createLogger } from '../utils/logger';

const log = createLogger('Uploads');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB / file
const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), 'preonic-uploads');
mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

// Dùng file tạm thay vì memoryStorage để một request nhiều ảnh không giữ hàng chục MB
// trong heap Node. File tạm luôn được xóa sau khi upload/validation thất bại.
const tempStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const PRODUCT_FIELDS = [
  { name: 'images', maxCount: 10 },
  { name: 'certifications', maxCount: 10 },
];

const DISPUTE_FIELDS = [
  { name: 'evidences', maxCount: 10 },
  { name: 'evidence', maxCount: 10 },
];

type FileKind = 'jpeg' | 'png' | 'pdf';
type UploadedAsset = { publicId: string; resourceType: 'image' | 'raw'; url: string };

const PRODUCT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const makeUploadError = (message: string, statusCode = 400) => {
  const error: any = new Error(message);
  error.statusCode = statusCode;
  error.code = statusCode >= 500 ? 'UPLOAD_PROVIDER_ERROR' : 'INVALID_UPLOAD';
  return error;
};

const basicFileFilter = (allowed: Set<string>) => (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!allowed.has(String(file.mimetype || '').toLowerCase())) {
    cb(makeUploadError('Loại file không được hỗ trợ'));
    return;
  }
  cb(null, true);
};

/**
 * Kiểm tra magic bytes thay vì chỉ tin Content-Type do client gửi.
 * Không dùng OCR/parse nội dung; chỉ xác nhận signature tối thiểu của JPG/PNG/PDF.
 */
export const detectFileKind = (buffer: Buffer): FileKind | null => {
  if (!buffer || buffer.length < 5) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) return 'png';

  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';

  return null;
};

const expectedKindsForMime = (mime: string): FileKind[] => {
  const normalized = String(mime || '').toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return ['jpeg'];
  if (normalized === 'image/png') return ['png'];
  if (normalized === 'application/pdf') return ['pdf'];
  return [];
};

const extensionMatchesKind = (originalName: string, kind: FileKind) => {
  const ext = path.extname(originalName || '').toLowerCase();
  if (kind === 'jpeg') return ext === '.jpg' || ext === '.jpeg';
  if (kind === 'png') return ext === '.png';
  if (kind === 'pdf') return ext === '.pdf';
  return false;
};

export const validateFileSignature = (
  file: Express.Multer.File,
  options: { avatarOnly?: boolean } = {},
  signatureBuffer?: Buffer
): FileKind => {
  const kind = detectFileKind(signatureBuffer || file.buffer);
  if (!kind) throw makeUploadError('Nội dung file không đúng định dạng JPG, PNG hoặc PDF');

  const expected = expectedKindsForMime(file.mimetype);
  if (!expected.includes(kind)) {
    throw makeUploadError('Phần mở rộng/Content-Type không khớp nội dung thật của file');
  }

  if (options.avatarOnly && kind === 'pdf') {
    throw makeUploadError('Ảnh đại diện chỉ chấp nhận JPG hoặc PNG');
  }

  if (!extensionMatchesKind(file.originalname, kind)) {
    throw makeUploadError('Phần mở rộng file không khớp nội dung thật của file');
  }

  return kind;
};

const readSignatureBytes = async (filePath: string): Promise<Buffer> => {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const removeTempFile = async (filePath?: string) => {
  if (!filePath || !filePath.startsWith(TEMP_UPLOAD_DIR)) return;
  try {
    await unlink(filePath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') log.warn('Không thể xóa file upload tạm', error?.message || error);
  }
};

const uploadFile = async (
  file: Express.Multer.File,
  folder: string,
  options: { avatarOnly?: boolean } = {}
): Promise<UploadedAsset> => {
  const localPath = file.path;
  try {
    const signature = await readSignatureBytes(localPath);
    const kind = validateFileSignature(file, options, signature);
    const resourceType: 'image' | 'raw' = kind === 'pdf' ? 'raw' : 'image';

    const result: any = await cloudinary.uploader.upload(localPath, {
      folder,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    });

    file.path = result.secure_url;
    file.filename = result.public_id;

    return {
      publicId: result.public_id,
      resourceType,
      url: result.secure_url,
    };
  } finally {
    await removeTempFile(localPath);
  }
};

const filesFromRequest = (req: Request): Express.Multer.File[] => {
  if ((req as any).file) return [(req as any).file as Express.Multer.File];
  const files = (req as any).files;
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat() as Express.Multer.File[];
};

const rememberUploadedAssets = (req: Request, assets: UploadedAsset[]) => {
  (req as any).__preonicUploadedAssets = [
    ...((req as any).__preonicUploadedAssets || []),
    ...assets,
  ];
};

const destroyAsset = async (asset: UploadedAsset) => {
  await cloudinary.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType,
    invalidate: true,
  });
};

/** Xóa file vừa upload nếu validation/service sau đó thất bại. */
export const cleanupUploadedFiles = async (req: Request): Promise<void> => {
  const assets = ((req as any).__preonicUploadedAssets || []) as UploadedAsset[];
  if (!assets.length) return;
  (req as any).__preonicUploadedAssets = [];

  const results = await Promise.allSettled(assets.map(destroyAsset));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      log.warn('Không thể dọn file upload thất bại', {
        publicId: assets[index]?.publicId,
        error: result.reason?.message || String(result.reason),
      });
    }
  });
};

/**
 * Xóa asset cũ khi một URL Cloudinary của chính PreOnic không còn được tham chiếu.
 * URL ngoài Cloudinary (vd Google avatar) được bỏ qua.
 */
export const cleanupCloudinaryUrls = async (urls: Array<string | null | undefined>): Promise<void> => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return;

  const unique = [...new Set(urls.filter(Boolean).map(String))];
  const tasks: Promise<any>[] = [];

  for (const rawUrl of unique) {
    try {
      const url = new URL(rawUrl);
      if (url.hostname !== 'res.cloudinary.com') continue;
      const marker = `/${cloudName}/`;
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex < 0) continue;

      // /<cloud>/image/upload/v123/preonic/products/abc.jpg
      const afterCloud = url.pathname.slice(markerIndex + marker.length);
      const parts = afterCloud.split('/').filter(Boolean);
      const resourceType = parts.shift();
      const uploadIndex = parts.indexOf('upload');
      if ((resourceType !== 'image' && resourceType !== 'raw') || uploadIndex < 0) continue;

      const pathParts = parts.slice(uploadIndex + 1);
      if (/^v\d+$/.test(pathParts[0] || '')) pathParts.shift();
      if (!pathParts.length || pathParts[0] !== 'preonic') continue;

      let publicId = decodeURIComponent(pathParts.join('/'));
      if (resourceType === 'image') publicId = publicId.replace(/\.[^.\/]+$/, '');
      if (!publicId) continue;

      tasks.push(cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      }));
    } catch {
      // URL sai/ngoài hệ thống: bỏ qua thay vì làm lỗi nghiệp vụ chính.
    }
  }

  const results = await Promise.allSettled(tasks);
  const rejected = results.filter((r) => r.status === 'rejected');
  if (rejected.length) log.warn(`Không thể dọn ${rejected.length} Cloudinary asset cũ`);
};

const createUploadMiddleware = (
  parser: RequestHandler,
  folder: string,
  options: { avatarOnly?: boolean } = {}
): RequestHandler => (req, res, next) => {
  parser(req, res, async (parseError: any) => {
    if (parseError) {
      await Promise.allSettled(filesFromRequest(req).map((file) => removeTempFile(file.path)));
      const error = parseError instanceof multer.MulterError
        ? makeUploadError(
            parseError.code === 'LIMIT_FILE_SIZE'
              ? 'Mỗi file không được vượt quá 5MB'
              : `Upload không hợp lệ (${parseError.code})`
          )
        : parseError;
      return next(error);
    }

    const files = filesFromRequest(req);
    if (!files.length) return next();

    const uploaded: UploadedAsset[] = [];
    try {
      // Upload tuần tự để nếu một file fail, số asset phải cleanup được giữ chính xác.
      for (const file of files) {
        uploaded.push(await uploadFile(file, folder, options));
      }
      rememberUploadedAssets(req, uploaded);
      return next();
    } catch (error: any) {
      if (uploaded.length) {
        rememberUploadedAssets(req, uploaded);
        await cleanupUploadedFiles(req);
      }
      if (!error?.statusCode) {
        const wrapped = makeUploadError('Không thể lưu file lên dịch vụ lưu trữ', 502);
        wrapped.cause = error;
        return next(wrapped);
      }
      return next(error);
    }
  });
};

const productParser = multer({
  storage: tempStorage,
  fileFilter: basicFileFilter(PRODUCT_MIME_TYPES),
  limits: { fileSize: MAX_FILE_SIZE, files: 20, fields: 60, parts: 80 },
}).fields(PRODUCT_FIELDS);

const disputeParser = multer({
  storage: tempStorage,
  fileFilter: basicFileFilter(PRODUCT_MIME_TYPES),
  limits: { fileSize: MAX_FILE_SIZE, files: 20, fields: 30, parts: 50 },
}).fields(DISPUTE_FIELDS);

const avatarParser = multer({
  storage: tempStorage,
  fileFilter: basicFileFilter(AVATAR_MIME_TYPES),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 30, parts: 31 },
}).single('avatar');

export const uploadProductFiles = createUploadMiddleware(productParser, 'preonic/products');
export const uploadDisputeFiles = createUploadMiddleware(disputeParser, 'preonic/disputes');
export const uploadAvatar = createUploadMiddleware(avatarParser, 'preonic/avatars', { avatarOnly: true });

export default uploadProductFiles;
