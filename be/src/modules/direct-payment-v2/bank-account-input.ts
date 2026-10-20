import { makeError } from '../../utils/error.util';

const ACCOUNT_HOLDER_PATTERN = /^[\p{L}\s.'’&()-]+$/u;

export const SETTLEMENT_BANKS: Readonly<Record<string, string>> = Object.freeze({
  VCB: 'Vietcombank', BIDV: 'BIDV', ICB: 'VietinBank', VBA: 'Agribank', TCB: 'Techcombank',
  MBB: 'MB Bank', ACB: 'ACB', VPB: 'VPBank', TPB: 'TPBank', STB: 'Sacombank', HDB: 'HDBank',
  VIB: 'VIB', SHB: 'SHB', EIB: 'Eximbank', MSB: 'MSB', OCB: 'OCB', LPB: 'LPBank',
  NAB: 'Nam A Bank', SEAB: 'SeABank', PGB: 'PGBank', KLB: 'KienlongBank', BVB: 'BaoViet Bank',
  GPB: 'GPBank', SCB: 'SCB', ABB: 'ABBank', VCCB: 'VietCapital Bank', PVCB: 'PVcomBank',
  CBBANK: 'CB Bank', SGB: 'Saigonbank', VRB: 'Vietnam - Russia Joint Venture Bank', HSBC: 'HSBC Vietnam',
  SCVN: 'Standard Chartered Vietnam', UOB: 'UOB Vietnam', CIMB: 'CIMB Vietnam', WOORI: 'Woori Bank Vietnam',
  SHBVN: 'Shinhan Bank Vietnam', HLBVN: 'Hong Leong Bank Vietnam', IBK: 'IBK Vietnam',
  KEBHANA: 'KEB Hana Bank Vietnam',
});

// Preonic keeps the familiar VietQR/Napas codes used by the product UI, while
// the QR generator uses a few different canonical codes from banks.json.
const VIETQR_BANK_CODE_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  MBB: 'MB',
  CBBANK: 'CBB',
  SGB: 'SGICB',
  WOORI: 'WVN',
});

export const toVietQrBankCode = (value: unknown): string => {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,30}$/.test(code)) {
    throw makeError('Mã ngân hàng dùng để tạo VietQR không hợp lệ', 400);
  }
  return VIETQR_BANK_CODE_OVERRIDES[code] || code;
};

export const normalizeSettlementBankCode = (value: unknown): string => {
  const code = String(value || '').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(SETTLEMENT_BANKS, code)) {
    throw makeError('Ngân hàng không được hệ thống hỗ trợ', 400);
  }
  return code;
};

export const normalizeSettlementBankName = (value: unknown, bankCode: string): string => {
  const expected = SETTLEMENT_BANKS[bankCode];
  const supplied = String(value || '').replace(/\s+/g, ' ').trim();
  if (!expected || supplied !== expected) {
    throw makeError('Tên ngân hàng không khớp với mã ngân hàng đã chọn', 400);
  }
  return expected;
};

export const normalizeSettlementAccountHolder = (value: unknown): string => {
  const normalized = String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length < 2 || normalized.length > 150) {
    throw makeError('Tên chủ tài khoản phải từ 2 đến 150 ký tự', 400);
  }
  if (/\p{N}/u.test(normalized)) {
    throw makeError('Tên chủ tài khoản không được chứa số', 400);
  }
  if (!ACCOUNT_HOLDER_PATTERN.test(normalized) || (normalized.match(/\p{L}/gu) || []).length < 2) {
    throw makeError('Tên chủ tài khoản chỉ được chứa chữ cái và dấu phân cách tên hợp lệ', 400);
  }

  return normalized;
};

export const normalizeSettlementAccountNumber = (value: unknown): string => {
  const normalized = String(value || '').trim();
  if (!/^[0-9]{6,20}$/.test(normalized)) {
    throw makeError('Số tài khoản ngân hàng phải có từ 6 đến 20 chữ số', 400);
  }
  return normalized;
};
