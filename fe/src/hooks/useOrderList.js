import { useEffect, useMemo, useState } from 'react';
import contractService from '../services/contract.service';
import escrowService from '../services/escrow.service';
import { getActiveMilestone, getOrderStatusLabel } from '../constants/escrow';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];

const getPendingEscrowMessage = (role) => (
  role === 'farmer'
    ? 'Chờ doanh nghiệp nạp ký quỹ để bắt đầu theo dõi'
    : 'Chờ nạp ký quỹ để bắt đầu theo dõi'
);

const getPartnerName = (contract, role) => (
  role === 'farmer'
    ? contract.enterprise?.name
    : contract.farmer?.name
);

export default function useOrderList({ role, pageSize = 4 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let alive = true;
    setLoading(true);

    contractService.list(ORDER_CONTRACT_STATUSES.join(','), {
      page,
      limit: pageSize,
    })
      .then(async (contractsRes) => {
        if (!alive) return;

        const contracts = contractsRes?.data?.contracts || [];
        const nextPagination = contractsRes?.data?.pagination || {};
        const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
        const escrowsRes = contractIds.length
          ? await escrowService.list({ contractIds, limit: contractIds.length }).catch(() => null)
          : null;

        if (!alive) return;

        const escrowByContract = new Map(
          (escrowsRes?.data?.escrows || []).map((escrow) => [escrow.contractId, escrow])
        );

        setOrders(contracts.map((contract) => {
          const escrow = escrowByContract.get(contract.id);
          const activeMilestone = getActiveMilestone(escrow);

          return {
            id: contract.contractCode,
            contractId: contract.id,
            partnerName: getPartnerName(contract, role),
            product: contract.product?.name,
            quantity: `${contract.quantity} ${contract.unit || ''}`.trim(),
            deliveryDate: contract.deliveryDate,
            address: contract.deliveryAddress,
            status: getOrderStatusLabel(contract, escrow),
            milestone: escrow
              ? activeMilestone?.description || 'Đã hoàn tất tất cả mốc thanh toán'
              : getPendingEscrowMessage(role),
          };
        }));

        setPagination({
          total: Number(nextPagination.total || 0),
          totalPages: Math.max(1, Number(nextPagination.totalPages || 1)),
        });
      })
      .catch(() => {
        if (!alive) return;
        setOrders([]);
        setPagination({ total: 0, totalPages: 1 });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [page, pageSize, role]);

  const totalPages = useMemo(
    () => Math.max(1, pagination.totalPages),
    [pagination.totalPages]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    orders,
    loading,
    page,
    setPage,
    pagination,
    totalPages,
  };
}
