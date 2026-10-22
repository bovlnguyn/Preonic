import { useEffect, useMemo, useState } from 'react';
import orderService from '../services/order.service';

const STAGE_LABEL = {
  cultivating: 'Đang trồng',
  ready_to_ship: 'Sẵn sàng giao',
  in_transit: 'Đang vận chuyển',
  delivered: 'Đã nhận hàng',
  completed: 'Hoàn tất',
};

const getPartnerName = (order, role) => (
  role === 'farmer'
    ? order.contract?.enterprise?.name
    : order.contract?.farmer?.name
);

export default function useOrderList({ role, pageSize = 4 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    orderService.list({
      page,
      limit: pageSize,
    })
      .then((contractsRes) => {
        if (!alive) return;

        const orderRows = contractsRes?.data?.orders || [];
        const nextPagination = contractsRes?.data?.pagination || {};

        setOrders(orderRows.map((order) => {
          const contract = order.contract || {};
          return {
            id: contract.contractCode,
            orderId: order.id,
            contractId: contract.id,
            partnerName: getPartnerName(order, role),
            product: contract.product?.name,
            quantity: `${contract.quantity} ${contract.unit || ''}`.trim(),
            deliveryDate: contract.deliveryDate,
            address: contract.deliveryAddress,
            status: STAGE_LABEL[order.stage] || 'Đang thực hiện',
            stage: order.stage,
            milestone: order.stage === 'in_transit'
              ? `${order.carrier === 'ghn' ? 'GHN' : 'Vận chuyển'} · ${order.trackingCode || 'chưa có mã'}`
              : STAGE_LABEL[order.stage] || 'Đang thực hiện',
          };
        }));

        setPagination({
          total: Number(nextPagination.total || 0),
          totalPages: Math.max(1, Number(nextPagination.totalPages || 1)),
        });
      })
      .catch((requestError) => {
        if (!alive) return;
        setError(requestError?.message || 'Không thể cập nhật danh sách đơn hàng.');
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
    error,
  };
}
