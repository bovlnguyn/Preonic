import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource, markDatabaseUnhealthy } from '../config/database';
import { User } from '../models/User.entity';
import { AuthRequest, JwtUserPayload } from '../types';
import { AppError } from './error.middleware';

const BEARER_PREFIX = 'Bearer ';

const extractBearerToken = (authorizationHeader?: string): string | undefined => {
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) return undefined;
  return authorizationHeader.slice(BEARER_PREFIX.length).trim();
};

const getJwtSecret = (): string => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('Máy chủ chưa cấu hình JWT_SECRET', 500);
  }
  return process.env.JWT_SECRET;
};

const userRepo = () => AppDataSource.getRepository(User);

const sendDatabaseUnavailable = (res: Response) => {
  res.setHeader('Retry-After', '5');
  return res.status(503).json({
    success: false,
    status: 'error',
    code: 'DATABASE_UNAVAILABLE',
    message: 'Kết nối dữ liệu đang tạm thời gián đoạn. Phiên đăng nhập của bạn vẫn được giữ nguyên.',
  });
};

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(new AppError('Bạn cần đăng nhập để truy cập tài nguyên này', 401));
  }

  let decoded: JwtUserPayload;
  try {
    // Chỉ lỗi JWT mới được chuyển thành 401. Không gộp lỗi database vào đây.
    decoded = jwt.verify(token, getJwtSecret()) as JwtUserPayload;
  } catch {
    return next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401));
  }

  try {
    const activeUser = await userRepo()
      .createQueryBuilder('user')
      .addSelect('user.passwordChangedAt')
      .where('user.id = :id', { id: decoded.id })
      .getOne();

    if (!activeUser || !activeUser.isActive) {
      return next(
        new AppError('Tài khoản không còn khả dụng hoặc đã bị vô hiệu hóa', 401)
      );
    }

    if (decoded.iat && activeUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('Phiên đăng nhập đã bị thu hồi sau khi mật khẩu thay đổi. Vui lòng đăng nhập lại.', 401)
      );
    }

    req.user = {
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      fullName: activeUser.fullName,
    };

    return next();
  } catch (error) {
    // Trước đây lỗi kết nối SQL bị catch chung và trả 401, làm frontend xóa phiên.
    // Nay trả đúng 503 để trình duyệt giữ nguyên đăng nhập và chờ DB hồi phục.
    markDatabaseUnhealthy(error);
    return sendDatabaseUnavailable(res);
  }
};

export const requireCompleteProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Bạn cần đăng nhập để truy cập tài nguyên này', 401));
  }

  if (req.user.role === 'admin') return next();

  try {
    const fullUser = await userRepo().findOne({
      where: { id: req.user.id },
    });

    if (!fullUser) {
      return next(new AppError('Không tìm thấy người dùng', 404));
    }

    if (!fullUser.isProfileComplete()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'PROFILE_INCOMPLETE',
        message: 'Vui lòng cập nhật đầy đủ hồ sơ cá nhân trước khi thực hiện thao tác này.',
      });
    }

    return next();
  } catch (error) {
    markDatabaseUnhealthy(error);
    return sendDatabaseUnavailable(res);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403));
    }
    next();
  };
};
