import crypto from 'crypto';
import jwt, {Secret, SignOptions} from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';

const repo = () => AppDataSource.getRepository(User);

// ── Helpers ──
// Dùng chung cho login/register và cho route Google OAuth callback (auth.routes.ts)
// -- viec ky JWT thuoc ve service, khong phai route.
export const signAccessToken = (id: string, role: string) =>
  jwt.sign(
    { id, role },
    process.env.JWT_SECRET as Secret,
    { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] }
  );

const signTokens = (id: string, role: string) => {
  const accessToken = signAccessToken(id, role);
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

  const rawToken = user.createEmailVerificationToken();
  await r.save(user);

  const savedUser = await r.findOne({ where: { id: user.id } });
  return { user: savedUser, verifyToken: rawToken };
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
    'user.loginAttempts',  // ← đã có chưa?
    'user.lockUntil',
  ])
  .where('user.email = :email OR user.phone = :phone', {
    email: emailOrPhone.trim(),
    phone: emailOrPhone.trim(),
  })
  .getOne();
 

  if (!user) throw makeError('Email/SĐT hoặc mật khẩu không đúng', 401);

  // ── Fix lockUntil bị array do query OR ──
  const lockUntil = Array.isArray(user.lockUntil) ? user.lockUntil[0] : user.lockUntil;
  const isLocked = lockUntil && new Date(lockUntil) > new Date();

  if (isLocked) {
    const minutes = Math.ceil((new Date(lockUntil).getTime() - Date.now()) / 60000);
    throw makeError(`Tài khoản bị khóa. Thử lại sau ${minutes} phút`, 423);
  }

  // Kiểm tra tài khoản active
  if (!user.isActive) throw makeError('Tài khoản đã bị vô hiệu hóa', 401);

  // So sánh password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // user.loginAttempts đã được addSelect ở trên nên incrementLoginAttempts()
    // (định nghĩa sẵn trong User.entity.ts) có đủ dữ liệu để tự tăng số lần
    // sai và khoá tài khoản sau 5 lần, không cần round-trip SQL thủ công.
    user.incrementLoginAttempts();
    await r.save(user);

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

  export const googleRegister = async (dto: {
  email: string;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'enterprise';
  avatar?: string;
}) => {
  const r = repo();

  // Kiểm tra email đã tồn tại chưa
  const exists = await r.findOne({ where: { email: dto.email.toLowerCase().trim() } });
  if (exists) throw makeError('Email đã được sử dụng', 400);

  // Tạo user không cần password thật
  const randomPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
  const user = r.create({
    email:        dto.email.toLowerCase().trim(),
    password:     randomPassword,
    role:         dto.role,
    firstName:    dto.firstName.trim(),
    lastName:     dto.lastName.trim(),
    avatar:       dto.avatar,
    isVerified:   true,
    isActive:     true,
    authProvider: 'google',
  });

  await user.hashPassword();
  await r.save(user);

  // Tạo token và trả về
  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await r.save(user);

  const safeUser = await r.findOne({ where: { id: user.id } });
  return { user: safeUser, accessToken };
};

// ══════════════════════════════════════════
// ĐĂNG XUẤT
// ══════════════════════════════════════════
export const logout = async (userId: string) => {
  await repo().update({ id: userId }, { refreshToken: null as any });
};

// Đăng xuất từ refresh-token cookie mà không cần access token còn hạn.
// ignoreExpiration chỉ phục vụ thu hồi phiên khi logout; chữ ký token vẫn phải hợp lệ.
export const logoutByRefreshToken = async (token: string) => {
  if (!token || !process.env.JWT_REFRESH_SECRET) return;

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      ignoreExpiration: true,
    }) as { id?: string };

    if (decoded?.id) await logout(decoded.id);
  } catch {
    // Cookie sai/đã hỏng vẫn được xóa ở controller; không biến logout thành lỗi.
  }
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

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) throw makeError('Mật khẩu mới không được trùng với mật khẩu cũ', 400);

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
// CẬP NHẬT HỒ SƠ (đã đăng nhập)
// ══════════════════════════════════════════
export interface UpdateProfileDto {
  firstName?:   string;
  lastName?:    string;
  phone?:       string;
  avatar?:      string;
  province?:    string;
  district?:    string;
  ward?:        string;
  address?:     string;
  farmName?:    string;
  farmSize?:    number;
  companyName?: string;
  taxCode?:     string;
}

export const updateProfile = async (userId: string, dto: UpdateProfileDto) => {
  const r = repo();
  const user = await r.findOne({ where: { id: userId } });
  if (!user) throw makeError('Không tìm thấy người dùng', 404);

  if (dto.firstName   !== undefined) user.firstName   = dto.firstName.trim();
  if (dto.lastName    !== undefined) user.lastName    = dto.lastName.trim();
  if (dto.phone       !== undefined) user.phone       = dto.phone.trim();
  if (dto.avatar      !== undefined) user.avatar      = dto.avatar;
  if (dto.province    !== undefined) user.province    = dto.province;
  if (dto.district    !== undefined) user.district    = dto.district;
  if (dto.ward        !== undefined) user.ward        = dto.ward;
  if (dto.address     !== undefined) user.address     = dto.address;
  if (dto.farmName    !== undefined) user.farmName    = dto.farmName;
  if (dto.farmSize    !== undefined) user.farmSize    = dto.farmSize;
  if (dto.companyName !== undefined) user.companyName = dto.companyName;
  if (dto.taxCode     !== undefined) user.taxCode     = dto.taxCode;

  await r.save(user);

  return r.findOne({ where: { id: userId } });
};

// ══════════════════════════════════════════
// CẬP NHẬT MẬT KHẨU (đã đăng nhập)
// ══════════════════════════════════════════
export const updatePassword = async (
  userId: string,
  currentPassword: string | undefined,
  newPassword: string
) => {
  const user = await repo()
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.id = :id', { id: userId })
    .getOne();

  if (!user) throw makeError('Không tìm thấy người dùng', 404);

  // Tài khoản Google có mật khẩu random mà người dùng không biết
  // → lần đầu đặt mật khẩu không cần xác nhận mật khẩu cũ.
  if (user.authProvider !== 'google') {
    if (!currentPassword) throw makeError('Vui lòng nhập mật khẩu hiện tại', 400);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw makeError('Mật khẩu hiện tại không đúng', 401);
  }

  user.password          = newPassword;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  // Từ nay tài khoản dùng mật khẩu do người dùng tự đặt và biết rõ
  user.authProvider = 'local';
  await user.hashPassword();

  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await repo().save(user);

  return { accessToken, refreshToken, authProvider: user.authProvider };
};

// ══════════════════════════════════════════
// XÁC MINH EMAIL
// ══════════════════════════════════════════
export const verifyEmail = async (token: string) => {
  // Hash token để so sánh với DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Tìm user có token còn hạn
  const user = await repo()
    .createQueryBuilder('user')
    .addSelect([
      'user.emailVerificationToken',
      'user.emailVerificationExpires',
    ])
    .where('user.emailVerificationToken = :token', { token: hashedToken })
    .getOne();

  if (!user) throw makeError('Token không hợp lệ', 400);
  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw makeError('Token đã hết hạn. Vui lòng đăng ký lại.', 400);
  }

  // Cập nhật isVerified
  await repo().update({ id: user.id }, {
    isVerified:               true,
    emailVerificationToken:   undefined!,
    emailVerificationExpires: undefined!,
  });

  return true;
};