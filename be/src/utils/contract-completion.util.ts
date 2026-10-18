import { Contract } from '../models/Contract.entity';

export const hasGoodsLeftFarm = (deliveryStatus?: string | null): boolean =>
  deliveryStatus === 'shipping' || deliveryStatus === 'delivered';

/**
 * A direct-settlement contract is fulfilled only when goods were accepted and
 * the complete contract value was confirmed received. Status alone is not
 * sufficient because administrators or old data may contain inconsistent rows.
 */
export const isDirectContractFulfilled = (
  contract: Pick<
    Contract,
    'status' | 'deliveryStatus' | 'paidAmount' | 'remainingAmount' | 'totalValue'
  >
): boolean => {
  const total = Math.round(Number(contract.totalValue || 0));
  const paid = Math.round(Number(contract.paidAmount || 0));
  const remaining = Math.round(Number(contract.remainingAmount || 0));

  return (
    total > 0 &&
    contract.status === 'completed' &&
    contract.deliveryStatus === 'delivered' &&
    paid >= total &&
    remaining <= 0
  );
};
