import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { assertStrongPassword } from '../utils/password.util';
import { cleanupUploadedFiles } from './uploads.middlewares';

// SQL Server sinh cac cot uniqueidentifier bang NEWSEQUENTIALID() (xem
// @PrimaryGeneratedColumn('uuid') tren cac entity), khong phai UUID v4 chuan
// RFC4122 -- cac nibble version/variant khong dam bao dung dinh dang [1-8]/[89ab]
// nen KHONG dung express-validator isUUID() (qua chat, se loai bo ca id that trong DB).
// Chi kiem tra dung khuon dang 8-4-4-4-12 hex.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    // Multipart middleware có thể đã upload file trước khi express-validator chạy.
    // Dọn các asset của request lỗi để tránh orphan file trên Cloudinary.
    void cleanupUploadedFiles(req);
    const errorMessages = errors.array().map((err) => err.msg);
    if (process.env.NODE_ENV === 'development') {
      console.warn('Validation errors:', errorMessages);
    }
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

  body('province')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng chọn tỉnh / thành phố')
    .isLength({ max: 100 })
    .withMessage('Tỉnh / thành phố không hợp lệ'),

  body('district')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng chọn quận / huyện')
    .isLength({ max: 100 })
    .withMessage('Quận / huyện không hợp lệ'),

  body('ward')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Xã / phường / thị trấn không hợp lệ'),

  body('password')
    .notEmpty()
    .withMessage('Vui lòng nhập mật khẩu')
    .custom((value) => assertStrongPassword(value, 'Mật khẩu')),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      return true;
    }),

  body('role')
    .notEmpty()
    .withMessage('Vui lòng chọn vai trò')
    .isIn(['farmer', 'enterprise'])
    .withMessage('Vai trò phải là "farmer" hoặc "enterprise"'),

  body('agreeTerms')
    .custom((value) => value === true || value === 'true')
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
  body('role')
    .notEmpty()
    .withMessage('Vui lòng chọn vai trò')
    .isIn(['farmer', 'enterprise'])
    .withMessage('Vai trò phải là farmer hoặc enterprise'),

  handleValidationErrors,
];

export const validateResendVerification = [
  body('emailOrPhone')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập email hoặc số điện thoại'),

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
    .custom((value) => assertStrongPassword(value, 'Mật khẩu mới')),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Vui lòng xác nhận mật khẩu mới')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      return true;
    }),

  // Bắt buộc kết thúc chuỗi validator bằng middleware này. Nếu thiếu,
  // express-validator chỉ ghi lỗi vào req nhưng request vẫn đi xuống controller.
  handleValidationErrors,
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
    .withMessage('Tên phải từ 1-100 ký tự')
    .matches(/^[^\d0-9]+$/)
    .withMessage('Tên không được chứa số'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Họ không được để trống')
    .isLength({ min: 1, max: 100 })
    .withMessage('Họ phải từ 1-100 ký tự')
    .matches(/^[^\d0-9]+$/)
    .withMessage('Họ không được chứa số'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại không được chứa chữ và phải có 10-11 chữ số'),

  body('avatar')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Avatar không hợp lệ'),

  body('province')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tỉnh / thành phố không hợp lệ'),

  body('district')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Quận / huyện không hợp lệ'),

  body('ward')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Xã / phường / thị trấn không hợp lệ'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Địa chỉ không được vượt quá 500 ký tự'),

  body('farmName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Tên trang trại không được vượt quá 255 ký tự'),

  body('farmSize')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d+(\.\d+)?$/)
    .withMessage('Diện tích trang trại không được chứa chữ')
    .isFloat({ min: 0 })
    .withMessage('Diện tích trang trại phải là số không âm'),

  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Tên doanh nghiệp không được vượt quá 255 ký tự'),

  body('taxCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Mã số thuế không được vượt quá 20 ký tự'),

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
    .custom((value) => assertStrongPassword(value, 'Mật khẩu mới')),

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

const PRODUCT_CATEGORY_VALUES = ['fruit', 'vegetable', 'rice', 'coffee', 'tea', 'spice', 'grain', 'other'];
const PRODUCT_REGION_VALUES = ['north', 'central', 'south'];
const PRODUCT_TYPE_VALUES = ['fresh', 'dried', 'processed'];
const PRODUCT_SORT_VALUES = ['default', 'price_asc', 'price_desc', 'rating', 'name'];

