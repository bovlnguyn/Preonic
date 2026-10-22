import { assertGhnWebhookAuthorized, normalizeGhnWebhook } from '../services/ghn.service';

describe('GHN tracking integration', () => {
  const previousSecret = process.env.GHN_WEBHOOK_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.GHN_WEBHOOK_SECRET;
    else process.env.GHN_WEBHOOK_SECRET = previousSecret;
    process.env.NODE_ENV = previousNodeEnv;
  });

  test('normalizes the official status callback fields and creates a stable event id', () => {
    const payload = {
      OrderCode: 'GHN12345',
      Status: 'transporting',
      Description: 'Đang luân chuyển',
      Warehouse: 'Bưu cục Cao Lãnh',
      Time: '2026-10-22T01:30:00.000Z',
      Type: 'Switch_status',
      Latitude: 10.7769,
      Longitude: 106.7009,
    };
    const first = normalizeGhnWebhook(payload);
    const retry = normalizeGhnWebhook(payload);

    expect(first.trackingCode).toBe('GHN12345');
    expect(first.status).toBe('transporting');
    expect(first.location).toBe('Bưu cục Cao Lãnh');
    expect(first.latitude).toBe(10.7769);
    expect(first.longitude).toBe(106.7009);
    expect(first.providerEventId).toBe(retry.providerEventId);
  });

  test('rejects an invalid webhook secret with a safe 401 error', () => {
    process.env.GHN_WEBHOOK_SECRET = 'correct-secret';
    expect(() => assertGhnWebhookAuthorized('wrong-secret')).toThrow('GHN webhook không hợp lệ');
    try {
      assertGhnWebhookAuthorized('wrong-secret');
    } catch (error: any) {
      expect(error.statusCode).toBe(401);
    }
  });
});
