import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import {
  PUBLIC_AI_COOKIE_NAME,
  PUBLIC_AI_LIMIT,
  createFarmerAiReply,
  createEnterpriseAiReply,
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
  EnterpriseNavigationIntent,
  EnterpriseNavigationTarget,
  sanitizeEnterpriseHistory,
  sanitizeEnterpriseMessage,
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
import * as enterpriseService from '../services/enterprise.service';
import { getCashflowReport } from '../modules/direct-payment-v2/cashflow-report.service';

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
  billing: '/farmer/billing',
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
  if (/thanh toan|phi dich vu|tai khoan nhan tien|tai chinh|doanh thu|thu nhap/.test(normalized)) {
    return [make('billing', 'Mở Thanh toán & Phí')];
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

type EnterpriseAiAction = {
  type: 'navigate' | 'open_chat';
  target: EnterpriseNavigationTarget;
  label: string;
  path?: string;
  partnerId?: string;
  partnerName?: string;
};

const ENTERPRISE_STATIC_NAVIGATION: Partial<Record<EnterpriseNavigationTarget, string>> = {
  dashboard: '/enterprise',
  products: '/enterprise/products',
  contracts: '/enterprise/contracts',
  orders: '/enterprise/orders',
  billing: '/enterprise/billing',
  cashflow_report: '/enterprise/reports/cashflow',
  suppliers: '/enterprise/suppliers',
  ratings: '/enterprise/ratings',
  weather_insurance: '/enterprise/weather-insurance',
  profile: '/profile',
  enterprise_home: '/enterprise-home',
  enterprise_products: '/enterprise-products',
  enterprise_solutions: '/enterprise-solutions',
  enterprise_contact: '/enterprise-contact',
};

const inferEnterpriseNavigationIntents = (message: string): EnterpriseNavigationIntent[] => {
  const normalized = normalizeAiText(message);
  if (!NAVIGATION_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized))) return [];
  const intent = (target: EnterpriseNavigationTarget, label: string, entityQuery = '') => ({ target, label, entityQuery });
  if (/bao cao|dong tien|chi phi|doanh thu/.test(normalized)) return [intent('cashflow_report', 'Mở báo cáo chi phí')];
  if (/thanh toan|phi dich vu/.test(normalized)) return [intent('billing', 'Mở Thanh toán & Phí')];
  if (/hop dong/.test(normalized)) return [intent('contract_detail', 'Mở hợp đồng', message)];
  if (/nha cung cap|farmer|nong dan/.test(normalized)) return [intent('supplier_detail', 'Xem nhà cung cấp', message)];
  if (/san pham|nong san|nguon cung/.test(normalized)) return [intent('product_detail', 'Xem nguồn cung', message)];
  if (/don hang|giao hang|van chuyen/.test(normalized)) return [intent('orders', 'Mở đơn hàng')];
  if (/tin nhan|nhan tin|chat/.test(normalized)) return [intent('messages', 'Mở tin nhắn', message)];
  if (/danh gia|uy tin/.test(normalized)) return [intent('ratings', 'Mở đánh giá đối tác')];
  if (/thoi tiet|bao hiem/.test(normalized)) return [intent('weather_insurance', 'Mở Thời tiết & Bảo hiểm')];
  return [intent('dashboard', 'Về dashboard doanh nghiệp')];
};

