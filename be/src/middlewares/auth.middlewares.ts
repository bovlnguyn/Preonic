import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { AuthRequest, JwtUserPayload } from '../types';
import { AppError } from './error.middleware';

const BEARER_PREFIX = 'Bearer ';

// ── Đọc token từ header theo đúng chuẩn Bearer ──
const extractBearerToken = (authorizationHeader?: string): string | undefined => {
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) {
    return undefined;
  }
  return authorizationHeader.slice(BEARER_PREFIX.length).trim();
};

// ── Đọc JWT_SECRET, báo lỗi rõ nếu chưa cấu hình ──
const getJwtSecret = (): string => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('Máy chủ chưa cấu hình JWT_SECRET', 500);
  }
  return process.env.JWT_SECRET;
};

// ── Helper lấy User repo ──
const userRepo = () => AppDataSource.getRepository(User);

// ══════════════════════════════════════════════════════
// protect — xác thực JWT, gắn req.user
// Thay thế: User.findById().select(...)
//        → repo.findOne({ where, select })
// ══════════════════════════════════════════════════════
export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(new AppError('Bạn cần đăng nhập để truy cập tài nguyên này', 401));
  }

  try {
    // 1. Verify token
    const decoded = jwt.verify(token, getJwtSecret()) as JwtUserPayload;

    // 2. Kiểm tra lại user trong DB — chặn tài khoản đã bị vô hiệu hóa
    //    Thay: User.findById(decoded.id).select('email role fullName isActive')
    const activeUser = await userRepo().findOne({
      where: { id: decoded.id },
      select: {
        id:       true,
        email:    true,
        role:     true,
        fullName: true,
        isActive: true,
      },
    });

    if (!activeUser || !activeUser.isActive) {
      return next(
        new AppError('Tài khoản không còn khả dụng hoặc đã bị vô hiệu hóa', 401)
      );
    }

    // 3. Gắn thông tin user vào request
    //    Thay: String(activeUser._id) → activeUser.id (TypeORM dùng id thay _id)
    req.user = {
      id:       activeUser.id,
      email:    activeUser.email,
      role:     activeUser.role,
      fullName: activeUser.fullName,
    };

    return next();
  } catch {
    return next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401));
  }
};

// ══════════════════════════════════════════════════════
// requireCompleteProfile — yêu cầu hồ sơ đầy đủ
// Thay thế: User.findById(req.user.id)
//        → repo.findOne({ where: { id } })
// ══════════════════════════════════════════════════════
export const requireCompleteProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Bạn cần đăng nhập để truy cập tài nguyên này', 401));
  }

  // Admin được miễn kiểm tra hồ sơ
  if (req.user.role === 'admin') return next();

  // Thay: User.findById(req.user.id)
  const fullUser = await userRepo().findOne({
    where: { id: req.user.id },
  });

  if (!fullUser) {
    return next(new AppError('Không tìm thấy người dùng', 404));
  }

  if (!fullUser.isProfileComplete()) {
    return res.status(403).json({
      success: false,
      status:  'error',
      code:    'PROFILE_INCOMPLETE',
      message: 'Vui lòng cập nhật đầy đủ hồ sơ cá nhân trước khi thực hiện thao tác này.',
    });
  }

  return next();
};

// ══════════════════════════════════════════════════════
// restrictTo — kiểm tra role (giữ nguyên, không liên quan DB)
// ══════════════════════════════════════════════════════
export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('Bạn không có quyền thực hiện thao tác này', 403)
      );
    }
    next();
  };
};