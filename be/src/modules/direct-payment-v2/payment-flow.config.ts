export type ContractPaymentFlow = 'escrow_v1' | 'direct_v2';

export const getConfiguredContractPaymentFlow = (): ContractPaymentFlow => {
  const raw = String(process.env.CONTRACT_PAYMENT_FLOW || 'direct_v2')
    .trim()
    .toLowerCase();

  if (raw !== 'escrow_v1' && raw !== 'direct_v2') {
    throw new Error(
      "CONTRACT_PAYMENT_FLOW must be either 'escrow_v1' or 'direct_v2'"
    );
  }

  return raw;
};
