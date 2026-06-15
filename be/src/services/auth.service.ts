import crypto from 'crypto';
import jwt, {Secret, SignOptions} from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';

const repo = () => AppDataSource.getRepository(User);

// ── Helpers ──
const signTokens = (id: string, role: string) => {
  const accessToken = jwt.sign(
    { id, role },
    process.env.JWT_SECRET as Secret,
    { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] }
  );
  const refreshToken = jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET as Secret,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn']}
  );
  return { accessToken, refreshToken };
};

const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ── Lấy user kèm password (select: false) ──
const findUserWithPassword = (where: Partial<User>) =>
  repo()
    .createQueryBuilder('user')
    .addSelect([
      'user.password',
      'user.refreshToken',
      'user.loginAttempts',
      'user.lockUntil',
      'user.passwordChangedAt',
      'user.passwordResetToken',
      'user.passwordResetExpires',
    ])
    .where(where)
    .getOne();

// ══════════════════════════════════════════
// ĐĂNG KÝ
// ══════════════════════════════════════════
export interface RegisterDto {
  email:     string;
  password:  string;
  role:      'farmer' | 'enterprise';
  firstName: string;
  lastName:  string;
  phone?:    string;
  province?: string;
  district?: string;
  ward?:     string;
}

export const register = async (dto: RegisterDto) => {
  const r = repo();

  // Kiểm tra email trùng
  const exists = await r.findOne({
    where: { email: dto.email.toLowerCase().trim() },
  });
  if (exists) throw makeError('Email đã được sử dụng', 400);

  // Tạo entity + hash password
  const user = r.create({
    email:     dto.email.toLowerCase().trim(),
    password:  dto.password,
    role:      dto.role,
    firstName: dto.firstName.trim(),
    lastName:  dto.lastName.trim(),
    phone:     dto.phone?.trim(),
    province:  dto.province,
    district:  dto.district,
    ward:      dto.ward,
  });

  await user.hashPassword();
  await r.save(user);

  // Trả về user không kèm password
  return r.findOne({ where: { id: user.id } });
};

// ══════════════════════════════════════════
// ĐĂNG NHẬP
// ══════════════════════════════════════════
export const login = async (emailOrPhone: string, password: string) => {
  const r = repo();

  // Tìm bằng email hoặc SĐT
  const user = await r
  .createQueryBuilder('user')
  .addSelect([
    'user.password',
    'user.refreshToken',
    //'user.loginAttempts',  // ← đã có chưa?
    //'user.lockUntil',
  ])
  .where('user.email = :email OR user.phone = :phone', {
    email: emailOrPhone.trim(),
    phone: emailOrPhone.trim(),
  })
  .getOne();
 

  if (!user) throw makeError('Email/SĐT hoặc mật khẩu không đúng', 401);
  

if (user.isLocked()) {
  const minutes = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 60000);
  throw makeError(`Tài khoản bị khóa. Thử lại sau ${minutes} phút`, 423);
}

  // Kiểm tra tài khoản active
  if (!user.isActive) throw makeError('Tài khoản đã bị vô hiệu hóa', 401);

  // So sánh password
  const isMatch = await user.comparePassword(password);
 if (!isMatch) {
  // Lấy loginAttempts hiện tại từ DB
  const result = await AppDataSource.query(
    `SELECT LoginAttempts FROM Users WHERE UserId = '${user.id}'`
  );
  const currentAttempts = parseInt(result[0]?.LoginAttempts || 0, 10);
  const newAttempts = currentAttempts + 1;

  await AppDataSource.query(
    `UPDATE Users SET LoginAttempts = ${newAttempts} WHERE UserId = '${user.id}'`
  );

  if (newAttempts >= 5) {
    await AppDataSource.query(
      `UPDATE Users SET LockUntil = DATEADD(MINUTE, 15, GETUTCDATE()) WHERE UserId = '${user.id}'`
    );
  }

  throw makeError('Email/SĐT hoặc mật khẩu không đúng', 401);

}


  // Đăng nhập thành công
  user.resetLoginAttempts();
  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await r.save(user);

  // Trả về user sạch
  const safeUser = await r.findOne({ where: { id: user.id } });
  return { user: safeUser, accessToken, refreshToken };
};

// ══════════════════════════════════════════
// ĐĂNG XUẤT
// ══════════════════════════════════════════
export const logout = async (userId: string) => {
  await repo().update({ id: userId }, { refreshToken: undefined });
};

// ══════════════════════════════════════════
// REFRESH TOKEN
// ══════════════════════════════════════════
export const refreshAccessToken = async (token: string) => {
  if (!token) throw makeError('Refresh token là bắt buộc', 401);

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  } catch {
    throw makeError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
  }

  // Lấy user + so khớp refreshToken trong DB
  const user = await repo()
    .createQueryBuilder('user')
    .addSelect('user.refreshToken')
    .where('user.id = :id', { id: decoded.id })
    .getOne();

  if (!user || user.refreshToken !== token) {
    throw makeError('Refresh token không hợp lệ', 401);
  }

  // Cấp token mới (rotation)
  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await repo().save(user);

  return { accessToken, refreshToken };
};

// ══════════════════════════════════════════
// QUÊN MẬT KHẨU
// ══════════════════════════════════════════
export const forgotPassword = async (email: string) => {
  const user = await repo().findOne({
    where: { email: email.toLowerCase().trim() },
  });

  // Không tiết lộ user có tồn tại hay không
  if (!user) return null;

  // Tạo reset token
  const rawToken = user.createPasswordResetToken();
  await repo().save(user);

  return { user, rawToken };
};

// ══════════════════════════════════════════
// ĐẶT LẠI MẬT KHẨU
// ══════════════════════════════════════════
export const resetPassword = async (token: string, newPassword: string) => {
  // Hash token để so sánh với DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Tìm user có token còn hạn
  const user = await repo()
    .createQueryBuilder('user')
    .addSelect([
      'user.passwordResetToken',
      'user.passwordResetExpires',
      'user.password',
    ])
    .where('user.passwordResetToken = :token', { token: hashedToken })
    .getOne();

  if (!user) throw makeError('Token không hợp lệ', 400);
  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw makeError('Token đã hết hạn. Vui lòng yêu cầu lại', 400);
  }

  // Cập nhật mật khẩu mới
  user.password            = newPassword;
  user.passwordResetToken  = undefined!;
  user.passwordResetExpires = undefined!;
  user.passwordChangedAt   = new Date(Date.now() - 1000);

  await user.hashPassword();
  await repo().save(user);

  return user;
};

// ══════════════════════════════════════════
// LẤY THÔNG TIN USER HIỆN TẠI
// ══════════════════════════════════════════
export const getMe = async (userId: string) => {
  return repo().findOne({ where: { id: userId } });
};

// ══════════════════════════════════════════
// CẬP NHẬT MẬT KHẨU (đã đăng nhập)
// ══════════════════════════════════════════
export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await repo()
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.id = :id', { id: userId })
    .getOne();

  if (!user) throw makeError('Không tìm thấy người dùng', 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw makeError('Mật khẩu hiện tại không đúng', 401);

  user.password          = newPassword;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  await user.hashPassword();

  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await repo().save(user);

  return { accessToken, refreshToken };
};