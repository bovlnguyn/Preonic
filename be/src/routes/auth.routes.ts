import { Router } from 'express';

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

// ── Protected routes ──
router.get ('/me',     protect, getMe);
router.post('/logout', protect, logout);

export default router;