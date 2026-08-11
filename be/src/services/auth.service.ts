import crypto from 'crypto';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';

const repo = () => AppDataSource.getRepository(User);
const GOOGLE_ONBOARDING_EXPIRE = '10m';

interface ServiceError extends Error {
  statusCode?: number;
  code?: string;
}

interface GoogleOnboardingPayload {
  purpose: 'google_onboarding';
  googleId?: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  iat?: number;
  exp?: number;
}

const requireSecret = (value: string | undefined, name: string): string => {
  if (!value) throw makeError(`Máy chủ chưa cấu hình ${name}`, 500, 'AUTH_CONFIG_ERROR');
  return value;
};

const getJwtSecret = () => requireSecret(process.env.JWT_SECRET, 'JWT_SECRET');
const getRefreshSecret = () => requireSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
const getGoogleOnboardingSecret = () =>
  process.env.GOOGLE_ONBOARDING_SECRET || getJwtSecret();

const signTokens = (id: string, role: string) => {
  const accessToken = jwt.sign(
    { id, role },
    getJwtSecret() as Secret,
    { expiresIn: (process.env.JWT_EXPIRE || '15m') as SignOptions['expiresIn'] }
  );
  const refreshToken = jwt.sign(
    { id, type: 'refresh' },
    getRefreshSecret() as Secret,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn'] }
  );
  return { accessToken, refreshToken };
};

