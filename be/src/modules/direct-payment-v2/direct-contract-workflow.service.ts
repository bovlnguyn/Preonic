import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Contract } from '../../models/Contract.entity';
import { DirectGoodsPayment } from '../../models/DirectGoodsPayment.entity';
import { Notification } from '../../models/Notification.entity';
import { Product } from '../../models/Product.entity';
import { User } from '../../models/User.entity';
import { makeError } from '../../utils/error.util';
import { getHarvestEligibility } from '../../utils/harvet.util';
import { notifyContractEmail as notifyEmail } from '../../utils/notify.util';
import { lockByIdOrFail, runLockedTransaction } from '../../utils/transaction-lock.util';
import { buildDirectPaymentPlan } from './payment-plan';
import {
  preparePayableGoodsPaymentWithManager,
  refreshDirectContractPaymentProgressWithManager,
} from './direct-goods-payment.service';

const notificationRepo = () => AppDataSource.getRepository(Notification);
const userRepo = () => AppDataSource.getRepository(User);


const normalizeDeliveryNote = (value?: string): string | undefined => {
  if (value == null || String(value).trim() === '') return undefined;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (
    normalized.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw makeError('Ghi chú giao hàng không hợp lệ', 400);
  }
  return normalized;
};

const assertDirectActiveContract = (
  contract: Contract,
  userId: string,
  role: string
) => {
  if (contract.paymentFlow !== 'direct_v2') {
    throw makeError('Hợp đồng này không sử dụng luồng thanh toán trực tiếp', 409);
  }
  if (contract.status !== 'active') {
    throw makeError('Hợp đồng chưa ở trạng thái đang thực hiện', 409);
  }

  const isFarmer = role === 'farmer' && contract.farmerId === userId;
  const isEnterprise = role === 'enterprise' && contract.enterpriseId === userId;
  if (!isFarmer && !isEnterprise) {
    throw makeError('Bạn không có quyền thao tác hợp đồng này', 403);
  }

  return { isFarmer, isEnterprise };
};

const getExpectedTriggerSequences = (
  contract: Contract,
  trigger: 'contract_active' | 'goods_accepted'
): number[] => buildDirectPaymentPlan(contract)
  .filter((item) => item.trigger === trigger)
  .map((item) => item.sequence);

const assertTriggerPaymentsConfirmedWithManager = async (
  manager: EntityManager,
  contract: Contract,
  trigger: 'contract_active' | 'goods_accepted'
) => {
  const expectedSequences = getExpectedTriggerSequences(contract, trigger);
  if (expectedSequences.length === 0) return;

  const rows = await manager
    .getRepository(DirectGoodsPayment)
    .createQueryBuilder('payment')
    .where('payment.ContractId = :contractId', { contractId: contract.id })
    .andWhere('payment.InstallmentSequence IN (:...sequences)', {
      sequences: expectedSequences,
    })
    .getMany();

  const bySequence = new Map(rows.map((row) => [row.installmentSequence, row]));
  for (const sequence of expectedSequences) {
    const payment = bySequence.get(sequence);
    if (!payment || payment.status !== 'confirmed') {
      throw makeError(
        'Khoản thanh toán cần thiết của hợp đồng chưa được nông dân xác nhận đã nhận',
        409
      );
    }
  }
};

const notifyPartner = async (params: {
  partnerId: string;
  partnerRole: 'farmer' | 'enterprise';
  contractId: string;
  type: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'success' | 'error';
}) => {
  await notificationRepo().save(notificationRepo().create({
    userId: params.partnerId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedId: params.contractId,
    relatedModel: 'Contract',
    severity: params.severity ?? 'info',
    isRead: false,
    emailSent: false,
  }));

  const partner = await userRepo().findOne({ where: { id: params.partnerId } });
  await notifyEmail(
    partner,
    params.partnerRole,
    params.title,
    params.message,
    params.contractId
  );
};

export const markDirectContractPreparing = async (
  contractId: string,
  farmerUserId: string,
  note?: string
) => {
  const result = await runLockedTransaction(async (manager) => {
    const contract = await lockByIdOrFail(
      manager,
      Contract,
      contractId,
      () => makeError('Không tìm thấy hợp đồng', 404)
    );
    const { isFarmer } = assertDirectActiveContract(
      contract,
      farmerUserId,
      'farmer'
    );
    if (!isFarmer) throw makeError('Chỉ nông dân mới có thể chuẩn bị hàng', 403);

    await assertTriggerPaymentsConfirmedWithManager(
      manager,
      contract,
      'contract_active'
    );

    if (contract.deliveryStatus === 'preparing') {
      return {
        contract,
        partnerId: contract.enterpriseId,
        changed: false,
      };
    }
    if (contract.deliveryStatus !== 'pending') {
      throw makeError('Trạng thái giao hàng hiện tại không cho phép bắt đầu chuẩn bị hàng', 409);
    }

    contract.deliveryStatus = 'preparing';
    contract.deliveryNote = normalizeDeliveryNote(note) || contract.deliveryNote;
    contract.updatedBy = farmerUserId;
    await manager.getRepository(Contract).save(contract);

    return {
      contract,
      partnerId: contract.enterpriseId,
      changed: true,
    };
  }, { label: 'paymentV2.contractPreparing' });

  if (result.changed) {
    await notifyPartner({
      partnerId: result.partnerId,
      partnerRole: 'enterprise',
      contractId: result.contract.id,
      type: 'direct_goods_preparing',
      title: 'Nông dân đang chuẩn bị hàng',
      message: `Hợp đồng ${result.contract.contractCode} đã chuyển sang giai đoạn chuẩn bị hàng.`,
    });
  }

  return result.contract;
};

