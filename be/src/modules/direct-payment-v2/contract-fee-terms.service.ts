import { EntityManager } from 'typeorm';
import { Contract } from '../../models/Contract.entity';
import { ContractFeeTerms } from '../../models/ContractFeeTerms.entity';
import { lockOne } from '../../utils/transaction-lock.util';
import { makeError } from '../../utils/error.util';
import { resolveActiveFeePolicy } from './fee-policy.service';

export const getOrCreateContractFeeTermsWithManager = async (
  manager: EntityManager,
  contract: Contract,
  at = new Date()
): Promise<ContractFeeTerms> => {
  let terms = await lockOne(manager, ContractFeeTerms, {
    contractId: contract.id,
  });

  if (terms) return terms;

  const policy = await resolveActiveFeePolicy(at, manager);

  terms = manager.getRepository(ContractFeeTerms).create({
    contractId: contract.id,
    feePolicyId: policy.id,
    buyerFeeBps: policy.buyerFeeBps,
    sellerFeeBps: policy.sellerFeeBps,
    currency: policy.currency,
    snapshottedAt: at,
  });

  try {
    return await manager.getRepository(ContractFeeTerms).save(terms);
  } catch (error: any) {
    // Contract row is expected to be locked by the caller, so a duplicate here
    // normally signals an invariant violation/manual DB mutation.
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('duplicate') || message.includes('unique')) {
      throw makeError('Điều khoản phí của hợp đồng đã được tạo đồng thời', 409);
    }
    throw error;
  }
};
