import { validateBankAccountCryptoConfiguration } from './bank-account-crypto';
import {
  getConfiguredFeePaymentProviderName,
  getFeePaymentProvider,
} from './providers/fee-payment-provider.factory';
import { validateBankTransferFeePaymentConfiguration } from './providers/bank-transfer/bank-transfer-fee-payment.provider';

const requireHttpsUrl = (name: string, fallback: string): void => {
  const value = String(process.env[name] || fallback).trim();
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(`${name} must use HTTPS`);
};

/** Fail production startup before accepting contracts with unusable payment keys. */
export const validateDirectPaymentRuntimeConfiguration = (): void => {
  validateBankAccountCryptoConfiguration({
    encryptionKeyBase64: String(process.env.PAYMENT_BANK_DATA_ENCRYPTION_KEY || ''),
    hmacKeyBase64: String(process.env.PAYMENT_BANK_DATA_HMAC_KEY || ''),
    encryptionKeyVersion: Number(process.env.PAYMENT_BANK_DATA_ACTIVE_KEY_VERSION || 1),
  });

  requireHttpsUrl('DIRECT_PAYMENT_QR_BASE_URL', 'https://qr.sepay.vn/img');

  const providerName = getConfiguredFeePaymentProviderName();
  getFeePaymentProvider(providerName);
  if (providerName === 'bank_transfer') {
    validateBankTransferFeePaymentConfiguration();
  }
};