const resolveEnterpriseNavigationActions = async (
  userId: string,
  message: string,
  modelIntents: EnterpriseNavigationIntent[]
): Promise<EnterpriseAiAction[]> => {
  const intents = [...inferEnterpriseNavigationIntents(message), ...modelIntents]
    .filter((item, index, list) => list.findIndex((candidate) => candidate.target === item.target) === index)
    .slice(0, 2);
  if (!intents.length) return [];

  let contractsPromise: ReturnType<typeof contractService.listContractsForUser> | null = null;
  let productsPromise: ReturnType<typeof productService.getAll> | null = null;
  let suppliersPromise: ReturnType<typeof enterpriseService.getSuppliers> | null = null;
  const getContracts = () => contractsPromise ||= contractService.listContractsForUser(userId, 'enterprise', { page: 1, limit: 100 });
  const getProducts = () => productsPromise ||= productService.getAll({ page: 1, limit: 100, sort: 'rating' });
  const getSuppliers = () => suppliersPromise ||= enterpriseService.getSuppliers(userId, { page: 1, limit: 50 });
  const actions: EnterpriseAiAction[] = [];

  for (const item of intents) {
    const label = item.label?.trim().slice(0, 80) || 'Mở chức năng';
    const query = item.entityQuery || message;
    if (item.target === 'contract_detail') {
      try {
        const result = await getContracts();
        const match = result.contracts
          .map((contract: any) => ({ contract, score: scoreNavigationCandidate(query, [contract.contractCode, contract.productName, contract.farmerName, contract.farmer?.fullName]) }))
          .sort((a, b) => b.score - a.score)[0];
        if (match?.score >= 55 && match.contract?.id) {
          actions.push({ type: 'navigate', target: item.target, label: `Mở hợp đồng ${match.contract.contractCode}`, path: `/enterprise/contracts/${match.contract.id}` });
          continue;
        }
      } catch { /* fallback to list */ }
      actions.push({ type: 'navigate', target: 'contracts', label: 'Xem danh sách hợp đồng', path: '/enterprise/contracts' });
      continue;
    }
    if (item.target === 'product_detail') {
      try {
        const result = await getProducts();
        const match = result.products
          .map((product: any) => ({ product, score: scoreNavigationCandidate(query, [product.name, product.location, product.farm, product.sellerName, product.category]) }))
          .sort((a, b) => b.score - a.score)[0];
        if (match?.score >= 55 && match.product?.id) {
          actions.push({ type: 'navigate', target: item.target, label: `Xem ${match.product.name}`, path: `/enterprise/products/${match.product.id}` });
          continue;
        }
      } catch { /* fallback to list */ }
      actions.push({ type: 'navigate', target: 'products', label: 'Xem danh sách nguồn cung', path: '/enterprise/products' });
      continue;
    }
    if (item.target === 'supplier_detail' || item.target === 'messages') {
      try {
        const result = await getSuppliers();
        const match = result.suppliers
          .map((supplier: any) => ({ supplier, score: scoreNavigationCandidate(query, [supplier.name, supplier.location, ...(supplier.products || [])]) }))
          .sort((a, b) => b.score - a.score)[0];
        if (match?.score >= 55 && match.supplier?.id) {
          if (item.target === 'messages') {
            actions.push({ type: 'open_chat', target: 'messages', label: `Nhắn tin ${match.supplier.name}`, partnerId: match.supplier.id, partnerName: match.supplier.name });
          } else {
            actions.push({ type: 'navigate', target: item.target, label: `Xem ${match.supplier.name}`, path: `/enterprise/suppliers/${match.supplier.id}` });
          }
          continue;
        }
      } catch { /* fallback below */ }
      if (item.target === 'messages') actions.push({ type: 'open_chat', target: 'messages', label });
      else actions.push({ type: 'navigate', target: 'suppliers', label: 'Xem danh sách nhà cung cấp', path: '/enterprise/suppliers' });
      continue;
    }
    const path = ENTERPRISE_STATIC_NAVIGATION[item.target];
    if (path) actions.push({ type: 'navigate', target: item.target, label, path });
  }
  return actions.slice(0, 2);
};

