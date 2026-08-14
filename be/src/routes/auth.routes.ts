import { Router, RequestHandler } from 'express';
import '../config/passport';
import passport from 'passport';

import {
  logout,
  refreshToken,
  getMe,
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword,
  verifyEmail,
  googleRegister,
  googleOAuthCallback,
  getGoogleOnboarding,
  resendVerification,
} from '../controller/auth.controller';

import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
  validateUpdatePassword,
  validateGoogleRegister,
  validateResendVerification,
} from '../middlewares/validation';

import { protect } from '../middlewares/auth.middlewares';
import { uploadAvatar } from '../middlewares/uploads.middlewares';
import {
  authLimiter,
  refreshLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../middlewares/ratelimit.middleware';

const router = Router();

router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh-token', refreshLimiter, refreshToken);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);
router.post('/resend-verification', passwordResetLimiter, validateResendVerification, resendVerification);
router.get('/verify-email/:token', verifyEmail as RequestHandler);

router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    prompt: 'select_account',
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?error=google_failed`,
  }),
  googleOAuthCallback as RequestHandler
);

router.get('/google-onboarding', getGoogleOnboarding as RequestHandler);
router.post('/google-register', authLimiter, validateGoogleRegister, googleRegister as RequestHandler);

router.get('/me', protect as RequestHandler, getMe as RequestHandler);
router.patch('/me', protect as RequestHandler, uploadAvatar, validateUpdateProfile, updateProfile as RequestHandler);
router.put('/update-password', protect as RequestHandler, validateUpdatePassword, updatePassword as RequestHandler);
router.post('/logout', logout as RequestHandler);

export default router;
