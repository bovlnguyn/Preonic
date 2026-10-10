/**
 * Danh sách ngân hàng dùng cho tài khoản nhận tiền Direct Payment.
 * `code` là mã ngắn được lưu vào UserSettlementBankAccounts và dùng khi tạo QR.
 */
export const VN_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'VBA', name: 'Agribank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MBB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'LPB', name: 'LPBank' },
  { code: 'NAB', name: 'Nam A Bank' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'PGB', name: 'PGBank' },
  { code: 'KLB', name: 'KienlongBank' },
  { code: 'BVB', name: 'BaoViet Bank' },
  { code: 'GPB', name: 'GPBank' },
  { code: 'SCB', name: 'SCB' },
  { code: 'ABB', name: 'ABBank' },
  { code: 'VCCB', name: 'VietCapital Bank' },
  { code: 'PVCB', name: 'PVcomBank' },
  { code: 'CBBANK', name: 'CB Bank' },
  { code: 'SGB', name: 'Saigonbank' },
  { code: 'VRB', name: 'Vietnam - Russia Joint Venture Bank' },
  { code: 'HSBC', name: 'HSBC Vietnam' },
  { code: 'SCVN', name: 'Standard Chartered Vietnam' },
  { code: 'UOB', name: 'UOB Vietnam' },
  { code: 'CIMB', name: 'CIMB Vietnam' },
  { code: 'WOORI', name: 'Woori Bank Vietnam' },
  { code: 'SHBVN', name: 'Shinhan Bank Vietnam' },
  { code: 'HLBVN', name: 'Hong Leong Bank Vietnam' },
  { code: 'IBK', name: 'IBK Vietnam' },
  { code: 'KEBHANA', name: 'KEB Hana Bank Vietnam' },
];

export const getVietnamBankByCode = (code) => (
  VN_BANKS.find((bank) => bank.code === String(code || '').trim().toUpperCase()) || null
);