const buildEnterpriseLiveContext = async (userId: string): Promise<string> => {
  const [productsResult, contractsResult, suppliersResult, cashflowResult] = await Promise.allSettled([
    productService.getAll({ page: 1, limit: 12, sort: 'rating' }),
    contractService.listContractsForUser(userId, 'enterprise', { page: 1, limit: 20 }),
    enterpriseService.getSuppliers(userId, { page: 1, limit: 12 }),
    getCashflowReport(userId, 'enterprise', 12),
  ]);
  const products = productsResult.status === 'fulfilled' ? productsResult.value.products : [];
  const contracts = contractsResult.status === 'fulfilled' ? contractsResult.value.contracts : [];
  const suppliers = suppliersResult.status === 'fulfilled' ? suppliersResult.value.suppliers : [];
  const cashflow = cashflowResult.status === 'fulfilled' ? cashflowResult.value.summary : null;

  return [
    'DỮ LIỆU TRỰC TIẾP ĐƯỢC PHÉP DÙNG:',
    `- Nguồn cung nổi bật (${products.length}):`,
    ...products.map((product: any) => `  • ${product.name}; vùng=${product.location || product.region || 'chưa cập nhật'}; còn=${Number(product.remaining || 0)} ${product.unit || ''}; giá=${Number(product.priceMin || 0)}-${Number(product.priceMax || 0)}; Farmer=${product.sellerName || 'chưa cập nhật'}; rating=${Number(product.rating || 0)}.`),
    `- Hợp đồng gần nhất của doanh nghiệp (${contracts.length}):`,
    ...contracts.map((contract: any) => `  • ${contract.contractCode}; ${contract.productName || contract.product?.name}; Farmer=${contract.farmerName || contract.farmer?.fullName || 'chưa cập nhật'}; trạng thái=${contract.status}; giao hàng=${contract.deliveryStatus || 'chưa bắt đầu'}; tổng=${Number(contract.totalValue || 0)}; đã trả=${Number(contract.paidAmount || 0)}; còn=${Number(contract.remainingAmount || 0)}.`),
    `- Nhà cung cấp đã hợp tác (${suppliers.length}):`,
    ...suppliers.map((supplier: any) => `  • ${supplier.name}; ${supplier.location}; rating=${Number(supplier.rating || 0)}; hợp đồng=${Number(supplier.contracts || 0)}; hoàn thành=${Number(supplier.completedContracts || 0)}; nông sản=${(supplier.products || []).join(', ') || 'chưa có'}.`),
    cashflow
      ? `- Dòng tiền: tiền hàng đã chi=${cashflow.goodsCashflowAllTime}; phí dịch vụ=${cashflow.serviceFeeAllTime}; chờ thanh toán=${cashflow.pendingGoodsAmount}; giá trị hợp đồng theo dõi=${cashflow.committedContractValue}.`
      : '- Dòng tiền: tạm thời chưa tải được.',
    'Không được suy diễn rằng danh sách nguồn cung trên là toàn bộ thị trường; đây chỉ là các bản ghi nổi bật đang hoạt động.',
  ].join('\n');
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
        'Hợp đồng & thanh toán trực tiếp',
        'Tài khoản nhận tiền & phí dịch vụ',
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

export const getEnterpriseAiStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      available: Boolean(process.env.OPENAI_API_KEY),
      assistantName: 'PreOnic Enterprise AI',
      specialties: [
        'Tìm & so sánh nguồn cung',
        'Phân tích nhà cung cấp',
        'Hợp đồng & tiến độ giao nhận',
        'Thanh toán trực tiếp & phí dịch vụ',
        'Báo cáo chi phí doanh nghiệp',
      ],
      suggestedQuestions: [
        'Nguồn cung nào đang có rating tốt và còn sản lượng?',
        'Tóm tắt các hợp đồng doanh nghiệp cần theo dõi.',
        'Phân tích các khoản chi và phí dịch vụ hiện tại.',
        'Mở báo cáo chi phí cho tôi.',
      ],
    },
  });
});

export const enterpriseAiChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const message = sanitizeEnterpriseMessage(req.body?.message);
  const history = sanitizeEnterpriseHistory(req.body?.history);
  const currentFeature = typeof req.body?.currentFeature === 'string'
    ? req.body.currentFeature.trim().slice(0, 120)
    : '';
  const liveContext = await buildEnterpriseLiveContext(req.user!.id);
  const reply = await createEnterpriseAiReply(
    { userName: req.user?.fullName || 'Enterprise', currentFeature, liveContext },
    message,
    history
  );
  const actions = await resolveEnterpriseNavigationActions(
    req.user!.id,
    message,
    reply.navigationIntents
  );

  return res.status(200).json({
    success: true,
    data: { answer: reply.answer, category: reply.category, actions },
  });
});
