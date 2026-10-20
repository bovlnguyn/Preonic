import { AppError } from '../../middlewares/error.middleware';
import { SETTLEMENT_BANKS } from './bank-account-input';

export type BankAccountVerificationResult = {
  status: 'verified' | 'failed' | 'unavailable';
  valid: boolean | null;
  accountHolder: string | null;
  provider: string | null;
  reference: string | null;
  message: string;
};

export type BankAccountVerificationCapability = {
  configured: boolean;
  requiredForPayments: true;
  provider: string | null;
  mode: 'sepay_linked_accounts' | 'account_lookup' | 'unavailable';
  message: string;
  selfServiceUrl: string | null;
};

const SEPAY_PROVIDER_NAMES = new Set([
  'sepay',
  'sepay_api_v2',
  'sepay_linked_accounts',
]);
const SEPAY_V2_BANK_ACCOUNTS_URL = 'https://userapi.sepay.vn/v2/bank-accounts';
const SEPAY_ALLOWED_HOSTS = new Set([
  'userapi.sepay.vn',
  'userapi-sandbox.sepay.vn',
]);

const normalizeValue = (value: unknown, maxLength: number): string =>
  String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

export const normalizeAccountHolderForMatch = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();

export const isBankAccountVerificationRequired = (): boolean =>
  process.env.BANK_ACCOUNT_VERIFICATION_REQUIRED === 'true';

const getProviderName = (): string =>
  normalizeValue(process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER || 'bank_hub', 50).toLowerCase();

const isSePayProvider = (providerName: string): boolean =>
  SEPAY_PROVIDER_NAMES.has(providerName);

const getVerificationEndpoint = (providerName: string): string => {
  const configured = String(process.env.BANK_ACCOUNT_VERIFICATION_URL || '').trim();
  if (configured) return configured;
  return isSePayProvider(providerName) ? SEPAY_V2_BANK_ACCOUNTS_URL : '';
};

export const getBankAccountVerificationCapability = (): BankAccountVerificationCapability => {
  const provider = getProviderName();
  const endpoint = getVerificationEndpoint(provider);
  const apiKey = String(process.env.BANK_ACCOUNT_VERIFICATION_API_KEY || '').trim();
  const configured = Boolean(endpoint && apiKey);
  const sepay = isSePayProvider(provider);
  const configuredSelfServiceUrl = String(process.env.SEPAY_BANK_LINK_URL || '').trim();
  let selfServiceUrl: string | null = null;
  if (sepay && configuredSelfServiceUrl) {
    try {
      const candidate = new URL(configuredSelfServiceUrl);
      if (candidate.protocol === 'https:' && candidate.hostname === 'my.sepay.vn') {
        selfServiceUrl = candidate.toString();
      }
    } catch {
      selfServiceUrl = null;
    }
  }

  return {
    configured,
    requiredForPayments: true,
    provider: configured ? (sepay ? 'sepay_api_v2' : provider) : null,
    mode: configured ? (sepay ? 'sepay_linked_accounts' : 'account_lookup') : 'unavailable',
    selfServiceUrl,
    message: configured
      ? sepay
        ? 'SePay chỉ xác minh các tài khoản đã được liên kết với công ty trên SePay.'
        : 'Dịch vụ xác minh tài khoản ngân hàng đang hoạt động.'
      : 'Chưa cấu hình dịch vụ xác minh. Tài khoản có thể được lưu nhưng chưa thể dùng để ký hoặc thanh toán hợp đồng.',
  };
};

export const validateBankAccountVerificationConfiguration = (): void => {
  const provider = getProviderName();
  const endpoint = getVerificationEndpoint(provider);
  const apiKey = String(process.env.BANK_ACCOUNT_VERIFICATION_API_KEY || '').trim();
  if (!endpoint) {
    if (isBankAccountVerificationRequired()) {
      throw new Error('BANK_ACCOUNT_VERIFICATION_URL is required when verification is mandatory');
    }
    return;
  }
  const url = new URL(endpoint);
  if (url.protocol !== 'https:') throw new Error('BANK_ACCOUNT_VERIFICATION_URL must use HTTPS');
  if (isSePayProvider(provider) && !SEPAY_ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('SePay bank verification URL must use an official SePay API host');
  }
  if (!apiKey) {
    if (!isBankAccountVerificationRequired()) return;
    throw new Error('BANK_ACCOUNT_VERIFICATION_API_KEY is required');
  }
  const selfServiceUrl = String(process.env.SEPAY_BANK_LINK_URL || '').trim();
  if (selfServiceUrl) {
    const link = new URL(selfServiceUrl);
    if (link.protocol !== 'https:' || link.hostname !== 'my.sepay.vn') {
      throw new Error('SEPAY_BANK_LINK_URL must use https://my.sepay.vn');
    }
  }
};

const providerReference = (body: any): string | null =>
  normalizeValue(body?.reference || body?.requestId || body?.id || body?.xid, 120) || null;

const isActiveSePayAccount = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';

