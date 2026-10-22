import crypto from 'crypto';

export const GHN_DELIVERED_STATUSES = new Set([
  'delivered',
  'completed',
]);

const text = (value: unknown, max = 500): string | null => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : null;
};

export interface NormalizedGhnEvent {
  providerEventId: string;
  trackingCode: string;
  status: string;
  description: string | null;
  location: string | null;
  occurredAt: Date;
  latitude: number | null;
  longitude: number | null;
  rawPayload: string;
}

export const normalizeGhnWebhook = (payload: any): NormalizedGhnEvent => {
  const trackingCode = text(payload?.OrderCode ?? payload?.order_code, 100);
  const status = text(payload?.Status ?? payload?.status, 100);
  if (!trackingCode || !status) {
    const error: any = new Error('GHN webhook thiếu OrderCode hoặc Status');
    error.statusCode = 400;
    throw error;
  }

  const rawTime = payload?.Time ?? payload?.time ?? payload?.UpdatedAt ?? payload?.updated_at;
  const parsedTime = rawTime ? new Date(rawTime) : new Date();
  const occurredAt = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
  const rawPayload = JSON.stringify(payload).slice(0, 20_000);
  const latitudeValue = Number(payload?.Latitude ?? payload?.latitude ?? payload?.CurrentLatitude);
  const longitudeValue = Number(payload?.Longitude ?? payload?.longitude ?? payload?.CurrentLongitude);
  const latitude = Number.isFinite(latitudeValue) && latitudeValue >= -90 && latitudeValue <= 90
    ? latitudeValue
    : null;
  const longitude = Number.isFinite(longitudeValue) && longitudeValue >= -180 && longitudeValue <= 180
    ? longitudeValue
    : null;
  const providerSeed = [trackingCode, status, occurredAt.toISOString(), payload?.Type ?? payload?.type ?? 'status'].join('|');

  return {
    providerEventId: `ghn:${crypto.createHash('sha256').update(providerSeed).digest('hex')}`,
    trackingCode,
    status: status.toLowerCase(),
    description: text(payload?.Description ?? payload?.description ?? payload?.Reason ?? payload?.reason, 1000),
    location: text(payload?.Warehouse ?? payload?.warehouse ?? payload?.CurrentWarehouse ?? payload?.current_warehouse),
    occurredAt,
    latitude,
    longitude,
    rawPayload,
  };
};

export const assertGhnWebhookAuthorized = (providedSecret?: string) => {
  const expected = process.env.GHN_WEBHOOK_SECRET?.trim();
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      const error: any = new Error('GHN webhook chưa được cấu hình bảo mật');
      error.statusCode = 503;
      throw error;
    }
    return;
  }

  const provided = String(providedSecret || '');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const error: any = new Error('GHN webhook không hợp lệ');
    error.statusCode = 401;
    throw error;
  }
};
