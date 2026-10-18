import { useEffect, useMemo, useState } from 'react';
import contractService from '../services/contract.service';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];

const DELIVERY_STATUS_LABEL = {
  pending: 'Chờ chuẩn bị hàng',
  preparing: 'Đang chuẩn bị hàng',
  shipping: 'Đang vận chuyển',
  delivered: 'Đã nhận hàng',
  failed: 'Giao hàng thất bại',
};

const getOrderStatusLabel = (contract) => {
  if (contract.status === 'completed') return 'Hoàn tất';
  if (contract.status === 'disputed') return 'Tranh chấp';
  return DELIVERY_STATUS_LABEL[contract.deliveryStatus] || 'Đang thực hiện';
};

const getPaymentProgressLabel = (contract) => {
  const total = Number(contract.totalValue || 0);
  const paid = Math.max(0, Number(contract.paidAmount || 0));
  const remaining = Math.max(0, Number(contract.remainingAmount ?? total - paid));

  if (total > 0 && remaining <= 0) return 'Đã xác nhận thanh toán đủ';
  if (paid > 0) {
    return `Đã xác nhận ${paid.toLocaleString('vi-VN')}đ · còn ${remaining.toLocaleString('vi-VN')}đ`;
  }
  return 'Chờ xử lý khoản thanh toán trực tiếp đầu tiên';
};

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
      .then((contractsRes) => {
        if (!alive) return;

        const contracts = contractsRes?.data?.contracts || [];
        const nextPagination = contractsRes?.data?.pagination || {};

        setOrders(contracts.map((contract) => {
          return {
            id: contract.contractCode,
            contractId: contract.id,
            partnerName: getPartnerName(contract, role),
            product: contract.product?.name,
            quantity: `${contract.quantity} ${contract.unit || ''}`.trim(),
            deliveryDate: contract.deliveryDate,
            address: contract.deliveryAddress,
            status: getOrderStatusLabel(contract),
            milestone: getPaymentProgressLabel(contract),
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
