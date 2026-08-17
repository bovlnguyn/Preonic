import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import {
  PUBLIC_AI_COOKIE_NAME,
  PUBLIC_AI_LIMIT,
  createFarmerAiReply,
  createPublicAiReply,
  getPublicAiCookieOptions,
  getRemainingQuestions,
  readGuestUsage,
  sanitizeFarmerHistory,
  sanitizeFarmerMessage,
  sanitizePublicHistory,
  sanitizePublicMessage,
  signGuestUsage,
  FarmerNavigationIntent,
  FarmerNavigationTarget,
} from '../services/ai.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { getMe as getAuthenticatedUser } from '../services/auth.service';
import {
  getCurrentWeatherForProvince,
  getDailyForecastForProvince,
  getProvinceCoordsMap,
} from '../services/weather.service';
import * as contractService from '../services/contract.service';
import * as productService from '../services/product.service';

const writeGuestCookie = (res: Response, usage: ReturnType<typeof readGuestUsage>) => {
  res.cookie(
    PUBLIC_AI_COOKIE_NAME,
    signGuestUsage(usage),
    getPublicAiCookieOptions()
  );
};


const normalizeAiText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const WEATHER_KEYWORDS = [
  'thoi tiet',
  'nhiet do',
  'do am',
  'du bao',
  'khi hau',
  'luong mua',
  'troi mua',
  'mua lon',
  'mua nho',
  'co mua',
  'nang nong',
  'troi nang',
  'toc do gio',
  'gio manh',
  'bao so',
  'ap thap',
];

