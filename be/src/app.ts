import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import './config/passport';
import passport from 'passport';
import contractRoutes from './routes/contract.routes';
import adminRoutes from './routes/admin.routes';
// Import Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import enterpriseRoutes from './routes/enterprise.routes';
import escrowRoutes from './routes/escrow.routes';
import weatherRoutes from './routes/weather.routes';
import disputeRoutes from './routes/dispute.routes';
import walletRoutes from './routes/wallet.routes';
import notificationRoutes from './routes/notification.routes';
import messagingRoutes from './routes/messaging.routes';
import partnerRatingRoutes from './routes/partner-rating.routes';
import aiRoutes from './routes/ai.routes';
// Import Config/Utils
import { isDatabaseConnected, isDatabaseUnavailableError, markDatabaseUnhealthy } from './config/database';
import { createLogger } from './utils/logger';
import { logError } from './services/systemLog.service';

const log = createLogger('App');
const API_PREFIX = process.env.API_PREFIX ?? '/api/v1';

const app: Application = express();

// Khi deploy sau reverse proxy/load balancer, bật TRUST_PROXY (vd: 1) để req.ip
// và express-rate-limit dùng đúng IP client. Không tự bật mặc định vì nếu server
// bị expose trực tiếp thì tin X-Forwarded-For từ client sẽ làm yếu rate limit.
const trustProxyEnv = process.env.TRUST_PROXY?.trim();
if (trustProxyEnv) {
  const numeric = Number(trustProxyEnv);
  app.set('trust proxy', Number.isInteger(numeric) && numeric >= 0 ? numeric : trustProxyEnv);
}

// ══════════════════════════════════════════════════════
// 1. GLOBAL MIDDLEWARES (Phải đặt trước các Route)
// ══════════════════════════════════════════════════════
app.use(helmet()); // Security headers

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS?.split(',') ?? []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Body parsing (BẮT BUỘC ĐẶT TRƯỚC ROUTES)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());
// Thêm sau dòng app.use(cookieParser());
app.use(passport.initialize());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// ══════════════════════════════════════════════════════
// 2. DB HEALTH GUARD
// ══════════════════════════════════════════════════════
app.use(`${API_PREFIX}`, (req: Request, res: Response, next: NextFunction) => {
  // Weather không phụ thuộc SQL. Logout phải luôn hoạt động để người dùng có thể
  // xóa phiên phía trình duyệt ngay cả khi Azure SQL đang gián đoạn.
  const bypassDatabaseGuard =
    req.path.startsWith('/weather') ||
    req.path.startsWith('/ai/public') ||
    req.path === '/auth/logout';

  if (bypassDatabaseGuard) return next();

  if (!isDatabaseConnected()) {
    res.setHeader('Retry-After', '5');
    return res.status(503).json({
      success: false,
      status: 'error',
      code: 'DATABASE_UNAVAILABLE',
      message: 'Kết nối dữ liệu đang tạm thời gián đoạn. Dữ liệu của bạn không bị xóa, vui lòng thử lại sau.',
    });
  }
  next();
});

// ══════════════════════════════════════════════════════
// 2b. API ERROR LOGGING — bọc res.json để tự động ghi mọi response lỗi 5xx
// vào bảng SystemLogs, không cần sửa từng controller. res.locals.apiError
// (nếu có, gán bởi Global Error Handler bên dưới) cung cấp stack trace đầy đủ.
// ══════════════════════════════════════════════════════
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = ((body?: any) => {
    if (res.statusCode >= 500) {
      const err = res.locals.apiError;
      logError({
        category: 'api',
        action: `${req.method} ${req.baseUrl}${req.route?.path || req.path}`,
        message: body?.message || err?.message || 'Loi API khong xac dinh',
        userId: (req as any).user?.id,
        metadata: { statusCode: res.statusCode, url: req.originalUrl },
        ipAddress: req.ip,
        error: err,
      });
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
});

// ══════════════════════════════════════════════════════
// 3. ROUTES
// ══════════════════════════════════════════════════════
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'PreOnic API is running',
    timestamp: new Date().toISOString(),
  });
});

// Gắn các route vào đây
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/enterprise`, enterpriseRoutes);
app.use(`${API_PREFIX}/escrow`, escrowRoutes);
app.use(`${API_PREFIX}/weather`, weatherRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
// Các route khác bạn sẽ mở comment và thêm vào sau...
app.use(`${API_PREFIX}/disputes`, disputeRoutes);
// Wallet
app.use(`${API_PREFIX}/wallet`, walletRoutes);
// Notifications
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
// Messaging
app.use(`${API_PREFIX}/messaging`, messagingRoutes);
// Partner ratings
app.use(`${API_PREFIX}/partner-ratings`, partnerRatingRoutes);
// Public AI + AI theo vai trò (mở rộng ở các giai đoạn tiếp theo)
app.use(`${API_PREFIX}/ai`, aiRoutes);
// ══════════════════════════════════════════════════════
// 4. ERROR HANDLING (Phải đặt sau cùng)
// ══════════════════════════════════════════════════════

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 'error',
    message: `Route not found`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const databaseUnavailable = isDatabaseUnavailableError(err);
  const status = databaseUnavailable ? 503 : (err.statusCode ?? err.status ?? 500);
  const isClientSafe = status >= 400 && status < 500;
  const message = databaseUnavailable
    ? 'Kết nối dữ liệu đang tạm thời gián đoạn. Dữ liệu của bạn không bị xóa, vui lòng thử lại sau.'
    : isClientSafe
      ? (err.message ?? 'Yêu cầu không hợp lệ')
      : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';

  if (databaseUnavailable) {
    markDatabaseUnhealthy(err);
    res.setHeader('Retry-After', '5');
  }

  log.error(`[${status}] ${message}`);
  res.locals.apiError = err;

  res.status(status).json({
    success: false,
    status: 'error',
    ...(databaseUnavailable && { code: 'DATABASE_UNAVAILABLE' }),
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;