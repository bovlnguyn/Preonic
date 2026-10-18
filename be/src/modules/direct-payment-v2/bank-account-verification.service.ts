import { AppError } from '../../middlewares/error.middleware';

export type BankAccountVerificationResult = {
  status: 'verified' | 'failed' | 'unavailable';
  valid: boolean | null;
  accountHolder: string | null;
  provider: string | null;
  reference: string | null;
  message: string;
};

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

export const validateBankAccountVerificationConfiguration = (): void => {
  const endpoint = String(process.env.BANK_ACCOUNT_VERIFICATION_URL || '').trim();
  if (!endpoint) {
    if (isBankAccountVerificationRequired()) {
      throw new Error('BANK_ACCOUNT_VERIFICATION_URL is required when verification is mandatory');
    }
    return;
  }
  const url = new URL(endpoint);
  if (url.protocol !== 'https:') throw new Error('BANK_ACCOUNT_VERIFICATION_URL must use HTTPS');
  if (!process.env.BANK_ACCOUNT_VERIFICATION_API_KEY) {
    throw new Error('BANK_ACCOUNT_VERIFICATION_API_KEY is required');
  }
};

export const verifyBankAccount = async (
  bankCode: string,
  accountNumber: string
): Promise<BankAccountVerificationResult> => {
  const endpoint = String(process.env.BANK_ACCOUNT_VERIFICATION_URL || '').trim();
  const apiKey = String(process.env.BANK_ACCOUNT_VERIFICATION_API_KEY || '').trim();
  const providerName = normalizeValue(process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER || 'bank_hub', 50);

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
          reference: normalizeValue(body?.reference || body?.requestId, 120) || null,
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
        reference: normalizeValue(body?.reference || body?.requestId, 120) || null,
        message: normalizeValue(body?.message, 200) || 'Tài khoản không tồn tại hoặc không thể xác minh.',
      };
    }
    return {
      status: 'verified', valid: true, accountHolder, provider: providerName,
      reference: normalizeValue(body?.reference || body?.requestId, 120) || null,
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