const makeError = (message: string, statusCode = 400, code?: string): ServiceError => {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

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

export interface RegisterDto {
  email: string;
  password: string;
  role: 'farmer' | 'enterprise';
  firstName: string;
  lastName: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
}

export const register = async (dto: RegisterDto) => {
  const r = repo();
  const normalizedEmail = dto.email.toLowerCase().trim();

  const exists = await r.findOne({ where: { email: normalizedEmail } });
  if (exists) throw makeError('Email đã được sử dụng', 400, 'EMAIL_ALREADY_EXISTS');

  const user = r.create({
    email: normalizedEmail,
    password: dto.password,
    role: dto.role,
    firstName: dto.firstName.trim(),
    lastName: dto.lastName.trim(),
    phone: dto.phone?.trim(),
    province: dto.province,
    district: dto.district,
    ward: dto.ward,
    isVerified: false,
    authProvider: 'local',
  });

  await user.hashPassword();
  const rawToken = user.createEmailVerificationToken();
  await r.save(user);

  const savedUser = await r.findOne({ where: { id: user.id } });
  return { user: savedUser, verifyToken: rawToken };
};

export const login = async (emailOrPhone: string, password: string) => {
  const r = repo();
  const identifier = emailOrPhone.trim();

  const user = await r
    .createQueryBuilder('user')
    .addSelect([
      'user.password',
      'user.refreshToken',
      'user.loginAttempts',
      'user.lockUntil',
      'user.passwordChangedAt',
    ])
    .where('LOWER(user.email) = LOWER(:email) OR user.phone = :phone', {
      email: identifier,
      phone: identifier,
    })
    .getOne();

  if (!user) throw makeError('Email/SĐT hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');

  const lockUntil = Array.isArray(user.lockUntil) ? user.lockUntil[0] : user.lockUntil;
  const isLocked = lockUntil && new Date(lockUntil) > new Date();
  if (isLocked) {
    const minutes = Math.ceil((new Date(lockUntil).getTime() - Date.now()) / 60000);
    throw makeError(`Tài khoản bị khóa. Thử lại sau ${minutes} phút`, 423, 'ACCOUNT_LOCKED');
  }

  if (!user.isActive) throw makeError('Tài khoản đã bị vô hiệu hóa', 401, 'ACCOUNT_DISABLED');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // loginAttempts/lockUntil da duoc addSelect. Chuan hoa lockUntil truoc khi
    // goi entity method de tranh du lieu legacy/driver tra ve khong dung Date.
    user.lockUntil = lockUntil ? new Date(lockUntil) : null;
    user.incrementLoginAttempts();
    await r.save(user);

    throw makeError('Email/SĐT hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
  }

  // Only reveal verification state after the password has been proven correct.
  if (user.authProvider === 'local' && !user.isVerified) {
    throw makeError(
      'Email chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác minh.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  user.resetLoginAttempts();
  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await r.save(user);

  const safeUser = await r.findOne({ where: { id: user.id } });
  return { user: safeUser, accessToken, refreshToken };
};

export const createGoogleOnboardingToken = (profile: {
  googleId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}) => {
  const normalizedEmail = profile.email.toLowerCase().trim();
  if (!normalizedEmail) throw makeError('Google không trả về email hợp lệ', 400, 'GOOGLE_PROFILE_INVALID');

  return jwt.sign(
    {
      purpose: 'google_onboarding',
      googleId: profile.googleId,
      email: normalizedEmail,
      firstName: profile.firstName?.trim() || '',
      lastName: profile.lastName?.trim() || '',
      avatar: profile.avatar,
    } satisfies Omit<GoogleOnboardingPayload, 'iat' | 'exp'>,
    getGoogleOnboardingSecret(),
    { expiresIn: GOOGLE_ONBOARDING_EXPIRE }
  );
};

export const readGoogleOnboardingToken = (token: string): GoogleOnboardingPayload => {
  if (!token) throw makeError('Phiên đăng ký Google không tồn tại hoặc đã hết hạn', 401, 'GOOGLE_ONBOARDING_EXPIRED');

  try {
    const decoded = jwt.verify(token, getGoogleOnboardingSecret()) as GoogleOnboardingPayload;
    if (decoded.purpose !== 'google_onboarding' || !decoded.email) {
      throw new Error('invalid purpose');
    }
    return decoded;
  } catch {
    throw makeError(
      'Phiên đăng ký Google không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập Google lại.',
      401,
      'GOOGLE_ONBOARDING_EXPIRED'
    );
  }
};

export const getGoogleOnboardingProfile = (token: string) => {
  const profile = readGoogleOnboardingToken(token);
  return {
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatar: profile.avatar,
  };
};

export const googleRegister = async (
  onboardingToken: string,
  role: 'farmer' | 'enterprise'
) => {
  const profile = readGoogleOnboardingToken(onboardingToken);
  const r = repo();

  const exists = await r.findOne({ where: { email: profile.email } });
  if (exists) {
    throw makeError(
      'Email đã có tài khoản. Vui lòng đăng nhập Google lại để tiếp tục.',
      409,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  const randomPassword = `${crypto.randomBytes(32).toString('hex')}Aa1!`;
  const user = r.create({
    email: profile.email,
    password: randomPassword,
    role,
    firstName: profile.firstName || 'Google',
    lastName: profile.lastName || 'User',
    avatar: profile.avatar,
    isVerified: true,
    isActive: true,
    authProvider: 'google',
  });

  await user.hashPassword();
  await r.save(user);

  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await r.save(user);

  const safeUser = await r.findOne({ where: { id: user.id } });
  return { user: safeUser, accessToken, refreshToken };
};

export const createGoogleLoginSession = async (userId: string) => {
  const r = repo();
  const user = await r
    .createQueryBuilder('user')
    .addSelect('user.refreshToken')
    .where('user.id = :id', { id: userId })
    .getOne();

  if (!user || !user.isActive) {
    throw makeError('Tài khoản không còn khả dụng', 401, 'ACCOUNT_DISABLED');
  }

  // A successful Google OAuth response proves ownership of the Google email.
  // This also safely verifies an existing local account with the same email.
  if (!user.isVerified) {
    user.isVerified = true;
    user.emailVerificationToken = null as any;
    user.emailVerificationExpires = null as any;
  }

  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  user.loginAttempts = 0;
  user.lockUntil = null;
  await r.save(user);

  const safeUser = await r.findOne({ where: { id: user.id } });
  return { user: safeUser, accessToken, refreshToken };
};

export const logout = async (userId: string) => {
  await repo().update({ id: userId }, { refreshToken: null as any });
};

export const logoutByRefreshToken = async (token: string) => {
  if (!token || !process.env.JWT_REFRESH_SECRET) return;

  try {
    const decoded = jwt.verify(token, getRefreshSecret(), {
      ignoreExpiration: true,
    }) as { id?: string };

    if (decoded?.id) await logout(decoded.id);
  } catch {
    // Cookie invalid/expired is still cleared by controller.
  }
};

export const refreshAccessToken = async (token: string) => {
  if (!token) throw makeError('Refresh token là bắt buộc', 401, 'REFRESH_TOKEN_REQUIRED');

  let decoded: { id?: string; iat?: number; type?: string };
  try {
    decoded = jwt.verify(token, getRefreshSecret()) as typeof decoded;
  } catch {
    throw makeError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'REFRESH_TOKEN_INVALID');
  }

  if (!decoded.id || (decoded.type && decoded.type !== 'refresh')) {
    throw makeError('Refresh token không hợp lệ', 401, 'REFRESH_TOKEN_INVALID');
  }

  return AppDataSource.transaction(async (manager) => {
    const user = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .setLock('pessimistic_write')
      .addSelect(['user.refreshToken', 'user.passwordChangedAt'])
      .where('user.id = :id', { id: decoded.id })
      .getOne();

    if (!user || !user.isActive || user.refreshToken !== token) {
      throw makeError('Refresh token không hợp lệ', 401, 'REFRESH_TOKEN_INVALID');
    }

    if (decoded.iat && user.changedPasswordAfter(decoded.iat)) {
      user.refreshToken = null as any;
      await manager.getRepository(User).save(user);
      throw makeError(
        'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.',
        401,
        'SESSION_REVOKED'
      );
    }

    const nextTokens = signTokens(user.id, user.role);
    user.refreshToken = nextTokens.refreshToken;
    await manager.getRepository(User).save(user);
    return nextTokens;
  });
};

export const forgotPassword = async (email: string) => {
  const user = await repo().findOne({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) return null;

  const rawToken = user.createPasswordResetToken();
  await repo().save(user);
  return { user, rawToken };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await repo()
    .createQueryBuilder('user')
    .addSelect([
      'user.passwordResetToken',
      'user.passwordResetExpires',
      'user.password',
      'user.refreshToken',
    ])
    .where('user.passwordResetToken = :token', { token: hashedToken })
    .getOne();

  if (!user) throw makeError('Token không hợp lệ', 400, 'RESET_TOKEN_INVALID');
  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw makeError('Token đã hết hạn. Vui lòng yêu cầu lại', 400, 'RESET_TOKEN_EXPIRED');
  }

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw makeError('Mật khẩu mới không được trùng với mật khẩu cũ', 400, 'PASSWORD_REUSED');
  }

  user.password = newPassword;
  user.passwordResetToken = null as any;
  user.passwordResetExpires = null as any;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  user.refreshToken = null as any;
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.authProvider = 'local';

  await user.hashPassword();
  await repo().save(user);
  return user;
};

export const getMe = async (userId: string) => {
  return repo().findOne({ where: { id: userId } });
};

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  province?: string;
  district?: string;
  ward?: string;
  address?: string;
  farmName?: string;
  farmSize?: number;
  companyName?: string;
  taxCode?: string;
}

export const updateProfile = async (userId: string, dto: UpdateProfileDto) => {
  const r = repo();
  const user = await r.findOne({ where: { id: userId } });
  if (!user) throw makeError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');

  if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
  if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
  if (dto.phone !== undefined) user.phone = dto.phone.trim();
  if (dto.avatar !== undefined) user.avatar = dto.avatar;
  if (dto.province !== undefined) user.province = dto.province;
  if (dto.district !== undefined) user.district = dto.district;
  if (dto.ward !== undefined) user.ward = dto.ward;
  if (dto.address !== undefined) user.address = dto.address;
  if (dto.farmName !== undefined) user.farmName = dto.farmName;
  if (dto.farmSize !== undefined) user.farmSize = dto.farmSize;
  if (dto.companyName !== undefined) user.companyName = dto.companyName;
  if (dto.taxCode !== undefined) user.taxCode = dto.taxCode;

  await r.save(user);
  return r.findOne({ where: { id: userId } });
};

export const updatePassword = async (
  userId: string,
  currentPassword: string | undefined,
  newPassword: string
) => {
  const user = await repo()
    .createQueryBuilder('user')
    .addSelect(['user.password', 'user.refreshToken'])
    .where('user.id = :id', { id: userId })
    .getOne();

  if (!user) throw makeError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');

  if (user.authProvider !== 'google') {
    if (!currentPassword) throw makeError('Vui lòng nhập mật khẩu hiện tại', 400);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw makeError('Mật khẩu hiện tại không đúng', 401, 'INVALID_CREDENTIALS');
  }

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw makeError('Mật khẩu mới không được trùng với mật khẩu cũ', 400, 'PASSWORD_REUSED');
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  user.authProvider = 'local';
  await user.hashPassword();

  const { accessToken, refreshToken } = signTokens(user.id, user.role);
  user.refreshToken = refreshToken;
  await repo().save(user);

  return { accessToken, refreshToken, authProvider: user.authProvider };
};

export const verifyEmail = async (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await repo()
    .createQueryBuilder('user')
    .addSelect(['user.emailVerificationToken', 'user.emailVerificationExpires'])
    .where('user.emailVerificationToken = :token', { token: hashedToken })
    .getOne();

  if (!user) throw makeError('Token không hợp lệ', 400, 'VERIFY_TOKEN_INVALID');
  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw makeError(
      'Token đã hết hạn. Vui lòng yêu cầu gửi lại email xác minh.',
      400,
      'VERIFY_TOKEN_EXPIRED'
    );
  }

  user.isVerified = true;
  user.emailVerificationToken = null as any;
  user.emailVerificationExpires = null as any;
  await repo().save(user);
  return true;
};

export const resendVerification = async (identifier: string) => {
  const value = identifier.trim();
  if (!value) return null;

  const user = await repo()
    .createQueryBuilder('user')
    .where('LOWER(user.email) = LOWER(:email) OR user.phone = :phone', {
      email: value,
      phone: value,
    })
    .getOne();

  // Generic response for unknown/already-verified/Google accounts prevents enumeration.
  if (!user || user.isVerified || user.authProvider === 'google' || !user.isActive) {
    return null;
  }

  const rawToken = user.createEmailVerificationToken();
  await repo().save(user);
  return { user, verifyToken: rawToken };
};