export const validatePublicProductList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Giới hạn sản phẩm không hợp lệ'),
  query('category').optional({ values: 'falsy' }).isIn(PRODUCT_CATEGORY_VALUES).withMessage('Loại nông sản không hợp lệ'),
  query('region').optional({ values: 'falsy' }).isIn(PRODUCT_REGION_VALUES).withMessage('Vùng miền không hợp lệ'),
  query('type').optional({ values: 'falsy' }).isIn(PRODUCT_TYPE_VALUES).withMessage('Hình thức sản phẩm không hợp lệ'),
  query('sort').optional().isIn(PRODUCT_SORT_VALUES).withMessage('Kiểu sắp xếp không hợp lệ'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm quá dài'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Giá tối thiểu không hợp lệ'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Giá tối đa không hợp lệ'),
  handleValidationErrors,
];

export const validateFarmerProductList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Giới hạn sản phẩm không hợp lệ'),
  query('category').optional({ values: 'falsy' }).isIn(PRODUCT_CATEGORY_VALUES).withMessage('Loại nông sản không hợp lệ'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm quá dài'),
  query('includeSummary').optional().isIn(['true', 'false']).withMessage('Tham số tổng hợp không hợp lệ'),
  handleValidationErrors,
];

export const validateRegionProductList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Giới hạn sản phẩm không hợp lệ'),
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

  body('coverageRate')
    .optional({ checkFalsy: false })
    .isInt({ min: 0, max: 100 })
    .withMessage('Tỉ lệ bao tiêu phải là số nguyên từ 0 đến 100'),

  body('plantDate')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập ngày gieo trồng (*)')
    .isISO8601()
    .withMessage('Ngày gieo trồng không hợp lệ'),

  body('expectedDate')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập ngày thu hoạch dự kiến (*)')
    .isISO8601()
    .withMessage('Ngày thu hoạch không hợp lệ')
    .custom((value, { req }) => {
      const normalize = (input: string | Date) => {
        const d = new Date(input);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const harvestDate = normalize(value);
      const today = normalize(new Date());

      if (harvestDate < today) {
        throw new Error('Ngày thu hoạch không được trước ngày hiện tại');
      }

      if (req.body.plantDate && !isNaN(Date.parse(req.body.plantDate))) {
        const plantDate = normalize(req.body.plantDate);
        if (harvestDate < plantDate) {
          throw new Error('Ngày thu hoạch không được trước ngày gieo trồng');
        }
      }

      return true;
    }),

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


/**
 * Validate Product GUID params.
 * SQL Server uniqueidentifier của dự án không đảm bảo UUID version nibble,
 * nên dùng GUID_REGEX thay vì isUUID().
 */
export const validateProductIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã sản phẩm không hợp lệ'),
  handleValidationErrors,
];

/**
 * Validate Update Product (multipart/form-data).
 * Tất cả field đều optional vì PUT hiện hỗ trợ cập nhật từng phần, nhưng field
 * nào xuất hiện thì phải đúng kiểu/range để không đẩy NaN/enum rác xuống SQL.
 */
export const validateUpdateProduct = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tên sản phẩm không được để trống')
    .isLength({ min: 2, max: 255 })
    .withMessage('Tên sản phẩm phải từ 2-255 ký tự'),

  body('category')
    .optional()
    .isIn(['fruit', 'vegetable', 'rice', 'coffee', 'tea', 'spice', 'grain', 'other'])
    .withMessage('Loại nông sản không hợp lệ'),

  body('region')
    .optional()
    .isIn(['north', 'central', 'south'])
    .withMessage('Vùng miền không hợp lệ'),

  body('type')
    .optional()
    .isIn(['fresh', 'dried', 'processed'])
    .withMessage('Hình thức không hợp lệ'),

  body('variety')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Giống nông sản không được vượt quá 200 ký tự'),

  body('area')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Diện tích phải là số không âm'),

  body('priceMin')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Giá tối thiểu phải là số không âm'),

  body('priceMax')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Giá tối đa phải là số không âm')
    .custom((value, { req }) => {
      if (req.body.priceMin !== undefined && req.body.priceMin !== '') {
        const min = Number(req.body.priceMin);
        const max = Number(value);
        if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
          throw new Error('Giá tối đa không được nhỏ hơn giá tối thiểu');
        }
      }
      return true;
    }),

  body('unit')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Đơn vị sản lượng không được vượt quá 50 ký tự'),

  body('priceUnit')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Đơn vị giá không được vượt quá 50 ký tự'),

  body('totalQuantity')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Tổng số lượng phải là số không âm'),

  body('coverageRate')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Tỉ lệ bao tiêu phải là số nguyên từ 0 đến 100'),

  body('plantDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Ngày gieo trồng không hợp lệ'),

  body('expectedDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Ngày thu hoạch không hợp lệ')
    .custom((value, { req }) => {
      if (req.body.plantDate && !isNaN(Date.parse(req.body.plantDate))) {
        const plantDate = new Date(req.body.plantDate);
        const harvestDate = new Date(value);
        plantDate.setHours(0, 0, 0, 0);
        harvestDate.setHours(0, 0, 0, 0);
        if (harvestDate < plantDate) {
          throw new Error('Ngày thu hoạch không được trước ngày gieo trồng');
        }
      }
      return true;
    }),

  body('badge')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nhãn sản phẩm không được vượt quá 100 ký tự'),

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

  body('existingCertifications')
    .optional({ checkFalsy: true })
    .custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        throw new Error('Danh sách chứng chỉ hiện có không hợp lệ');
      }
    }),

  handleValidationErrors,
];