const matchesSePayBankCode = (item: any, bankCode: string): boolean => {
  const values = [item?.bank_code, item?.bank_short_name, item?.bank?.code, item?.bank?.short_name]
    .map((value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase())
    .filter(Boolean);
  const expected = bankCode.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const expectedName = String(SETTLEMENT_BANKS[bankCode] || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();

  // SePay does not always return the same short code used by VietQR/Preonic.
  // Example: MB Bank is stored as MBB in Preonic but returned as bank_code=MB
  // and bank_short_name=MBBank. Matching the trusted bank display name keeps
  // the comparison exact while supporting those provider-specific aliases.
  return values.includes(expected) || Boolean(expectedName && values.includes(expectedName));
};

const verifyWithSePayV2 = async (
  endpoint: string,
  apiKey: string,
  bankCode: string,
  accountNumber: string,
  signal: AbortSignal
): Promise<BankAccountVerificationResult> => {
  const url = new URL(endpoint);
  url.searchParams.set('q', accountNumber);
  url.searchParams.set('active', '1');
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '100');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal,
  });
  const raw = await response.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

  if (response.status === 401 || response.status === 403) {
    throw new AppError('Khóa SePay API v2 không hợp lệ hoặc chưa có quyền đọc tài khoản', 503);
  }
  if (response.status === 429) {
    throw new AppError('SePay đang giới hạn tần suất xác minh, vui lòng thử lại sau', 503);
  }
  if (!response.ok) {
    throw new AppError('Dịch vụ xác minh tài khoản SePay đang tạm gián đoạn', 503);
  }

  const rows = Array.isArray(body?.data) ? body.data : [];
  const account = rows.find((item: any) =>
    String(item?.account_number || item?.accountNumber || '').trim() === accountNumber
    && matchesSePayBankCode(item, bankCode)
    && isActiveSePayAccount(item?.active)
  );

  if (!account) {
    return {
      status: 'failed',
      valid: false,
      accountHolder: null,
      provider: 'sepay_api_v2',
      reference: null,
      message: 'Không tìm thấy tài khoản đang hoạt động đã liên kết với SePay. Hãy liên kết đúng tài khoản trên SePay trước khi xác minh.',
    };
  }

  const accountHolder = normalizeValue(
    account.account_holder_name || account.accountHolderName,
    150
  ) || null;
  if (!accountHolder) {
    return {
      status: 'failed', valid: false, accountHolder: null, provider: 'sepay_api_v2',
      reference: providerReference(account),
      message: 'SePay không trả về tên chủ tài khoản nên chưa thể xác minh.',
    };
  }

  return {
    status: 'verified',
    valid: true,
    accountHolder,
    provider: 'sepay_api_v2',
    reference: providerReference(account),
    message: 'Tài khoản đã được liên kết và xác minh qua SePay.',
  };
};

export const verifyBankAccount = async (
  bankCode: string,
  accountNumber: string
): Promise<BankAccountVerificationResult> => {
  const providerName = getProviderName();
  const endpoint = getVerificationEndpoint(providerName);
  const apiKey = String(process.env.BANK_ACCOUNT_VERIFICATION_API_KEY || '').trim();

  if (!endpoint || !apiKey) {
    return {
      status: 'unavailable', valid: null, accountHolder: null, provider: null, reference: null,
      message: 'Máy chủ chưa kết nối dịch vụ xác minh tài khoản ngân hàng.',
    };
  }

  const timeoutMs = Math.min(Math.max(Number(process.env.BANK_ACCOUNT_VERIFICATION_TIMEOUT_MS || 8_000), 1_000), 15_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (isSePayProvider(providerName)) {
      return await verifyWithSePayV2(
        endpoint,
        apiKey,
        bankCode,
        accountNumber,
        controller.signal
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ bankCode, accountNumber }),
      signal: controller.signal,
    });
    const raw = await response.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    if (!response.ok) {
      if (response.status === 400 || response.status === 404 || response.status === 422) {
        return {
          status: 'failed', valid: false, accountHolder: null, provider: providerName,
          reference: providerReference(body),
          message: normalizeValue(body?.message, 200) || 'Không tìm thấy tài khoản ngân hàng tương ứng.',
        };
      }
      throw new AppError('Dịch vụ xác minh tài khoản ngân hàng đang tạm gián đoạn', 503);
    }

    const valid = body?.valid === true || body?.exists === true || body?.status === 'verified';
    const accountHolder = normalizeValue(body?.accountHolder || body?.accountName || body?.beneficiaryName, 150) || null;
    if (!valid || !accountHolder) {
      return {
        status: 'failed', valid: false, accountHolder: null, provider: providerName,
        reference: providerReference(body),
        message: normalizeValue(body?.message, 200) || 'Tài khoản không tồn tại hoặc không thể xác minh.',
      };
    }
    return {
      status: 'verified', valid: true, accountHolder, provider: providerName,
      reference: providerReference(body),
      message: 'Tài khoản ngân hàng tồn tại và đã được xác minh.',
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error?.name === 'AbortError') throw new AppError('Dịch vụ xác minh tài khoản phản hồi quá lâu', 504);
    throw new AppError('Không thể kết nối dịch vụ xác minh tài khoản ngân hàng', 503);
  } finally {
    clearTimeout(timer);
  }
};
