import crypto from 'crypto';

export interface EncryptedBankAccountNumber {
  ciphertext: string;
  iv: string;
  authTag: string;
  fingerprint: string;
  maskedAccountNumber: string;
  encryptionKeyVersion: number;
}

const decodeBase64Secret = (value: string, name: string): Buffer => {
  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(value, 'base64');
  } catch {
    throw new Error(`${name} must be valid base64`);
  }

  // Buffer.from() is permissive; round-trip validation prevents accepting
  // arbitrary text that merely decodes to some bytes.
  const normalizedInput = value.replace(/\s+/g, '').replace(/=+$/g, '');
  const normalizedOutput = decoded.toString('base64').replace(/=+$/g, '');
  if (!decoded.length || normalizedInput !== normalizedOutput) {
    throw new Error(`${name} must be valid base64`);
  }

  return decoded;
};

const decodeEncryptionKey = (keyBase64: string): Buffer => {
  const key = decodeBase64Secret(keyBase64, 'PAYMENT_BANK_DATA_ENCRYPTION_KEY');
  if (key.length !== 32) {
    throw new Error('PAYMENT_BANK_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return key;
};

const decodeHmacKey = (keyBase64: string): Buffer => {
  const key = decodeBase64Secret(keyBase64, 'PAYMENT_BANK_DATA_HMAC_KEY');
  if (key.length < 32) {
    throw new Error('PAYMENT_BANK_DATA_HMAC_KEY must decode to at least 32 bytes');
  }
  return key;
};

export const normalizeBankAccountNumber = (value: string): string => {
  const normalized = String(value || '').replace(/[\s-]+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{4,34}$/.test(normalized)) {
    throw new Error('Bank account number must contain 4-34 letters or digits');
  }
  return normalized;
};

export const maskBankAccountNumber = (value: string): string => {
  const normalized = normalizeBankAccountNumber(value);
  const visible = Math.min(4, normalized.length);
  return `${'•'.repeat(Math.max(4, normalized.length - visible))}${normalized.slice(-visible)}`;
};

const buildAad = (userId: string, bankCode: string): Buffer => {
  if (!userId?.trim() || !bankCode?.trim()) {
    throw new Error('userId and bankCode are required for bank-account encryption context');
  }
  return Buffer.from(`preonic:bank:v1:${userId.trim()}:${bankCode.trim().toUpperCase()}`, 'utf8');
};

export const encryptBankAccountNumber = (params: {
  accountNumber: string;
  userId: string;
  bankCode: string;
  encryptionKeyBase64: string;
  hmacKeyBase64: string;
  encryptionKeyVersion?: number;
}): EncryptedBankAccountNumber => {
  const accountNumber = normalizeBankAccountNumber(params.accountNumber);
  const encryptionKey = decodeEncryptionKey(params.encryptionKeyBase64);
  const hmacKey = decodeHmacKey(params.hmacKeyBase64);
  const aad = buildAad(params.userId, params.bankCode);
  const encryptionKeyVersion = params.encryptionKeyVersion ?? 1;
  if (!Number.isInteger(encryptionKeyVersion) || encryptionKeyVersion < 1) {
    throw new Error('encryptionKeyVersion must be a positive integer');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([
    cipher.update(accountNumber, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const fingerprint = crypto
    .createHmac('sha256', hmacKey)
    .update(aad)
    .update(Buffer.from([0]))
    .update(accountNumber, 'utf8')
    .digest('hex');

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    fingerprint,
    maskedAccountNumber: maskBankAccountNumber(accountNumber),
    encryptionKeyVersion,
  };
};

export const decryptBankAccountNumber = (params: {
  ciphertext: string;
  iv: string;
  authTag: string;
  userId: string;
  bankCode: string;
  encryptionKeyBase64: string;
}): string => {
  const encryptionKey = decodeEncryptionKey(params.encryptionKeyBase64);
  const aad = buildAad(params.userId, params.bankCode);

  const iv = Buffer.from(params.iv, 'base64');
  const authTag = Buffer.from(params.authTag, 'base64');
  const ciphertext = Buffer.from(params.ciphertext, 'base64');

  if (iv.length !== 12 || authTag.length !== 16 || !ciphertext.length) {
    throw new Error('Encrypted bank account payload is malformed');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
};