const isWeatherRelatedQuestion = (message: string): boolean => {
  const normalized = normalizeAiText(message);
  return WEATHER_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const WEATHER_LOCATION_ALIASES: Record<string, string> = {
  'sai gon': 'Ho Chi Minh',
  'tp hcm': 'Ho Chi Minh',
  'tphcm': 'Ho Chi Minh',
  'hcm': 'Ho Chi Minh',
  'ha noi': 'Ha Noi',
  'hanoi': 'Ha Noi',
  'da nang': 'Da Nang',
  'danang': 'Da Nang',
  'thua thien hue': 'Hue',
};

const findWeatherProvinceInMessage = (message: string): string | null => {
  const normalized = ` ${normalizeAiText(message)} `;

  for (const [alias, province] of Object.entries(WEATHER_LOCATION_ALIASES)) {
    if (normalized.includes(` ${alias} `)) return province;
  }

  const provinces = Object.keys(getProvinceCoordsMap())
    .sort((a, b) => b.length - a.length);

  for (const province of provinces) {
    const normalizedProvince = normalizeAiText(province);
    if (normalized.includes(` ${normalizedProvince} `)) return province;
  }

  return null;
};


type FarmerAiAction = {
  type: 'navigate' | 'open_chat';
  target: FarmerNavigationTarget;
  label: string;
  path?: string;
  partnerId?: string;
  partnerName?: string;
};

const FARMER_STATIC_NAVIGATION: Partial<Record<FarmerNavigationTarget, string>> = {
  dashboard: '/farmer',
  crops: '/farmer/crops',
  create_product: '/farmer/create-product',
  contracts: '/farmer/contracts',
  orders: '/farmer/orders',
  escrow: '/farmer/escrow',
  wallet: '/farmer/wallet',
  finance: '/farmer/finance',
  ratings: '/farmer/ratings',
  weather_insurance: '/farmer/weather-insurance',
  profile: '/profile',
  farmer_home: '/farmer-home',
  farmer_products: '/farmer-products',
  farmer_solutions: '/farmer-solutions',
  farmer_contact: '/farmer-contact',
};

const NAVIGATION_REQUEST_PATTERNS = [
  /\bmo\b/,
  /\bvao\b/,
  /dua toi/,
  /dan toi/,
  /chuyen toi/,
  /chuyen den/,
  /di toi/,
  /den trang/,
  /xem trang/,
  /xem hop dong/,
  /xem mua vu/,
  /xem san pham/,
];

const inferNavigationIntentsFromMessage = (message: string): FarmerNavigationIntent[] => {
  const normalized = normalizeAiText(message);
  const asksToNavigate = NAVIGATION_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
  if (!asksToNavigate) return [];

  const make = (
    target: FarmerNavigationTarget,
    label: string,
    entityQuery = ''
  ): FarmerNavigationIntent => ({ target, label, entityQuery });

  if (/hop dong/.test(normalized)) {
    return [make('contract_detail', 'Mở hợp đồng', message)];
  }
  if (/(mua vu|san pham|nong san)/.test(normalized)) {
    if (/(sua|chinh sua|cap nhat)/.test(normalized)) {
      return [make('edit_crop', 'Chỉnh sửa mùa vụ', message)];
    }
    if (/(dang ban|tao moi|them moi|mua vu moi)/.test(normalized)) {
      return [make('create_product', 'Đăng mùa vụ mới')];
    }
    return [make('crop_detail', 'Xem mùa vụ', message)];
  }
  if (/don hang|giao hang|van chuyen/.test(normalized)) {
    return [make('orders', 'Mở đơn hàng')];
  }
  if (/ky quy|escrow|giai ngan/.test(normalized)) {
    return [make('escrow', 'Mở thanh toán trung gian')];
  }
  if (/vi|thanh toan|so du/.test(normalized)) {
    return [make('wallet', 'Mở Ví & Thanh toán')];
  }
  if (/tai chinh|doanh thu|thu nhap/.test(normalized)) {
    return [make('finance', 'Mở trang Tài chính')];
  }
  if (/danh gia|uy tin|xep hang/.test(normalized)) {
    return [make('ratings', 'Mở Đánh giá đối tác')];
  }
  if (/thoi tiet|bao hiem|mua|bao|nhiet do/.test(normalized)) {
    return [make('weather_insurance', 'Mở Thời tiết & Bảo hiểm')];
  }
  if (/ho so|profile|tai khoan|thong tin ca nhan/.test(normalized)) {
    return [make('profile', 'Mở hồ sơ cá nhân')];
  }
  if (/tin nhan|nhan tin|chat|hoi thoai/.test(normalized)) {
    return [make('messages', 'Mở tin nhắn', message)];
  }
  if (/dashboard|tong quan|trang farmer/.test(normalized)) {
    return [make('dashboard', 'Về dashboard Farmer')];
  }

  return [];
};

const scoreNavigationCandidate = (query: string, values: Array<unknown>): number => {
  const normalizedQuery = normalizeAiText(query);
  if (!normalizedQuery) return 0;

  let best = 0;
  for (const rawValue of values) {
    const value = normalizeAiText(String(rawValue || ''));
    if (!value) continue;

    if (value === normalizedQuery) best = Math.max(best, 130);
    if (value.length >= 4 && normalizedQuery.includes(value)) best = Math.max(best, 110);
    if (normalizedQuery.length >= 4 && value.includes(normalizedQuery)) best = Math.max(best, 90);

    const tokens = value.split(' ').filter((token) => token.length >= 3);
    const matchedTokens = tokens.filter((token) => normalizedQuery.includes(token)).length;
    if (tokens.length > 0 && matchedTokens > 0) {
      best = Math.max(best, 35 + Math.round((matchedTokens / tokens.length) * 45));
    }
  }

  return best;
};

const resolveFarmerNavigationActions = async (
  userId: string,
  message: string,
  modelIntents: FarmerNavigationIntent[]
): Promise<FarmerAiAction[]> => {
  const inferredIntents = inferNavigationIntentsFromMessage(message);
  const intents = [...inferredIntents, ...modelIntents]
    .filter((intent, index, list) =>
      list.findIndex((candidate) => candidate.target === intent.target) === index
    )
    .slice(0, 2);

  if (intents.length === 0) return [];

  let contractListPromise: ReturnType<typeof contractService.listContractsForUser> | null = null;
  let cropListPromise: ReturnType<typeof productService.getByUser> | null = null;

  const getContracts = () => {
    if (!contractListPromise) {
      contractListPromise = contractService.listContractsForUser(userId, 'farmer', {
        page: 1,
        limit: 100,
      });
    }
    return contractListPromise;
  };

  const getCrops = () => {
    if (!cropListPromise) {
      cropListPromise = productService.getByUser(userId, { page: 1, limit: 100 });
    }
    return cropListPromise;
  };

  const actions: FarmerAiAction[] = [];

  for (const intent of intents) {
    if (actions.length >= 2) break;
    const label = intent.label?.trim().slice(0, 80) || 'Mở chức năng';

    if (intent.target === 'contract_detail') {
      try {
        const result = await getContracts();
        const query = intent.entityQuery || message;
        const ranked = result.contracts
          .map((contract: any) => ({
            contract,
            score: scoreNavigationCandidate(query, [
              contract.contractCode,
              contract.productName,
              contract.product?.name,
              contract.enterpriseName,
              contract.enterprise?.fullName,
              contract.enterprise?.name,
            ]),
          }))
          .sort((a, b) => b.score - a.score);

        if (ranked[0]?.score >= 55 && ranked[0]?.contract?.id) {
          actions.push({
            type: 'navigate',
            target: 'contract_detail',
            label: `Mở hợp đồng ${ranked[0].contract.contractCode || ''}`.trim(),
            path: `/farmer/contracts/${ranked[0].contract.id}`,
          });
          continue;
        }
      } catch {
        // AI vẫn trả lời bình thường; chỉ fallback về danh sách hợp đồng.
      }

      actions.push({
        type: 'navigate',
        target: 'contracts',
        label: label || 'Xem danh sách hợp đồng',
        path: '/farmer/contracts',
      });
      continue;
    }

    if (intent.target === 'crop_detail' || intent.target === 'edit_crop') {
      try {
        const result = await getCrops();
        const query = intent.entityQuery || message;
        const ranked = result.products
          .map((product: any) => ({
            product,
            score: scoreNavigationCandidate(query, [
              product.name,
              product.variety,
              product.farm,
              product.location,
              product.category,
            ]),
          }))
          .sort((a, b) => b.score - a.score);

        if (ranked[0]?.score >= 55 && ranked[0]?.product?.id) {
          const product = ranked[0].product;
          actions.push({
            type: 'navigate',
            target: intent.target,
            label: intent.target === 'edit_crop'
              ? `Chỉnh sửa ${product.name || 'mùa vụ'}`
              : `Xem ${product.name || 'mùa vụ'}`,
            path: intent.target === 'edit_crop'
              ? `/farmer/edit-product/${product.id}`
              : `/farmer/crops/${product.id}`,
          });
          continue;
        }
      } catch {
        // Fallback bên dưới.
      }

      actions.push({
        type: 'navigate',
        target: 'crops',
        label: 'Mở Mùa vụ của tôi',
        path: '/farmer/crops',
      });
      continue;
    }

    if (intent.target === 'messages') {
      let partnerId: string | undefined;
      let partnerName: string | undefined;

      if (intent.entityQuery?.trim()) {
        try {
          const result = await getContracts();
          const ranked = result.contracts
            .map((contract: any) => ({
              contract,
              score: scoreNavigationCandidate(intent.entityQuery, [
                contract.enterpriseName,
                contract.enterprise?.fullName,
                contract.enterprise?.name,
                contract.contractCode,
              ]),
            }))
            .sort((a, b) => b.score - a.score);

          const matched = ranked[0];
          if (matched?.score >= 55) {
            partnerId = matched.contract.enterpriseId || matched.contract.enterprise?.id;
            partnerName = matched.contract.enterpriseName || matched.contract.enterprise?.name;
          }
        } catch {
          // Mở danh sách chat chung nếu không resolve được đối tác.
        }
      }

      actions.push({
        type: 'open_chat',
        target: 'messages',
        label: partnerName ? `Nhắn tin ${partnerName}` : label || 'Mở tin nhắn',
        ...(partnerId ? { partnerId, partnerName } : {}),
      });
      continue;
    }

    const path = FARMER_STATIC_NAVIGATION[intent.target];
    if (path) {
      actions.push({
        type: 'navigate',
        target: intent.target,
        label,
        path,
      });
    }
  }

  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.type}:${action.path || action.partnerId || action.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildWeatherLiveContext = async (
  message: string,
  userId?: string
): Promise<string | null> => {
  if (!isWeatherRelatedQuestion(message)) return null;

  let province = findWeatherProvinceInMessage(message);
  let district: string | undefined;

  if (!province && userId) {
    try {
      const user = await getAuthenticatedUser(userId);
      province = user?.province?.trim() || null;
      district = user?.district?.trim() || undefined;
    } catch {
      // AI vẫn hoạt động nếu DB hồ sơ tạm gián đoạn; chỉ bỏ qua vị trí mặc định.
    }
  }

  if (!province) {
    return [
      'DỮ LIỆU THỜI TIẾT THỰC TẾ: chưa xác định được khu vực.',
      'Nếu câu hỏi cần thời tiết hiện tại, hãy đề nghị người dùng nêu tỉnh/thành hoặc khu vực cụ thể.',
      'Vẫn có thể trả lời kiến thức nông nghiệp chung liên quan đến thời tiết mà không bịa số liệu hiện tại.',
    ].join('\n');
  }

  try {
    const [current, forecast] = await Promise.all([
      getCurrentWeatherForProvince(province, district),
      getDailyForecastForProvince(province, district),
    ]);

    const forecastLines = forecast.slice(0, 5).map((item) =>
      `- ${item.date}: ${item.description}; ${Math.round(item.tempMin)}-${Math.round(item.tempMax)}°C; ` +
      `độ ẩm ${Math.round(item.humidity)}%; gió ${Math.round(item.windSpeed)} km/h; mưa ${Number(item.rain || 0).toFixed(1)} mm.`
    );

    return [
      'DỮ LIỆU THỜI TIẾT THỰC TẾ từ module Weather của PreOnic:',
      `- Khu vực: ${current.resolvedLocation || province}${district ? `, ${district}` : ''}.`,
      `- Hiện tại: ${Math.round(current.temp)}°C; ${current.description}; độ ẩm ${Math.round(current.humidity)}%; ` +
        `gió ${Math.round(current.windSpeed)} km/h; mưa 1h ${Number(current.rain1h || 0).toFixed(1)} mm; ` +
        `mưa 24h ${Number(current.rain24h || 0).toFixed(1)} mm.`,
      '- Dự báo gần nhất:',
      ...(forecastLines.length ? forecastLines : ['- Chưa có dữ liệu dự báo nhiều ngày.']),
      'Hãy dùng các số liệu này khi trả lời. Không được thay thế bằng số liệu tự suy đoán.',
    ].join('\n');
  } catch {
    return [
      `DỮ LIỆU THỜI TIẾT THỰC TẾ cho ${province}: hệ thống Weather hiện chưa lấy được dữ liệu trực tuyến.`,
      'Không bịa số liệu hiện tại. Có thể trả lời kiến thức nông nghiệp chung và nói rõ dữ liệu thời tiết trực tiếp đang tạm thiếu.',
    ].join('\n');
  }
};

export const getPublicAiStatus = asyncHandler(async (req: Request, res: Response) => {
  const usage = readGuestUsage(req.cookies?.[PUBLIC_AI_COOKIE_NAME]);
  writeGuestCookie(res, usage);

  res.status(200).json({
    success: true,
    data: {
      limit: PUBLIC_AI_LIMIT,
      answeredCount: usage.answeredCount,
      remainingQuestions: getRemainingQuestions(usage.answeredCount),
      limitReached: usage.answeredCount >= PUBLIC_AI_LIMIT,
    },
  });
});

export const publicAiChat = asyncHandler(async (req: Request, res: Response) => {
  const usage = readGuestUsage(req.cookies?.[PUBLIC_AI_COOKIE_NAME]);
  const remainingBefore = getRemainingQuestions(usage.answeredCount);

  if (remainingBefore <= 0) {
    writeGuestCookie(res, usage);
    return res.status(200).json({
      success: true,
      data: {
        answer:
          'Phiên dùng thử dành cho khách đã kết thúc. Hãy đăng nhập để tiếp tục với PreOnic AI đầy đủ theo đúng vai trò Farmer hoặc Enterprise.',
        requiresLogin: true,
        loginReason: 'limit',
        category: 'advanced',
        limit: PUBLIC_AI_LIMIT,
        answeredCount: usage.answeredCount,
        remainingQuestions: 0,
        limitReached: true,
      },
    });
  }

  const message = sanitizePublicMessage(req.body?.message);
  const history = sanitizePublicHistory(req.body?.history);
  const reply = await createPublicAiReply(message, history);

  // Câu hỏi chuyên sâu chỉ hiển thị cổng đăng nhập, không tiêu tốn một trong
  // 20 câu trả lời cơ bản của khách.
  if (reply.requiresLogin) {
    writeGuestCookie(res, usage);
    return res.status(200).json({
      success: true,
      data: {
        ...reply,
        loginReason: 'advanced',
        limit: PUBLIC_AI_LIMIT,
        answeredCount: usage.answeredCount,
        remainingQuestions: remainingBefore,
        limitReached: false,
      },
    });
  }

  usage.answeredCount += 1;
  writeGuestCookie(res, usage);

  const remainingQuestions = getRemainingQuestions(usage.answeredCount);

  return res.status(200).json({
    success: true,
    data: {
      ...reply,
      loginReason: remainingQuestions === 0 ? 'limit' : null,
      limit: PUBLIC_AI_LIMIT,
      answeredCount: usage.answeredCount,
      remainingQuestions,
      limitReached: remainingQuestions === 0,
      showLoginAfterAnswer: remainingQuestions === 0,
    },
  });
});


export const getFarmerAiStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      available: true,
      assistantName: 'PreOnic Farmer AI',
      specialties: [
        'Kiến thức & canh tác nông nghiệp',
        'Thời tiết & lựa chọn cây trồng',
        'Đăng bán nông sản',
        'Hợp đồng & ký quỹ',
        'Ví & giao dịch',
        'Chất lượng, ảnh & chứng chỉ',
      ],
      suggestedQuestions: [
        'Thời tiết Đà Nẵng hôm nay phù hợp với nhóm cây trồng nào?',
        'Tôi cần chuẩn bị những gì để đăng một mùa vụ mới?',
        'Đất dễ úng thì nên cải thiện thế nào trước khi xuống giống?',
        'Luồng ký hợp đồng trên PreOnic dành cho Farmer diễn ra ra sao?',
      ],
    },
  });
});

export const farmerAiChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const message = sanitizeFarmerMessage(req.body?.message);
  const history = sanitizeFarmerHistory(req.body?.history);
  const currentFeature = typeof req.body?.currentFeature === 'string'
    ? req.body.currentFeature.trim().slice(0, 120)
    : '';

  const liveContext = await buildWeatherLiveContext(message, req.user?.id);

  const reply = await createFarmerAiReply(
    {
      userName: req.user?.fullName || 'Farmer',
      currentFeature,
      liveContext,
    },
    message,
    history
  );

  const actions = await resolveFarmerNavigationActions(
    req.user!.id,
    message,
    reply.navigationIntents
  );

  return res.status(200).json({
    success: true,
    data: {
      answer: reply.answer,
      category: reply.category,
      actions,
    },
  });
});