export const markDirectContractShipped = async (
  contractId: string,
  farmerUserId: string,
  note?: string
) => {
  const result = await runLockedTransaction(async (manager) => {
    const contract = await lockByIdOrFail(
      manager,
      Contract,
      contractId,
      () => makeError('Không tìm thấy hợp đồng', 404)
    );
    const { isFarmer } = assertDirectActiveContract(
      contract,
      farmerUserId,
      'farmer'
    );
    if (!isFarmer) throw makeError('Chỉ nông dân mới có thể xác nhận giao hàng', 403);

    if (contract.deliveryStatus === 'shipping') {
      return {
        contract,
        partnerId: contract.enterpriseId,
        changed: false,
      };
    }
    if (contract.deliveryStatus !== 'preparing') {
      throw makeError('Cần chuyển hợp đồng sang trạng thái chuẩn bị hàng trước', 409);
    }

    const product = await manager.getRepository(Product).findOne({
      where: { id: contract.productId },
    });
    if (!product) throw makeError('Không tìm thấy sản phẩm của hợp đồng', 404);

    const harvest = getHarvestEligibility(product.expectedDate);
    if (!harvest.shippingAllowed) {
      throw makeError(harvest.reason || 'Chưa đến ngày có thể giao hàng', 409);
    }

    contract.deliveryStatus = 'shipping';
    contract.deliveryNote = normalizeDeliveryNote(note) || contract.deliveryNote;
    contract.updatedBy = farmerUserId;
    await manager.getRepository(Contract).save(contract);

    return {
      contract,
      partnerId: contract.enterpriseId,
      changed: true,
    };
  }, { label: 'paymentV2.contractShipped' });

  if (result.changed) {
    await notifyPartner({
      partnerId: result.partnerId,
      partnerRole: 'enterprise',
      contractId: result.contract.id,
      type: 'direct_goods_shipped',
      title: 'Hàng đã được gửi',
      message: `Nông dân đã xác nhận giao hàng cho hợp đồng ${result.contract.contractCode}.`,
    });
  }

  return result.contract;
};

export const acceptDirectContractDelivery = async (
  contractId: string,
  enterpriseUserId: string,
  note?: string
) => {
  const result = await runLockedTransaction(async (manager) => {
    const contract = await lockByIdOrFail(
      manager,
      Contract,
      contractId,
      () => makeError('Không tìm thấy hợp đồng', 404)
    );
    const { isEnterprise } = assertDirectActiveContract(
      contract,
      enterpriseUserId,
      'enterprise'
    );
    if (!isEnterprise) {
      throw makeError('Chỉ doanh nghiệp của hợp đồng mới có thể xác nhận nhận hàng', 403);
    }

    if (contract.deliveryStatus === 'delivered') {
      const progress = await refreshDirectContractPaymentProgressWithManager(
        manager,
        contract,
        new Date()
      );
      return {
        contract,
        payment: null,
        changed: false,
        ...progress,
      };
    }

    if (contract.deliveryStatus !== 'shipping') {
      throw makeError('Nông dân chưa xác nhận hàng đang được giao', 409);
    }

    const now = new Date();
    contract.deliveryStatus = 'delivered';
    contract.deliveredAt = now;
    contract.deliveryNote = normalizeDeliveryNote(note) || contract.deliveryNote;
    contract.updatedBy = enterpriseUserId;
    await manager.getRepository(Contract).save(contract);

    const plan = buildDirectPaymentPlan(contract);
    const deliveryInstallment = plan.find((item) => item.trigger === 'goods_accepted');

    const payment = deliveryInstallment
      ? await preparePayableGoodsPaymentWithManager(
          manager,
          contract,
          deliveryInstallment.sequence,
          'goods_accepted'
        )
      : null;

    const progress = await refreshDirectContractPaymentProgressWithManager(
      manager,
      contract,
      now
    );

    return {
      contract,
      payment,
      changed: true,
      ...progress,
    };
  }, { label: 'paymentV2.acceptContractDelivery' });

  if (result.changed) {
    const paymentSuffix = result.payment
      ? ' Khoản thanh toán tiếp theo đã được tạo cho doanh nghiệp.'
      : result.contractCompleted
        ? ' Hợp đồng đã hoàn tất.'
        : '';

    await notifyPartner({
      partnerId: result.contract.farmerId,
      partnerRole: 'farmer',
      contractId: result.contract.id,
      type: 'direct_goods_accepted',
      title: 'Doanh nghiệp đã xác nhận nhận hàng',
      message:
        `Doanh nghiệp đã xác nhận nhận hàng của hợp đồng ` +
        `${result.contract.contractCode}.${paymentSuffix}`,
      severity: 'success',
    });
  }

  return result;
};

export const getDirectContractWorkflow = async (
  contractId: string,
  userId: string
) => {
  if (!AppDataSource?.isInitialized) {
    throw makeError('Database is not initialized', 503);
  }

  const contract = await AppDataSource.getRepository(Contract).findOne({
    where: { id: contractId },
  });
  if (!contract) throw makeError('Không tìm thấy hợp đồng', 404);

  if (userId !== contract.farmerId && userId !== contract.enterpriseId) {
    throw makeError('Bạn không có quyền xem tiến độ hợp đồng này', 403);
  }

  return {
    paymentFlow: contract.paymentFlow,
    contractStatus: contract.status,
    deliveryStatus: contract.deliveryStatus,
    deliveredAt: contract.deliveredAt,
    paidAmount: Math.round(Number(contract.paidAmount || 0)),
    remainingAmount: Math.max(0, Math.round(Number(contract.remainingAmount || 0))),
    plan: contract.paymentFlow === 'direct_v2'
      ? buildDirectPaymentPlan(contract)
      : [],
  };
};
