import { Router } from 'express';
// 1. Kiểm tra chính xác đường dẫn đến controller (thường là controller/auth.controller)
// 2. Nếu trong auth.controller.ts bạn dùng "export class AuthController", thì dùng { AuthController }
import { AuthController } from '../controller/auth.controller';
import { validateRegister } from '../middlewares/validation';

const router = Router();

// Đảm bảo AuthController.register đã được định nghĩa là static async trong file controller
router.post('/register', validateRegister, AuthController.register);

export default router;