export type ContractPaymentFlow = 'direct_v2';

/**
 * New contracts always use direct settlement.
 *
 * Keeping this function centralizes the invariant. An environment variable
 * cannot silently change the financial architecture at runtime.
 */
export const getConfiguredContractPaymentFlow = (): ContractPaymentFlow =>
  'direct_v2';
