import axios from 'axios';
import { STORAGE_KEYS } from '../constants';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
const AUTH_REDIRECT_PATH = '/auth';
const PROFILE_REDIRECT_PATH = '/profile';
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const SERVICE_UNAVAILABLE_STATUS = 503;
const PROFILE_INCOMPLETE_CODE = 'PROFILE_INCOMPLETE';
const DATABASE_UNAVAILABLE_CODE = 'DATABASE_UNAVAILABLE';

export const SERVICE_STATUS_EVENT = 'preonic:service-status';

const PRODUCT_GET_CACHE_TTL_MS = 60 * 1000;
const WEATHER_GET_CACHE_TTL_MS = 10 * 60 * 1000;
const GET_CACHE_MAX_ENTRIES = 80;
const responseCache = new Map();

const isGetRequest = (config) => (config?.method || 'get').toLowerCase() === 'get';
const isMutationRequest = (config) =>
  ['post', 'put', 'patch', 'delete'].includes((config?.method || '').toLowerCase());

const shouldCacheRequest = (config) => {
  if (!isGetRequest(config)) return false;

  const url = config?.url || '';

  // Chỉ cache dữ liệu ít nhạy cảm và ít thay đổi. Không cache wallet/escrow/
  // contract/admin vì các trang này cần phản ánh ngay thao tác vừa thực hiện.
  const isPublicProductRead =
    url.startsWith('/products') &&
    !url.includes('/my-products') &&
    !url.includes('/reviews/eligibility') &&
    !url.includes('/reviews');

  const isWeatherRead = url.startsWith('/weather');

  return isPublicProductRead || isWeatherRead;
};

const getCacheTtlMs = (config) => {
  const url = config?.url || '';
  // Product.remaining thay đổi khi hợp đồng được ký/hủy ở một browser khác.
  // Giữ cache ngắn để tránh hiển thị tồn kho cũ quá lâu; weather có thể cache dài hơn.
  if (url.startsWith('/products')) return PRODUCT_GET_CACHE_TTL_MS;
  if (url.startsWith('/weather')) return WEATHER_GET_CACHE_TTL_MS;
  return 0;
};

const getCacheKey = (config) => {
  if (!shouldCacheRequest(config)) return null;
  const params = config?.params || {};
  const normalizedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  return `${config?.url || ''}::${JSON.stringify(normalizedParams)}`;
};

const writeResponseCache = (response) => {
  const key = getCacheKey(response?.config);
  if (!key) return;

  if (responseCache.size >= GET_CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }

  responseCache.set(key, {
    savedAt: Date.now(),
    response: {
      ...response,
      data: response.data,
      __fromPreonicCache: true,
    },
  });
};

const readResponseCache = (config) => {
  const key = getCacheKey(config);
  if (!key) return null;

  const cached = responseCache.get(key);
  if (!cached) return null;

  const ttlMs = getCacheTtlMs(config);
  if (ttlMs <= 0 || Date.now() - cached.savedAt > ttlMs) {
    responseCache.delete(key);
    return null;
  }

  return {
    ...cached.response,
    config,
    __fromPreonicCache: true,
  };
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const emitServiceStatus = (available, message = '') => {
  window.dispatchEvent(
    new CustomEvent(SERVICE_STATUS_EVENT, {
      detail: { available, message },
    })
  );
};

const attachAccessToken = (config) => {
  if (config?.skipAuthToken) return config;

  const accessToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
};

export const clearStoredAuth = () => {
  sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USER);

  // Dọn dữ liệu auth cũ do phiên bản trước từng ghi nhầm vào localStorage.
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  responseCache.clear();
};

let authRedirectInProgress = false;
const redirectToLogin = () => {
  if (authRedirectInProgress || window.location.pathname === AUTH_REDIRECT_PATH) return;
  authRedirectInProgress = true;
  window.location.assign(AUTH_REDIRECT_PATH);
};

let refreshingPromise = null;
const refreshAccessToken = () => {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = axios
    .post(
      `${API_URL}/auth/refresh-token`,
      {},
      {
        withCredentials: true,
        timeout: 15_000,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    .then((response) => {
      const { accessToken } = response.data?.data || {};
      if (!accessToken) throw new Error('Không nhận được access token mới từ máy chủ');
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      return accessToken;
    })
    .finally(() => {
      refreshingPromise = null;
    });

  return refreshingPromise;
};

const isTransientServiceError = (error) => {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  return (
    !error.response ||
    status === SERVICE_UNAVAILABLE_STATUS ||
    code === DATABASE_UNAVAILABLE_CODE
  );
};

const isLogoutRequest = (config) => config?.url?.includes('/auth/logout');
const isDatabaseIndependentRequest = (config) =>
  config?.url?.includes('/auth/logout') ||
  config?.url?.includes('/weather') ||
  config?.url?.includes('/ai/public');
const isAuthEntryRequest = (config) => {
  const url = config?.url || '';
  return [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/google',
    '/auth/google-register',
    '/auth/google-onboarding',
    '/auth/resend-verification',
    '/auth/verify-email',
  ].some((path) => url.includes(path));
};

api.interceptors.request.use(attachAccessToken, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => {
    if (shouldCacheRequest(response.config)) writeResponseCache(response);
    if (isMutationRequest(response.config)) responseCache.clear();
    if (!isDatabaseIndependentRequest(response.config)) emitServiceStatus(true);
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (isTransientServiceError(error)) {
      const cachedResponse = readResponseCache(originalRequest);
      const cachedMessage = cachedResponse
        ? 'Kết nối dữ liệu đang gián đoạn. Hệ thống đang giữ và hiển thị dữ liệu gần nhất.'
        : 'Kết nối dữ liệu đang tạm thời gián đoạn. Dữ liệu của bạn không bị xóa.';

      emitServiceStatus(
        false,
        error.response?.data?.message || cachedMessage
      );

      // Với GET đã tải thành công trước đó, trả dữ liệu gần nhất thay vì làm UI
      // chuyển thành danh sách rỗng. Không áp dụng cho thao tác ghi dữ liệu.
      if (cachedResponse) return cachedResponse;
      return Promise.reject(error);
    }

    if (
      status === FORBIDDEN_STATUS &&
      error.response?.data?.code === PROFILE_INCOMPLETE_CODE &&
      window.location.pathname !== PROFILE_REDIRECT_PATH
    ) {
      window.location.assign(`${PROFILE_REDIRECT_PATH}?incomplete=1`);
      return Promise.reject(error);
    }

    const canAttemptRefresh =
      status === UNAUTHORIZED_STATUS &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !isLogoutRequest(originalRequest) &&
      !isAuthEntryRequest(originalRequest) &&
      !originalRequest.url?.includes('/auth/refresh-token');

    if (!canAttemptRefresh) return Promise.reject(error);

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // 503/network khi refresh chỉ có nghĩa DB/mạng đang gián đoạn. Tuyệt đối
      // không xóa phiên trong trường hợp này.
      if (isTransientServiceError(refreshError)) {
        emitServiceStatus(
          false,
          refreshError.response?.data?.message ||
            'Không thể kết nối máy chủ để làm mới phiên. Phiên hiện tại vẫn được giữ.'
        );
        return Promise.reject(refreshError);
      }

      // Chỉ xóa phiên khi refresh token thực sự bị máy chủ từ chối.
      if (
        refreshError.response?.status === UNAUTHORIZED_STATUS ||
        refreshError.response?.status === FORBIDDEN_STATUS
      ) {
        clearStoredAuth();
        redirectToLogin();
      }

      return Promise.reject(refreshError);
    }
  }
);

export default api;
