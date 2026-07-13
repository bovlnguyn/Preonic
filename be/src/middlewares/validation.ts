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
  .withMessage('Vui lòng nhập tên (*)')
  .isLength({ min: 1, max: 100 })
  .withMessage('Tên phải từ 1-100 ký tự')
  .matches(/^[^\d0-9]+$/)
  .withMessage('Tên không được chứa số'),

body('lastName')
  .trim()
  .notEmpty()
  .withMessage('Vui lòng nhập họ (*)')
  .isLength({ min: 1, max: 100 })
  .withMessage('Họ phải từ 1-100 ký tự')
  .matches(/^[^\d0-9]+$/)
  .withMessage('Họ không được chứa số'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập email (*)')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .toLowerCase(),

  body('phone')
  .trim()
  .notEmpty()
  .withMessage('Vui lòng nhập số điện thoại (*)')
  .matches(/^[0-9]{10,11}$/)
  .withMessage('Số điện thoại không được chứa chữ và phải có 10-11 chữ số'),


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

export const validateGoogleRegister = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập tên'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập họ'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .toLowerCase(),

  body('role')
    .notEmpty()
    .withMessage('Vui lòng chọn vai trò')
    .isIn(['farmer', 'enterprise'])
    .withMessage('Vai trò phải là farmer hoặc enterprise'),

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
    .withMessage('Vui lòng xác nhận mật khẩu mới')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      return true;
    }),
];

/**
 * Validate Update Profile
 */
export const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tên không được để trống')
    .isLength({ min: 1, max: 100 })
    .withMessage('Tên phải từ 1-100 ký tự'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Họ không được để trống')
    .isLength({ min: 1, max: 100 })
    .withMessage('Họ phải từ 1-100 ký tự'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),

  body('avatar')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Avatar không hợp lệ'),

  body('farmSize')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Diện tích trang trại phải là số không âm'),

  body('taxCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Mã số thuế không hợp lệ'),

  handleValidationErrors,
];

/**
 * Validate Update Password
 */
export const validateUpdatePassword = [
  // Optional: tài khoản Google lần đầu đặt mật khẩu sẽ không gửi trường này
  body('currentPassword')
    .optional(),

  body('newPassword')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu mới')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),

  body('confirmNewPassword')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu mới')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateCreateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên sản phẩm là bắt buộc')
    .isLength({ min: 2, max: 255 })
    .withMessage('Tên sản phẩm phải từ 2-255 ký tự'),

  body('category')
    .notEmpty()
    .withMessage('Vui lòng chọn loại nông sản')
    .isIn(['fruit', 'vegetable', 'rice', 'coffee', 'tea', 'spice', 'grain', 'other'])
    .withMessage('Loại nông sản không hợp lệ'),

  body('region')
    .notEmpty()
    .withMessage('Vui lòng chọn vùng miền')
    .isIn(['north', 'central', 'south'])
    .withMessage('Vùng miền không hợp lệ'),

  body('type')
    .notEmpty()
    .withMessage('Vui lòng chọn hình thức (tươi/khô/đã sơ chế)')
    .isIn(['fresh', 'dried', 'processed'])
    .withMessage('Hình thức không hợp lệ'),

  body('priceMin')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Giá tối thiểu phải là số không âm'),

  body('priceMax')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Giá tối đa phải là số không âm')
    .custom((value, { req }) => {
      const min = Number(req.body.priceMin);
      const max = Number(value);
      if (req.body.priceMin && max < min) {
        throw new Error('Giá tối đa không được nhỏ hơn giá tối thiểu');
      }
      return true;
    }),

  body('totalQuantity')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Tổng số lượng phải là số không âm'),

  body('expectedDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Ngày dự kiến không hợp lệ'),

  body('commitments')
    .optional({ checkFalsy: true })
    .custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        throw new Error('Danh sách cam kết không hợp lệ');
      }
    }),

  body('certificationNames')
    .optional({ checkFalsy: true })
    .custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        throw new Error('Danh sách chứng chỉ không hợp lệ');
      }
    }),

  handleValidationErrors,
];