/**
 * Script tạo tài khoản admin một lần.
 * Chạy: npx ts-node src/seed/createAdmin.ts
 */
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import CliDataSource from '../config/data-source';
import { User } from '../models/User.entity';

const AppDataSource = CliDataSource;

const ADMIN_EMAIL    = 'admin123@gmail.com';
const ADMIN_PASSWORD = 'quyet123@';
const ADMIN_FIRST    = 'Admin';
const ADMIN_LAST     = 'PreOnic';

async function main() {
  console.log('🔌  Đang kết nối SQL Server...');

  // Khởi tạo DataSource trực tiếp (không qua connectDB retry loop)
  await AppDataSource.initialize();
  console.log('✅  Kết nối thành công');

  const repo = AppDataSource.getRepository(User);

  // Kiểm tra tồn tại
  const existing = await repo.findOne({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`⚠️  Admin "${ADMIN_EMAIL}" đã tồn tại. Không tạo mới.`);
    } else {
      existing.role       = 'admin';
      existing.isActive   = true;
      existing.isVerified = true;
      await repo.save(existing);
      console.log(`✅  Đã nâng cấp "${ADMIN_EMAIL}" lên role admin.`);
    }
    await AppDataSource.destroy();
    return;
  }

  // Tạo mới
  const admin = repo.create({
    email:      ADMIN_EMAIL,
    password:   ADMIN_PASSWORD,
    role:       'admin',
    firstName:  ADMIN_FIRST,
    lastName:   ADMIN_LAST,
    isActive:   true,
    isVerified: true,
  });

  await admin.hashPassword();
  await repo.save(admin);

  console.log('');
  console.log('✅  Tài khoản admin đã được tạo thành công!');
  console.log('    Email   :', ADMIN_EMAIL);
  console.log('    Password:', ADMIN_PASSWORD);
  console.log('    Role    : admin');
  console.log('');

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌  Lỗi:', err.message);
  process.exit(1);
});
