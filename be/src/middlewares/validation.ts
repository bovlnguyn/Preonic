import { Request, Response, NextFunction } from 'express';

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, phone, password, confirmPassword, role, agreeTerms } = req.body;

  // 1. Kiểm tra các trường bắt buộc
  if (!email || !password || !confirmPassword || !role || !firstName || !lastName || !agreeTerms) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các trường bắt buộc.' });
  }

  // 2. Validate Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Định dạng email không hợp lệ.' });
  }

  // 3. Validate Mật khẩu (Ít nhất 6 ký tự, có thể thêm regex để yêu cầu độ phức tạp)
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp.' });
  }

  // 4. Validate Số điện thoại (Nếu có nhập)
  if (phone) {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (cần 10-11 chữ số).' });
    }
  }

  // 5. Validate Role
  if (!['farmer', 'enterprise'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Vai trò người dùng không hợp lệ.' });
  }

  // 6. Validate Điều khoản
  if (agreeTerms !== true) {
    return res.status(400).json({ success: false, message: 'Bạn cần đồng ý với các điều khoản sử dụng.' });
  }
  
  next();
};