import {
  normalizeAccountHolderForMatch,
  verifyBankAccount,
} from '../modules/direct-payment-v2/bank-account-verification.service';
import {
  normalizeSettlementBankCode,
  normalizeSettlementBankName,
  normalizeSettlementAccountHolder,
  normalizeSettlementAccountNumber,
} from '../modules/direct-payment-v2/bank-account-input';

describe('bank account verification adapter', () => {
  const previous = {
    url: process.env.BANK_ACCOUNT_VERIFICATION_URL,
    key: process.env.BANK_ACCOUNT_VERIFICATION_API_KEY,
    provider: process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER,
  };

  afterEach(() => {
    jest.restoreAllMocks();
    if (previous.url === undefined) delete process.env.BANK_ACCOUNT_VERIFICATION_URL;
    else process.env.BANK_ACCOUNT_VERIFICATION_URL = previous.url;
    if (previous.key === undefined) delete process.env.BANK_ACCOUNT_VERIFICATION_API_KEY;
    else process.env.BANK_ACCOUNT_VERIFICATION_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER;
    else process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER = previous.provider;
  });

  test('matches Vietnamese account-holder names without accents and separators', () => {
    expect(normalizeAccountHolderForMatch('Nguyễn Văn Đạt')).toBe('NGUYENVANDAT');
    expect(normalizeAccountHolderForMatch('NGUYEN-VAN DAT')).toBe('NGUYENVANDAT');
  });

  test('never reports verified when no provider is configured', async () => {
    delete process.env.BANK_ACCOUNT_VERIFICATION_URL;
    delete process.env.BANK_ACCOUNT_VERIFICATION_API_KEY;
    await expect(verifyBankAccount('VCB', '0123456789')).resolves.toMatchObject({
      status: 'unavailable',
      valid: null,
      accountHolder: null,
    });
  });

  test('normalizes a successful provider response', async () => {
    process.env.BANK_ACCOUNT_VERIFICATION_URL = 'https://bank.example.test/verify';
    process.env.BANK_ACCOUNT_VERIFICATION_API_KEY = 'secret';
    process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER = 'test-hub';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ valid: true, accountName: 'NGUYEN VAN A', requestId: 'req-1' }),
    } as Response);

    await expect(verifyBankAccount('VCB', '0123456789')).resolves.toEqual({
      status: 'verified',
      valid: true,
      accountHolder: 'NGUYEN VAN A',
      provider: 'test-hub',
      reference: 'req-1',
      message: 'Tài khoản ngân hàng tồn tại và đã được xác minh.',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://bank.example.test/verify', expect.objectContaining({ method: 'POST' }));
  });
});

describe('settlement bank account input', () => {
  test('normalizes a valid Vietnamese account-holder name', () => {
    expect(normalizeSettlementAccountHolder('  Nguyễn   Văn An  ')).toBe('Nguyễn Văn An');
    expect(normalizeSettlementAccountHolder("D'ANGELO & SONS")).toBe("D'ANGELO & SONS");
  });

  test.each(['VO LE NGUYEN BAO 123', '123456', '<script>', '---'])('rejects invalid account-holder name %s', (value) => {
    expect(() => normalizeSettlementAccountHolder(value)).toThrow();
  });

  test('accepts only a 6-20 digit account number', () => {
    expect(normalizeSettlementAccountNumber(' 5602012164 ')).toBe('5602012164');
    expect(() => normalizeSettlementAccountNumber('5602 012164')).toThrow();
    expect(() => normalizeSettlementAccountNumber('12345')).toThrow();
  });

  test('accepts only a supported matching bank code and name', () => {
    expect(normalizeSettlementBankCode(' vcb ')).toBe('VCB');
    expect(normalizeSettlementBankName('Vietcombank', 'VCB')).toBe('Vietcombank');
    expect(() => normalizeSettlementBankCode('FAKEBANK')).toThrow();
    expect(() => normalizeSettlementBankName('BIDV', 'VCB')).toThrow();
  });
});
