// Rate limiting cho các endpoint nhạy cảm.
// Bảo vệ brute-force vào /auth/* (login, register, forgot-password, reset-password).
// Hiện dùng memory store — sang Redis khi deploy multi-instance.

import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Login: rất nhạy cảm, giới hạn chặt theo IP
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đăng nhập từ IP này. Vui lòng thử lại sau 15 phút.',
  },
});


// Refresh token là luồng nền hợp lệ và có thể xảy ra cho nhiều user cùng NAT.
// Tách khỏi login limiter để tránh một văn phòng/lớp học vô tình khóa refresh của nhau.
export const refreshLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu làm mới phiên đăng nhập. Vui lòng thử lại sau ít phút.',
  },
});

// Register: ngăn spam tạo tài khoản hàng loạt
export const registerLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đăng ký từ IP này. Vui lòng thử lại sau 1 giờ.',
  },
});

// Password reset: hạn chế email-bombing
export const passwordResetLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 1 giờ.',
  },
});

// Public AI: giới hạn theo IP để tránh liên tục tạo phiên khách mới và đốt quota API.
export const publicAiLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: Number(process.env.PUBLIC_AI_IP_LIMIT_PER_HOUR || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'PUBLIC_AI_RATE_LIMITED',
    message: 'Bạn đã gửi quá nhiều câu hỏi trong thời gian ngắn. Vui lòng thử lại sau.',
  },
});


// Farmer AI: đã đăng nhập nhưng vẫn cần chặn spam đốt quota API.
export const farmerAiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: Number(process.env.FARMER_AI_LIMIT_PER_15_MIN || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FARMER_AI_RATE_LIMITED',
    message: 'Bạn đã gửi quá nhiều câu hỏi cho PreOnic Farmer AI. Vui lòng thử lại sau ít phút.',
  },
});
