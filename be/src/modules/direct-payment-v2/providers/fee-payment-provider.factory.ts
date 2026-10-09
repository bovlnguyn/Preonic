import { FeePaymentProvider } from './fee-payment-provider.interface';
import { MockFeePaymentProvider } from './mock/mock-fee-payment.provider';

export const getConfiguredFeePaymentProviderName = (): string =>
  String(process.env.FEE_PAYMENT_PROVIDER || 'mock').trim().toLowerCase();

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

  throw new Error(
    `Fee payment provider '${configured}' is not implemented. Add a provider adapter before enabling it.`
  );
};
