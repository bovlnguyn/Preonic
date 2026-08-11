/**
 * Script tạo tài khoản admin một lần.
 * Chạy: npx ts-node src/seed/createAdmin.ts
 *
 * Bắt buộc cấu hình ADMIN_SEED_EMAIL và ADMIN_SEED_PASSWORD trong .env.
 * Không hard-code hoặc log mật khẩu admin vào source/terminal.
 */
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import CliDataSource from '../config/data-source';
import { User } from '../models/User.entity';

const AppDataSource = CliDataSource;

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_FIRST = process.env.ADMIN_SEED_FIRST_NAME?.trim() || 'Admin';
const ADMIN_LAST = process.env.ADMIN_SEED_LAST_NAME?.trim() || 'PreOnic';

const validateConfig = () => {
  if (!ADMIN_EMAIL) {
    throw new Error('Thiếu ADMIN_SEED_EMAIL trong .env');
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_SEED_PASSWORD phải có ít nhất 12 ký tự');
  }
};

async function main() {
  validateConfig();
  console.log('Đang kết nối SQL Server...');

  await AppDataSource.initialize();
  console.log('Kết nối thành công');

  const repo = AppDataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email: ADMIN_EMAIL! } });

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`Admin "${ADMIN_EMAIL}" đã tồn tại. Không tạo mới.`);
    } else {
      existing.role = 'admin';
      existing.isActive = true;
      existing.isVerified = true;
      await repo.save(existing);
      console.log(`Đã nâng cấp "${ADMIN_EMAIL}" lên role admin.`);
    }
    await AppDataSource.destroy();
    return;
  }

  const admin = repo.create({
    email: ADMIN_EMAIL!,
    password: ADMIN_PASSWORD!,
    role: 'admin',
    firstName: ADMIN_FIRST,
    lastName: ADMIN_LAST,
    isActive: true,
    isVerified: true,
    authProvider: 'local',
  });

  await admin.hashPassword();
  await repo.save(admin);

  console.log(`Tài khoản admin "${ADMIN_EMAIL}" đã được tạo thành công.`);
  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error('Không thể tạo admin:', err.message);
  if (AppDataSource.isInitialized) await AppDataSource.destroy().catch(() => undefined);
  process.exit(1);
});
