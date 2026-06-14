import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Handle validation errors
 */
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    res.status(400).json({
      success: false,
      status: 'error',
      message: errorMessages[0] || 'Dữ liệu không hợp lệ',
      errors: errorMessages,
    });
    return;
  }
  next();
};

/**
 * Validate Register
 * Matches FE Register.jsx: { fullName, email, phone, password, confirmPassword, role, agreeTerms }
 */
export const validateRegister = [

body('firstName')
  .trim()
  .notEmpty()
  .withMessage('Vui lòng nhập tên')
  .isLength({ min: 1, max: 100 })
  .withMessage('Tên phải từ 1-100 ký tự'),

body('lastName')
  .trim()
  .notEmpty()
  .withMessage('Vui lòng nhập họ')
  .isLength({ min: 1, max: 100 })
  .withMessage('Họ phải từ 1-100 ký tự'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .toLowerCase(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập số điện thoại')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),

  body('password')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu'),

  body('role')
    .notEmpty()
    .withMessage('Vui lòng chọn vai trò')
    .isIn(['farmer', 'enterprise'])
    .withMessage('Vai trò phải là "farmer" hoặc "enterprise"'),

  body('agreeTerms')
    .optional() // Make it optional in validation
    .custom((value) => {
      // If exists, must be truthy
      if (value === false || value === 'false') {
        return false;
      }
      return true;
    })
    .withMessage('Vui lòng đồng ý với điều khoản sử dụng'),

  handleValidationErrors,
];

/**
 * Validate Login
 * Matches FE Auth.jsx: { emailOrPhone, password }
 */
export const validateLogin = [
  body('emailOrPhone')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập email hoặc số điện thoại'),

  body('password')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu'),

  handleValidationErrors,
];

/**
 * Validate Forgot Password
 */
export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập email')
    .isEmail()
    .withMessage('Email không hợp lệ'),

  handleValidationErrors,
];

/**
 * Validate Reset Password
 */
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token đặt lại mật khẩu là bắt buộc'),

  body('password')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu mới')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu mới'),

  handleValidationErrors,
];

/**
 * Validate Update Password
 */
export const validateUpdatePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu hiện tại'),

  body('newPassword')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu mới')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),

  body('confirmNewPassword')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu mới'),

  handleValidationErrors,
];