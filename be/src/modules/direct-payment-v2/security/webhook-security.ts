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

const safeEqualText = (expected: string, actual: string): boolean => {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(actual, 'utf8');
  return expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);
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

  const signatureHeader = getHeader(params.headers, params.signatureHeader);
  const timestampRaw = getHeader(params.headers, params.timestampHeader);

  if (!signatureHeader || !timestampRaw || !/^\d{10,13}$/.test(timestampRaw)) {
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

  // Providers sign the timestamp exactly as it appears in the request. A
  // 10-digit value is seconds (SePay), while a 13-digit value is milliseconds.
  const signedPayload = Buffer.concat([
    Buffer.from(timestampRaw, 'utf8'),
    Buffer.from('.', 'utf8'),
    params.rawBody,
  ]);

  const expected = crypto
    .createHmac('sha256', params.secret)
    .update(signedPayload)
    .digest();

  // SePay prefixes the digest with `sha256=`. Older/internal adapters may send
  // only the hexadecimal digest, so accepting both keeps the helper reusable.
  const signature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;
  const provided = safeHexBuffer(signature);
  if (!provided || provided.length !== expected.length) {
    throw new Error('Webhook signature is invalid');
  }

  if (!crypto.timingSafeEqual(provided, expected)) {
    throw new Error('Webhook signature is invalid');
  }

  return timestampMs;
};

/**
 * SePay lets each webhook use either HMAC-SHA256 or an API key. During a
 * migration both credentials may exist in the environment, so select the
 * verifier from the headers SePay actually sent. A malformed HMAC request is
 * never allowed to fall back to API-key verification.
 */
export const verifySePayWebhookAuthentication = (params: {
  rawBody: Buffer;
  headers: IncomingHttpHeaders;
  hmacSecret?: string;
  apiKey?: string;
  maxAgeSeconds?: number;
  nowMs?: number;
}): 'hmac' | 'api_key' => {
  assertWebhookBodySize(params.rawBody);

  const signature = getHeader(params.headers, 'x-sepay-signature');
  const timestamp = getHeader(params.headers, 'x-sepay-timestamp');
  if (signature || timestamp) {
    const secret = String(params.hmacSecret || '').trim();
    if (secret.length < 32) throw new Error('SePay HMAC secret is not configured');
    verifyTimestampedHmacWebhook({
      rawBody: params.rawBody,
      headers: params.headers,
      secret,
      signatureHeader: 'x-sepay-signature',
      timestampHeader: 'x-sepay-timestamp',
      maxAgeSeconds: params.maxAgeSeconds,
      nowMs: params.nowMs,
    });
    return 'hmac';
  }

  const expectedApiKey = String(params.apiKey || '').trim();
  const authorization = String(getHeader(params.headers, 'authorization') || '').trim();
  const prefix = 'Apikey ';
  if (expectedApiKey.length < 32 || !authorization.startsWith(prefix)) {
    throw new Error('SePay webhook authentication is missing');
  }
  if (!safeEqualText(expectedApiKey, authorization.slice(prefix.length))) {
    throw new Error('SePay webhook API key is invalid');
  }
  return 'api_key';
};

export const hashWebhookPayload = (rawBody: Buffer): string =>
  crypto.createHash('sha256').update(rawBody).digest('hex');
