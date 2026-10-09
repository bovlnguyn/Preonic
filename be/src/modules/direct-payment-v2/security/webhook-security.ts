import crypto from 'crypto';
import { IncomingHttpHeaders } from 'http';

const getHeader = (
  headers: IncomingHttpHeaders,
  name: string
): string | undefined => {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value == null ? undefined : String(value);
};

const safeHexBuffer = (value: string): Buffer | null => {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  try {
    return Buffer.from(value, 'hex');
  } catch {
    return null;
  }
};

export const assertWebhookBodySize = (
  rawBody: Buffer,
  maxBytes = 256 * 1024
): void => {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    throw new Error('Webhook raw body is required');
  }
  if (rawBody.length > maxBytes) {
    throw new Error('Webhook payload exceeds allowed size');
  }
};

export const verifyTimestampedHmacWebhook = (params: {
  rawBody: Buffer;
  headers: IncomingHttpHeaders;
  secret: string;
  signatureHeader: string;
  timestampHeader: string;
  maxAgeSeconds?: number;
  nowMs?: number;
}): number => {
  assertWebhookBodySize(params.rawBody);

  if (!params.secret || params.secret.length < 32) {
    throw new Error('Webhook secret must contain at least 32 characters');
  }

  const signature = getHeader(params.headers, params.signatureHeader);
  const timestampRaw = getHeader(params.headers, params.timestampHeader);

  if (!signature || !timestampRaw || !/^\d{10,13}$/.test(timestampRaw)) {
    throw new Error('Webhook signature or timestamp is missing');
  }

  const rawTimestamp = Number(timestampRaw);
  const timestampMs = timestampRaw.length === 10
    ? rawTimestamp * 1000
    : rawTimestamp;

  if (!Number.isSafeInteger(timestampMs)) {
    throw new Error('Webhook timestamp is invalid');
  }

  const nowMs = params.nowMs ?? Date.now();
  const maxAgeSeconds = params.maxAgeSeconds ?? 300;
  if (
    !Number.isFinite(maxAgeSeconds) ||
    maxAgeSeconds < 30 ||
    maxAgeSeconds > 3600
  ) {
    throw new Error('Webhook max age configuration is invalid');
  }

  if (Math.abs(nowMs - timestampMs) > maxAgeSeconds * 1000) {
    throw new Error('Webhook timestamp is outside the accepted replay window');
  }

  const signedPayload = Buffer.concat([
    Buffer.from(String(timestampMs), 'utf8'),
    Buffer.from('.', 'utf8'),
    params.rawBody,
  ]);

  const expected = crypto
    .createHmac('sha256', params.secret)
    .update(signedPayload)
    .digest();

  const provided = safeHexBuffer(signature);
  if (!provided || provided.length !== expected.length) {
    throw new Error('Webhook signature is invalid');
  }

  if (!crypto.timingSafeEqual(provided, expected)) {
    throw new Error('Webhook signature is invalid');
  }

  return timestampMs;
};

export const hashWebhookPayload = (rawBody: Buffer): string =>
  crypto.createHash('sha256').update(rawBody).digest('hex');
