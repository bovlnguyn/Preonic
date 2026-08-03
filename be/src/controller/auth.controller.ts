import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';
import { sendResetPasswordEmail } from '../services/email.service';
import * as emailService from '../services/email.service';
import { logAction, logError } from '../services/systemLog.service';
import { isDatabaseConnected } from '../config/database';
// ── Cookie options cho refresh token ──
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

// ══════════════════════════════════════════
// ĐĂNG KÝ
// ══════════════════════════════════════════
export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    console.log('register result:', result);
console.log('has user:', !!result?.user);
console.log('has verifyToken:', !!result?.verifyToken);

    // Gửi email verify
    if (result?.user && result?.verifyToken) {
      try {
        await emailService.sendVerifyEmail(
          result.user.email,
          result.verifyToken,
          `${result.user.firstName} ${result.user.lastName}`
        );
      } catch (emailErr: any) {
        console.error('Lỗi gửi email verify:', emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.',
      data: { user: result?.user },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Đăng ký thất bại',
    });
  }
};

// ══════════════════════════════════════════
// ĐĂNG NHẬP
// ══════════════════════════════════════════
export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(emailOrPhone, password);

    logAction({
      category: 'auth',
      action: 'login_success',
      message: `${user?.email || emailOrPhone} đăng nhập thành công`,
      userId: user?.id,
      targetType: 'User',
      targetId: user?.id,
      ipAddress: req.ip,
    });

    // Lưu refreshToken vào httpOnly cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { user, accessToken },
    });
  } catch (err: any) {
    logError({
      category: 'auth',
      action: 'login_failed',
      level: 'warn',
      message: `Đăng nhập thất bại (${req.body?.emailOrPhone}): ${err.message || 'lỗi không xác định'}`,
      metadata: { emailOrPhone: req.body?.emailOrPhone },
      ipAddress: req.ip,
      error: err,
    });
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Đăng nhập thất bại',
    });
  }
};

export const googleRegister = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, role, avatar } = req.body;
    const { user, accessToken } = await authService.googleRegister({
      email, firstName, lastName, role, avatar,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: { user, accessToken },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Tạo tài khoản thất bại',
    });
  }
};

// ══════════════════════════════════════════
// ĐĂNG XUẤT
// ══════════════════════════════════════════
export const logout = (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  // Xóa cookie và trả kết quả ngay. Logout không được phụ thuộc vào trạng thái DB.
  res.clearCookie('refreshToken', COOKIE_CLEAR_OPTIONS);
  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công',
  });

  // Thu hồi token trong DB theo kiểu best-effort. Khi DB đang gián đoạn, cookie
  // phía client đã bị xóa nên người dùng vẫn đăng xuất bình thường.
  if (refreshToken && isDatabaseConnected()) {
    void authService.logoutByRefreshToken(refreshToken).catch((error: any) => {
      logError({
        category: 'auth',
        action: 'logout_revoke_failed',
        level: 'warn',
        message: 'Không thể thu hồi refresh token khi đăng xuất',
        ipAddress: req.ip,
        error,
      });
    });
  }
};

// ══════════════════════════════════════════
// REFRESH TOKEN
// ══════════════════════════════════════════
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Lấy token từ cookie hoặc body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshAccessToken(token);

    // Cập nhật cookie với token mới
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (err: any) {
    res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || 'Refresh token thất bại',
    });
  }
};

// ══════════════════════════════════════════
// LẤY THÔNG TIN USER HIỆN TẠI
// ══════════════════════════════════════════
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Lấy thông tin thất bại',
    });
  }
};

// ══════════════════════════════════════════
// QUÊN MẬT KHẨU
// ══════════════════════════════════════════
export const forgotPassword = async (req: Request, res: Response) => {

  try {
    const result = await authService.forgotPassword(req.body.email);

    if (result) {
      
      await sendResetPasswordEmail(
        result.user.email,
        result.rawToken,
        `${result.user.firstName} ${result.user.lastName}`
      );
     
    }

    res.status(200).json({
      success: true,
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi',
    });
  } catch (err: any) {
   
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Gửi email thất bại',
    });
  }
};

// ══════════════════════════════════════════
// ĐẶT LẠI MẬT KHẨU
// ══════════════════════════════════════════
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Đặt lại mật khẩu thất bại',
    });
  }
};

// ══════════════════════════════════════════
// CẬP NHẬT HỒ SƠ (đã đăng nhập)
// ══════════════════════════════════════════
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const avatarFile = (req as any).file as Express.Multer.File | undefined;
    const dto = avatarFile
      ? { ...req.body, avatar: `/uploads/avatars/${avatarFile.filename}` }
      : req.body;
    const user = await authService.updateProfile(req.user!.id, dto);
    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: { user },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Cập nhật hồ sơ thất bại',
    });
  }
};

// ══════════════════════════════════════════
// CẬP NHẬT MẬT KHẨU (đã đăng nhập)
// ══════════════════════════════════════════
export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { accessToken, refreshToken: newRefreshToken, authProvider } =
      await authService.updatePassword(req.user!.id, currentPassword, newPassword);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Cập nhật mật khẩu thành công',
      data: { accessToken, authProvider },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Cập nhật mật khẩu thất bại',
    });
  }
};
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    await authService.verifyEmail(token);

    // Redirect về FE trang verify thành công
    res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=success`);
  } catch (err: any) {
    res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=error&message=${encodeURIComponent(err.message)}`);
  }
};