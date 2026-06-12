import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import jwt from 'jsonwebtoken';

export class AuthService {
  
  private static generateTokens(user: User) {
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }

  static async register(body: any) {
    const { firstName, lastName, email, phone, password, confirmPassword, role, agreeTerms, province, district, ward } = body;
    const userRepository = AppDataSource.getRepository(User);

    // 1. Kiểm tra logic đầu vào
    if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
    if (!agreeTerms) throw new Error('Vui lòng đồng ý với điều khoản sử dụng');

    // 2. Kiểm tra tồn tại
    const existingUser = await userRepository.findOneBy({ email: email.toLowerCase() });
    if (existingUser) throw new Error('Email đã được sử dụng');

    if (phone) {
      const existingPhone = await userRepository.findOneBy({ phone });
      if (existingPhone) throw new Error('Số điện thoại đã được sử dụng');
    }

    const isEnterprise = role === 'enterprise';

    // 3. Khởi tạo instance của User Entity
    const newUser = userRepository.create({
      email: email.toLowerCase(),
      password, // Mật khẩu này sẽ được hash ở bước sau
      role,
      firstName,
      lastName,
      phone,
      isVerified: !isEnterprise,
      province,
      district,
      ward
    });

    // 4. Gọi phương thức hashPassword từ Entity
    await newUser.hashPassword();

    // 5. Lưu user vào DB
    let user = await userRepository.save(newUser);

    // 6. Xử lý logic doanh nghiệp
    if (isEnterprise) {
      return { requiresVerification: true, email: user.email };
    }

    // 7. Tạo tokens cho người dùng thông thường
    const tokens = AuthService.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    
    // Cập nhật lại user với refreshToken đã lưu
    user = await userRepository.save(user);

    // 8. Trả về dữ liệu sạch (đã qua toJSON để loại bỏ field nhạy cảm)
    return { user: user.toJSON(), tokens };
  }
}