/**
 * Validate Product Review (Enterprise -> Product).
 */
export const validateProductReview = [
  body('rating')
    .notEmpty()
    .withMessage('Vui lòng chọn số sao đánh giá')
    .isInt({ min: 1, max: 5 })
    .withMessage('Đánh giá phải là số nguyên từ 1 đến 5 sao'),

  body('text')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Nhận xét không được vượt quá 2000 ký tự'),

  handleValidationErrors,
];

/**
 * Validate Partner Rating (Farmer <-> Enterprise).
 * Bộ tiêu chí cụ thể theo role tiếp tục được service kiểm tra vì req.user
 * chỉ tồn tại sau middleware protect.
 */
export const validateCreatePartnerRating = [
  body('contractId')
    .notEmpty()
    .withMessage('Vui lòng chọn hợp đồng')
    .matches(GUID_REGEX)
    .withMessage('Mã hợp đồng không hợp lệ'),

  body('revieweeId')
    .notEmpty()
    .withMessage('Vui lòng chọn đối tác')
    .matches(GUID_REGEX)
    .withMessage('Mã đối tác không hợp lệ'),

  body('criteria')
    .isObject()
    .withMessage('Bộ tiêu chí đánh giá không hợp lệ'),

  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập nhận xét')
    .isLength({ max: 2000 })
    .withMessage('Nhận xét không được vượt quá 2000 ký tự'),

  handleValidationErrors,
];

/* ============================================================
 * Contract validation
 * Matches contract.controller.ts (buildDto) + contract.service.ts business rules
 * ============================================================ */

const CONTRACT_PAYMENT_TERMS = ['50_50', '30_70', '100_delivery', '100_upfront', 'custom'];
const CONTRACT_STATUSES = [
  'draft',
  'pending',
  'approved',
  'active',
  'cancel_pending',
  'completed',
  'cancelled',
  'disputed',
];
const CONTRACT_SORT_FIELDS = ['createdAt', 'updatedAt', 'deliveryDate', 'totalValue', 'status'];

export const validateContractIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã hợp đồng không hợp lệ'),

  handleValidationErrors,
];

// Bat buoc cac truong bao hiem (tru dieu khoan chia se rui ro) khi nguoi dung
// bat cong tac bao hiem o FE (EnterpriseCreateContract.jsx) hoac goi API truc
// tiep voi insuranceEnabled=true.
const isInsuranceRequested = (req: any): boolean =>
  req.body?.insuranceEnabled === true ||
  req.body?.insuranceEnabled === 'true' ||
  Boolean(req.body?.insuranceEnterprise);

/**
 * Validate Create Contract
 * Chấp nhận cả field phẳng (productId, quantity...) lẫn dạng lồng
 * (insuranceEnterprise.*) mà FE hiện dùng -- xem buildDto() trong contract.controller.ts
 */
