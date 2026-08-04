import { v2 as cloudinary } from 'cloudinary';
import { createLogger } from '../utils/logger';

const log = createLogger('Cloudinary');

const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length) {
  log.warn(`Thiếu biến môi trường Cloudinary: ${missing.join(', ')} — upload file sẽ lỗi.`);
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  log.info('Cloudinary đã cấu hình xong');
}

export default cloudinary;
