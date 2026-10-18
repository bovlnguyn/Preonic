import { FeePaymentProvider } from './fee-payment-provider.interface';
import { MockFeePaymentProvider } from './mock/mock-fee-payment.provider';
import { BankTransferFeePaymentProvider } from './bank-transfer/bank-transfer-fee-payment.provider';

export const getConfiguredFeePaymentProviderName = (): string =>
  String(process.env.FEE_PAYMENT_PROVIDER || (process.env.NODE_ENV === 'production' ? 'bank_transfer' : 'mock')).trim().toLowerCase();

export const getFeePaymentProvider = (
  requestedProvider?: string
): FeePaymentProvider => {
  const configured = getConfiguredFeePaymentProviderName();
  const requested = requestedProvider?.trim().toLowerCase();

  if (requested && requested !== configured) {
    throw new Error(`Fee payment provider '${requested}' is not configured`);
  }

  if (configured === 'mock') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock fee-payment provider cannot be used in production');
    }
    return new MockFeePaymentProvider();
  }

  if (configured === 'bank_transfer') {
    return new BankTransferFeePaymentProvider();
  }

  throw new Error(
    `Fee payment provider '${configured}' is not implemented. Add a provider adapter before enabling it.`
  );
};