export const validateCreateContract = [
  body('productId')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng chọn sản phẩm')
    .matches(GUID_REGEX)
    .withMessage('Mã sản phẩm không hợp lệ'),

  body('quantity')
    .notEmpty()
    .withMessage('Vui lòng nhập số lượng')
    .isFloat({ gt: 0 })
    .withMessage('Số lượng phải lớn hơn 0'),

  body('pricePerUnit')
    .notEmpty()
    .withMessage('Vui lòng nhập đơn giá')
    .isFloat({ gt: 0 })
    .withMessage('Đơn giá phải lớn hơn 0'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Đơn vị tính không hợp lệ'),

  body('paymentTerms')
    .notEmpty()
    .withMessage('Vui lòng chọn điều khoản thanh toán')
    .isIn(CONTRACT_PAYMENT_TERMS)
    .withMessage('Điều khoản thanh toán không hợp lệ'),

  body('deliveryDate')
    .notEmpty()
    .withMessage('Vui lòng chọn ngày giao hàng')
    .isISO8601()
    .withMessage('Ngày giao hàng không hợp lệ')
    .custom((value) => {
      // Business timezone của hệ thống là Việt Nam (UTC+7). So sánh theo date-key
      // để deployment chạy UTC cũng không cho phép tạo hợp đồng giao trong hôm nay/quá khứ.
      const vietnamToday = new Date(Date.now() + 7 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const deliveryDate = String(value).slice(0, 10);
      if (deliveryDate <= vietnamToday) {
        throw new Error('Ngày giao hàng phải sau ngày hiện tại');
      }
      return true;
    }),

  body('deliveryAddress')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập địa chỉ giao hàng')
    .isLength({ max: 500 })
    .withMessage('Địa chỉ giao hàng không được vượt quá 500 ký tự'),

  body('farmLocation')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Vị trí nông trại không được vượt quá 500 ký tự'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Ghi chú không được vượt quá 2000 ký tự'),

  // Tương thích với FE cũ từng gửi nhầm notes dưới tên qualityRequirements.
  body('qualityRequirements')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Ghi chú không được vượt quá 2000 ký tự'),

  body('depositPercentage')
    .custom((value, { req }) => {
      const paymentTerms = req.body?.paymentTerms;
      const isEmpty = value === undefined || value === null || String(value).trim() === '';

      if (paymentTerms === 'custom' && isEmpty) {
        throw new Error('Vui lòng nhập tỷ lệ đặt cọc tùy chỉnh');
      }
      if (isEmpty) return true;

      const percentage = Number(value);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        throw new Error('Tỷ lệ đặt cọc phải nằm trong khoảng 0-100');
      }

      // Với các điều khoản chuẩn, backend tự quyết định tỷ lệ. Nếu client vẫn gửi
      // một giá trị khác, trả 400 thay vì âm thầm lưu dữ liệu mâu thuẫn.
      const expected: Record<string, number> = {
        '50_50': 50,
        '30_70': 30,
        '100_delivery': 0,
        '100_upfront': 100,
      };
      if (
        paymentTerms !== 'custom' &&
        expected[paymentTerms] !== undefined &&
        Math.abs(percentage - expected[paymentTerms]) > 0.01
      ) {
        throw new Error('Tỷ lệ đặt cọc không khớp với điều khoản thanh toán');
      }

      return true;
    }),

  body('insuranceEnabled')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái bảo hiểm không hợp lệ'),

  body('insuranceProvider')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Đơn vị bảo hiểm không hợp lệ'),

  body('insurancePackage')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Gói bảo hiểm không hợp lệ'),

  body('insuranceFee')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Phí bảo hiểm phải là số không âm'),

  body(['insuranceEnterprise.insuredValue', 'insuredValue'])
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Giá trị bảo hiểm phải là số không âm'),

  body(['insuranceEnterprise.insuranceCompany', 'insuranceEnterprise.policyNumber'])
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Thông tin bảo hiểm không hợp lệ'),

  body(['insuranceEnterprise.validFrom', 'insuranceValidFrom'])
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Ngày bắt đầu hiệu lực bảo hiểm không hợp lệ'),

  body(['insuranceEnterprise.validTo', 'insuranceValidTo'])
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Ngày hết hạn bảo hiểm không hợp lệ')
    .custom((value, { req }) => {
      const from = req.body?.insuranceEnterprise?.validFrom ?? req.body?.insuranceValidFrom;
      if (from && !isNaN(Date.parse(from)) && new Date(value) < new Date(from)) {
        throw new Error('Ngày hết hạn bảo hiểm không được trước ngày bắt đầu hiệu lực');
      }
      return true;
    }),

  // Khi da bat cong tac bao hiem, tat ca cac truong sau la bat buoc -- CHI TRU
  // insuranceRiskSharingTerms (dieu khoan chia se rui ro, van la tuy chon).
  body(['insuranceEnterprise.insuranceCompany', 'insuranceProvider'])
    .custom((value, { req }) => {
      if (!isInsuranceRequested(req)) return true;
      const company = req.body?.insuranceEnterprise?.insuranceCompany ?? req.body?.insuranceProvider;
      if (!String(company || '').trim()) {
        throw new Error('Vui lòng nhập tên công ty bảo hiểm');
      }
      return true;
    }),

  body('insuranceEnterprise.policyNumber')
    .custom((value, { req }) => {
      if (isInsuranceRequested(req) && !String(value || '').trim()) {
        throw new Error('Vui lòng nhập số hợp đồng bảo hiểm');
      }
      return true;
    }),

  body(['insuranceEnterprise.insuredValue', 'insuredValue'])
    .custom((value, { req }) => {
      if (!isInsuranceRequested(req)) return true;
      const raw = req.body?.insuranceEnterprise?.insuredValue ?? req.body?.insuredValue;
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        throw new Error('Vui lòng nhập giá trị được bảo hiểm');
      }
      if (!/^\d+(\.\d+)?$/.test(String(raw).trim())) {
        throw new Error('Giá trị được bảo hiểm phải là số và không được là số âm');
      }
      return true;
    }),

  body('insuranceEnterprise.coveredEvents')
    .custom((value, { req }) => {
      if (isInsuranceRequested(req) && !String(value || '').trim()) {
        throw new Error('Vui lòng chọn sự kiện được bảo hiểm');
      }
      return true;
    }),

  body(['insuranceEnterprise.validFrom', 'insuranceValidFrom'])
    .custom((value, { req }) => {
      const from = req.body?.insuranceEnterprise?.validFrom ?? req.body?.insuranceValidFrom;
      if (isInsuranceRequested(req) && !from) {
        throw new Error('Vui lòng chọn ngày hiệu lực bảo hiểm (từ ngày)');
      }
      return true;
    }),

  body(['insuranceEnterprise.validTo', 'insuranceValidTo'])
    .custom((value, { req }) => {
      const to = req.body?.insuranceEnterprise?.validTo ?? req.body?.insuranceValidTo;
      if (isInsuranceRequested(req) && !to) {
        throw new Error('Vui lòng chọn ngày hiệu lực bảo hiểm (đến ngày)');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateCancelContract = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập lý do hủy hợp đồng')
    .isLength({ min: 5, max: 500 })
    .withMessage('Lý do hủy hợp đồng phải từ 5-500 ký tự'),

  handleValidationErrors,
];

export const validateRejectContract = [
  body('reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Lý do từ chối không được vượt quá 500 ký tự'),

  handleValidationErrors,
];

export const validateListContracts = [
  query('status')
    .optional()
    .custom((value) => {
      const statuses = String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const invalid = statuses.find((status) => !CONTRACT_STATUSES.includes(status));
      if (invalid) throw new Error(`Trạng thái hợp đồng không hợp lệ: ${invalid}`);
      return true;
    }),

  query('sort')
    .optional()
    .isIn(CONTRACT_SORT_FIELDS)
    .withMessage('Trường sắp xếp không hợp lệ'),

  query('order')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('Thứ tự sắp xếp không hợp lệ'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Số trang không hợp lệ'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn số bản ghi không hợp lệ'),

  handleValidationErrors,
];

/* ============================================================
 * Escrow validation
 * Matches escrow.controller.ts + escrow.service.ts business rules
 * ============================================================ */

const ESCROW_STATUSES = ['pending', 'active', 'completed', 'disputed', 'refunded'];

export const validateListEscrows = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Giới hạn ký quỹ không hợp lệ'),
  query('status').optional().isIn(ESCROW_STATUSES).withMessage('Trạng thái ký quỹ không hợp lệ'),
  query('contractIds')
    .optional()
    .custom((value) => {
      const ids = String(value).split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 50) throw new Error('Chỉ được truy vấn tối đa 50 hợp đồng mỗi lần');
      if (ids.some((id) => !GUID_REGEX.test(id))) throw new Error('Danh sách mã hợp đồng không hợp lệ');
      return true;
    }),
  handleValidationErrors,
];

