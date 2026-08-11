import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';
import { sendResetPasswordEmail } from '../services/email.service';
import * as emailService from '../services/email.service';
import { logAction, logError } from '../services/systemLog.service';
import {
  isDatabaseConnected,
  isDatabaseUnavailableError,
  markDatabaseUnhealthy,
} from '../config/database';
import {
  getRefreshCookieOptions,
  getRefreshCookieClearOptions,
  getGoogleOnboardingCookieOptions,
  getGoogleOnboardingCookieClearOptions,
  REFRESH_COOKIE_NAME,
  GOOGLE_ONBOARDING_COOKIE_NAME,
} from '../utils/auth-cookie.util';

const errorResponse = (res: Response, err: any, fallback: string, fallbackStatus = 500) =>
  res.status(err.statusCode || fallbackStatus).json({
    success: false,
    ...(err.code ? { code: err.code } : {}),
    message: err.message || fallback,
  });

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);

    if (result?.user && result?.verifyToken) {
      try {
        await emailService.sendVerifyEmail(
          result.user.email,
          result.verifyToken,
          `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim()
        );
      } catch (emailErr: any) {
        logError({
          category: 'auth',
          action: 'verification_email_failed',
          level: 'warn',
          message: 'Không thể gửi email xác minh sau đăng ký',
          userId: result.user.id,
          targetType: 'User',
          targetId: result.user.id,
          ipAddress: req.ip,
          error: emailErr,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.',
      data: { user: result?.user },
    });
  } catch (err: any) {
    errorResponse(res, err, 'Đăng ký thất bại');
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(emailOrPhone, password);

    logAction({
      category: 'auth',
      action: 'login_success',
      message: `${user?.email || 'user'} đăng nhập thành công`,
      userId: user?.id,
      targetType: 'User',
      targetId: user?.id,
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

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
      message: `Đăng nhập thất bại: ${err.message || 'lỗi không xác định'}`,
      metadata: { identifierType: String(req.body?.emailOrPhone || '').includes('@') ? 'email' : 'phone_or_other' },
      ipAddress: req.ip,
      error: err,
    });
    errorResponse(res, err, 'Đăng nhập thất bại');
  }
};

export const getGoogleOnboarding = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[GOOGLE_ONBOARDING_COOKIE_NAME];
    const profile = authService.getGoogleOnboardingProfile(token);
    res.status(200).json({ success: true, data: { profile } });
  } catch (err: any) {
    res.clearCookie(GOOGLE_ONBOARDING_COOKIE_NAME, getGoogleOnboardingCookieClearOptions());
    errorResponse(res, err, 'Phiên đăng ký Google không hợp lệ', 401);
  }
};

export const googleRegister = async (req: Request, res: Response) => {
  try {
    const onboardingToken = req.cookies?.[GOOGLE_ONBOARDING_COOKIE_NAME];
    const { role } = req.body;
    const { user, accessToken, refreshToken } = await authService.googleRegister(
      onboardingToken,
      role
    );

    res.clearCookie(GOOGLE_ONBOARDING_COOKIE_NAME, getGoogleOnboardingCookieClearOptions());
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: { user, accessToken },
    });
  } catch (err: any) {
    errorResponse(res, err, 'Tạo tài khoản Google thất bại');
  }
};

export const googleOAuthCallback = async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const oauthUser = req.user as any;
    if (!oauthUser) {
      return res.redirect(`${frontendUrl}/auth?error=google_failed`);
    }

    if (oauthUser.isNewUser) {
      const onboardingToken = authService.createGoogleOnboardingToken({
        googleId: oauthUser.googleId,
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        avatar: oauthUser.avatar,
      });

      res.cookie(
        GOOGLE_ONBOARDING_COOKIE_NAME,
        onboardingToken,
        getGoogleOnboardingCookieOptions()
      );
      return res.redirect(`${frontendUrl}/auth/google/select-role`);
    }

    const { refreshToken } = await authService.createGoogleLoginSession(oauthUser.id);
    res.clearCookie(GOOGLE_ONBOARDING_COOKIE_NAME, getGoogleOnboardingCookieClearOptions());
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    // No access token or serialized user is exposed in the URL anymore.
    return res.redirect(`${frontendUrl}/auth/google/callback?success=1`);
  } catch (err: any) {
    logError({
      category: 'auth',
      action: 'google_callback_failed',
      level: 'warn',
      message: err.message || 'Google callback thất bại',
      ipAddress: req.ip,
      error: err,
    });
    return res.redirect(`${frontendUrl}/auth?error=google_failed`);
  }
};

export const logout = (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());
  res.clearCookie(GOOGLE_ONBOARDING_COOKIE_NAME, getGoogleOnboardingCookieClearOptions());
  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công',
  });

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

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshAccessToken(token);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());
    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (err: any) {
    if (isDatabaseUnavailableError(err)) {
      markDatabaseUnhealthy(err);
      res.setHeader('Retry-After', '5');
      return res.status(503).json({
        success: false,
        status: 'error',
        code: 'DATABASE_UNAVAILABLE',
        message: 'Kết nối dữ liệu đang tạm thời gián đoạn. Phiên đăng nhập của bạn vẫn được giữ nguyên.',
      });
    }

    // Clear only an actually rejected/expired refresh token, never on server errors.
    if ((err.statusCode || 500) === 401) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());
    }
    return errorResponse(res, err, 'Refresh token thất bại', 401);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json({ success: true, data: { user } });
  } catch (err: any) {
    errorResponse(res, err, 'Lấy thông tin thất bại');
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await authService.forgotPassword(req.body.email);

    if (result) {
      try {
        await sendResetPasswordEmail(
          result.user.email,
          result.rawToken,
          `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim()
        );
      } catch (emailErr: any) {
        logError({
          category: 'auth',
          action: 'reset_email_failed',
          level: 'warn',
          message: 'Không thể gửi email đặt lại mật khẩu',
          userId: result.user.id,
          targetType: 'User',
          targetId: result.user.id,
          ipAddress: req.ip,
          error: emailErr,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi',
    });
  } catch (err: any) {
    errorResponse(res, err, 'Gửi email thất bại');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    // Any refresh session belonging to the account has been revoked in DB.
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());
    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Tất cả phiên cũ đã được thu hồi, vui lòng đăng nhập lại.',
    });
  } catch (err: any) {
    errorResponse(res, err, 'Đặt lại mật khẩu thất bại');
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const result = await authService.resendVerification(req.body.emailOrPhone);

    if (result) {
      try {
        await emailService.sendVerifyEmail(
          result.user.email,
          result.verifyToken,
          `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim()
        );
      } catch (emailErr: any) {
        logError({
          category: 'auth',
          action: 'resend_verification_failed',
          level: 'warn',
          message: 'Không thể gửi lại email xác minh',
          userId: result.user.id,
          targetType: 'User',
          targetId: result.user.id,
          ipAddress: req.ip,
          error: emailErr,
        });
      }
    }

    // Generic message prevents account enumeration.
    res.status(200).json({
      success: true,
      message: 'Nếu tài khoản cần xác minh, email xác minh mới đã được gửi.',
    });
  } catch (err: any) {
    errorResponse(res, err, 'Không thể gửi lại email xác minh');
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const avatarFile = (req as any).file as Express.Multer.File | undefined;
    const dto = avatarFile ? { ...req.body, avatar: avatarFile.path } : req.body;
    const user = await authService.updateProfile(req.user!.id, dto);
    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: { user },
    });
  } catch (err: any) {
    errorResponse(res, err, 'Cập nhật hồ sơ thất bại');
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { accessToken, refreshToken: newRefreshToken, authProvider } =
      await authService.updatePassword(req.user!.id, currentPassword, newPassword);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());
    res.status(200).json({
      success: true,
      message: 'Cập nhật mật khẩu thành công',
      data: { accessToken, authProvider },
    });
  } catch (err: any) {
    errorResponse(res, err, 'Cập nhật mật khẩu thất bại');
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    await authService.verifyEmail(token);
    res.status(200).json({
      success: true,
      message: 'Email đã được xác minh thành công.',
    });
  } catch (err: any) {
    errorResponse(res, err, 'Xác minh email thất bại', 400);
  }
};
