import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private static sendAuthResponse(res: Response, statusCode: number, message: string, data: any) {
    res.status(statusCode).json({
      success: true,
      status: 'success',
      message,
      data,
    });
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);

      if ('requiresVerification' in result) {
        return res.status(201).json({
          success: true,
          status: 'success',
          requiresVerification: true,
          message: 'Tài khoản doanh nghiệp đã được tạo. Vui lòng kiểm tra email để kích hoạt.',
          data: { email: result.email },
        });
      }

      const { user, tokens } = result;
      return AuthController.sendAuthResponse(res, 201, 'Đăng ký tài khoản thành công!', {
        user,
        accessToken: tokens.accessToken
      });
    } catch (error: any) {
      next(error);
    }
  }
}