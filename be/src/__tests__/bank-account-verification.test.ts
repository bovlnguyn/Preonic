import {
  getBankAccountVerificationCapability,
  normalizeAccountHolderForMatch,
  validateBankAccountVerificationConfiguration,
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

  test('verifies only an exact active account already linked to SePay API v2', async () => {
    delete process.env.BANK_ACCOUNT_VERIFICATION_URL;
    process.env.BANK_ACCOUNT_VERIFICATION_API_KEY = 'sepay-api-token';
    process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER = 'sepay_api_v2';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'success',
        data: [{
          id: 'linked-account-xid',
          account_holder_name: 'NGUYEN VAN A',
          account_number: '0123456789',
          bank_code: 'VCB',
          active: 1,
        }],
      }),
    } as Response);

    await expect(verifyBankAccount('VCB', '0123456789')).resolves.toEqual({
      status: 'verified',
      valid: true,
      accountHolder: 'NGUYEN VAN A',
      provider: 'sepay_api_v2',
      reference: 'linked-account-xid',
      message: 'Tài khoản đã được liên kết và xác minh qua SePay.',
    });
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl).toContain('https://userapi.sepay.vn/v2/bank-accounts?');
    expect(requestedUrl).toContain('q=0123456789');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'GET' }));
  });

  test('accepts the SePay MB alias for the Preonic MBB bank code', async () => {
    delete process.env.BANK_ACCOUNT_VERIFICATION_URL;
    process.env.BANK_ACCOUNT_VERIFICATION_API_KEY = 'sepay-api-token';
    process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER = 'sepay_api_v2';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'success',
        data: [{
          id: 'linked-mb-account',
          account_holder_name: 'THAI THI MAI ANH',
          account_number: '0815803246',
          bank_code: 'MB',
          bank_short_name: 'MBBank',
          active: '1',
        }],
      }),
    } as Response);

    await expect(verifyBankAccount('MBB', '0815803246')).resolves.toMatchObject({
      status: 'verified',
      valid: true,
      accountHolder: 'THAI THI MAI ANH',
      reference: 'linked-mb-account',
    });
  });

  test('does not treat an unlinked SePay account as verified', async () => {
    delete process.env.BANK_ACCOUNT_VERIFICATION_URL;
    process.env.BANK_ACCOUNT_VERIFICATION_API_KEY = 'sepay-api-token';
    process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER = 'sepay_api_v2';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'success', data: [] }),
    } as Response);

    await expect(verifyBankAccount('BIDV', '5602012164')).resolves.toMatchObject({
      status: 'failed',
      valid: false,
      provider: 'sepay_api_v2',
    });
  });

  test('rejects a non-SePay host when SePay verification mode is selected', () => {
    process.env.BANK_ACCOUNT_VERIFICATION_URL = 'https://attacker.example/collect';
    process.env.BANK_ACCOUNT_VERIFICATION_API_KEY = 'sepay-api-token';
    process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER = 'sepay_api_v2';
    expect(() => validateBankAccountVerificationConfiguration()).toThrow(
      'official SePay API host'
    );
  });

  test('reports that verification evidence is always required for payments', () => {
    delete process.env.BANK_ACCOUNT_VERIFICATION_URL;
    delete process.env.BANK_ACCOUNT_VERIFICATION_API_KEY;
    delete process.env.BANK_ACCOUNT_VERIFICATION_PROVIDER;
    expect(getBankAccountVerificationCapability()).toMatchObject({
      configured: false,
      requiredForPayments: true,
      mode: 'unavailable',
    });
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