export const validateEscrowContractIdParam = [
  param('contractId').matches(GUID_REGEX).withMessage('Mã hợp đồng không hợp lệ'),

  handleValidationErrors,
];

export const validateConfirmMilestone = [
  param('contractId').matches(GUID_REGEX).withMessage('Mã hợp đồng không hợp lệ'),

  param('step')
    .isInt({ min: 1, max: 5 })
    .withMessage('Mốc thanh toán không hợp lệ'),

  body('evidence')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Minh chứng không được vượt quá 1000 ký tự'),

  handleValidationErrors,
];


export const validateUserIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã người dùng không hợp lệ'),

  handleValidationErrors,
];

/* ============================================================
 * Dispute validation
 * Matches dispute.controller.ts + dispute.service.ts business rules
 * ============================================================ */

const DISPUTE_STATUSES = ['open', 'under_review', 'resolved'];

export const validateDisputeIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã tranh chấp không hợp lệ'),

  handleValidationErrors,
];

// Ap dung SAU multer (uploadDisputeFiles) tren route POST /disputes vi req.body
// chi duoc dien khi multer da parse xong multipart/form-data.
export const validateCreateDispute = [
  body('contractId')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng chọn hợp đồng cần tạo tranh chấp')
    .matches(GUID_REGEX)
    .withMessage('Mã hợp đồng không hợp lệ'),

  body('milestoneStep')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 5 })
    .withMessage('Mốc milestone không hợp lệ'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng nhập mô tả tranh chấp')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Mô tả tranh chấp phải từ 10-2000 ký tự'),

  body('evidenceUrls')
    .optional()
    .custom((value) => {
      let items: unknown[];
      if (Array.isArray(value)) {
        items = value;
      } else {
        try {
          const parsed = JSON.parse(value);
          items = Array.isArray(parsed) ? parsed : String(value).split(',');
        } catch {
          items = String(value).split(',');
        }
      }

      if (items.length > 10) {
        throw new Error('Chỉ được đính kèm tối đa 10 đường dẫn minh chứng');
      }
      if (items.some((item) => String(item).trim().length > 1000)) {
        throw new Error('Đường dẫn minh chứng không hợp lệ');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateListDisputes = [
  query('status')
    .optional()
    .isIn(DISPUTE_STATUSES)
    .withMessage('Trạng thái tranh chấp không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Số bản ghi mỗi trang phải từ 1 đến 50'),

  handleValidationErrors,
];

// Dung cho admin.routes.ts (PATCH /admin/disputes/:id/resolve)
export const validateResolveDispute = [
  param('id').matches(GUID_REGEX).withMessage('Mã tranh chấp không hợp lệ'),

  body('resolution')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng chọn phán quyết')
    .isIn(['farmer', 'enterprise'])
    .withMessage('Phán quyết không hợp lệ'),

  body('adminNotes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Ghi chú của quản trị viên không được vượt quá 2000 ký tự'),

  handleValidationErrors,
];
/* ============================================================
 * Generic API hardening validators (Fix 07)
 * ============================================================ */

export const validateConversationIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã hội thoại không hợp lệ'),
  handleValidationErrors,
];

export const validateMessagingList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Giới hạn dữ liệu hội thoại không hợp lệ'),
  query('since').optional().isISO8601().withMessage('Mốc thời gian đồng bộ tin nhắn không hợp lệ'),
  handleValidationErrors,
];

export const validateStartConversation = [
  body('partnerId')
    .trim()
    .notEmpty()
    .withMessage('Vui lòng chọn đối tác cần nhắn tin')
    .matches(GUID_REGEX)
    .withMessage('Mã đối tác không hợp lệ'),
  handleValidationErrors,
];

export const validateSendMessage = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Nội dung tin nhắn không được để trống')
    .isLength({ max: 4000 })
    .withMessage('Tin nhắn quá dài (tối đa 4000 ký tự)'),
  handleValidationErrors,
];

export const validateNotificationIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã thông báo không hợp lệ'),
  handleValidationErrors,
];

export const validateNotificationList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Giới hạn thông báo không hợp lệ'),
  query('isRead').optional().isIn(['true', 'false']).withMessage('Bộ lọc trạng thái đọc không hợp lệ'),
  handleValidationErrors,
];

export const validateWeatherAlertIdParam = [
  param('id').matches(GUID_REGEX).withMessage('Mã cảnh báo thời tiết không hợp lệ'),
  handleValidationErrors,
];

export const validateSupplierFarmerIdParam = [
  param('farmerId').matches(GUID_REGEX).withMessage('Mã nhà cung cấp không hợp lệ'),
  handleValidationErrors,
];


export const validateSupplierList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Giới hạn nhà cung cấp không hợp lệ'),
  handleValidationErrors,
];

export const validateSystemLogIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Mã nhật ký hệ thống không hợp lệ'),
  handleValidationErrors,
];

export const validateProductRegionParam = [
  param('region').isIn(['north', 'central', 'south']).withMessage('Vùng miền không hợp lệ'),
  handleValidationErrors,
];
