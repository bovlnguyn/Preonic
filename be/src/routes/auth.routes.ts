import { Router } from 'express';
import '../config/passport'; // khởi tạo strategy
import passport from 'passport';
import jwt, {Secret, SignOptions} from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { validateGoogleRegister } from '../middlewares/validation';
import { googleRegister } from '../controller/auth.controller';
import { verifyEmail } from '../controller/auth.controller';


import {
  logout,
  refreshToken,
  getMe,
  register,
  login,
  forgotPassword,
  resetPassword,
} from '../controller/auth.controller';

import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} from '../middlewares/validation';

import { protect } from '../middlewares/auth.middlewares';

import {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../middlewares/ratelimit.middleware';

const router = Router();

// ── Public routes ──
router.post('/register',        registerLimiter,      validateRegister,       register);
router.post('/login',           authLimiter,          validateLogin,          login);
router.post('/refresh-token',   authLimiter,                                  refreshToken);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password',                        validateResetPassword,  resetPassword);
router.post('/google-register', validateGoogleRegister, googleRegister as RequestHandler);
// Verify email
router.get('/verify-email/:token', verifyEmail as RequestHandler);

// ── Protected routes ──
router.get ('/me',     protect as RequestHandler, getMe as RequestHandler);
router.post('/logout', protect as RequestHandler, logout as RequestHandler);
// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth?error=google_failed` }),
  (req: any, res: any) => {
    const user = req.user;

    // User mới → redirect về trang chọn role
    if (user.isNewUser) {
      const profile = encodeURIComponent(JSON.stringify({
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        avatar:    user.avatar,
      }));
      return res.redirect(`${process.env.FRONTEND_URL}/auth/google/select-role?profile=${profile}`);
    }

    // User cũ → tạo token và redirect
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as Secret,
      { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] }
    );
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id, email: user.email, role: user.role,
      firstName: user.firstName, lastName: user.lastName,
    }));
    res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${accessToken}&user=${userData}`);
  }
);
export default router;