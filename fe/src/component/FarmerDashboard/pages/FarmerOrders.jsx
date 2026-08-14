import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiTruck,
} from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import escrowService from '../../../services/escrow.service';
import {
  getOrderStatusLabel,
  getActiveMilestone,
} from '../../../constants/escrow';
import { formatDate } from '../utils';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];
const ORDERS_PER_PAGE = 4;

function FarmerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let alive = true;
    setLoading(true);

    contractService.list(ORDER_CONTRACT_STATUSES.join(','), {
      page,
      limit: ORDERS_PER_PAGE,
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
            buyer: contract.enterprise?.name,
            product: contract.product?.name,
            quantity: `${contract.quantity} ${contract.unit || ''}`.trim(),
            deliveryDate: contract.deliveryDate,
            address: contract.deliveryAddress,
            status: getOrderStatusLabel(contract, escrow),
            milestone: escrow
              ? activeMilestone
                ? activeMilestone.description
                : 'Đã hoàn tất tất cả mốc thanh toán'
              : 'Chờ doanh nghiệp nạp ký quỹ để bắt đầu theo dõi',
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
  }, [page]);

  const totalPages = Math.max(1, pagination.totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="farmer-stack">
      <section className="farmer-card fo-shell">
        <SectionHeader
          breadcrumb="Đơn hàng"
          eyebrow="Đơn hàng"
          title="Theo dõi chuẩn bị hàng và lịch giao"
          desc="Farmer có thể theo dõi số lượng, địa chỉ giao và trạng thái xử lý của từng đơn hàng."
        />

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Chưa có đơn hàng nào"
            desc="Đơn hàng sẽ xuất hiện khi hợp đồng được kích hoạt."
          />
        ) : (
          <>
            <div className="farmer-order-list fo-order-list">
              {orders.map((item) => (
                <article
                  className="farmer-order-card fo-order-card"
                  key={item.id}
                  onClick={() =>
                    navigate(`/farmer/contracts/${item.contractId}`)
                  }
                >
                  <div className="fo-order-card__top">
                    <div className="fo-order-card__identity">
                      <div className="farmer-order-card__icon fo-order-card__icon">
                        <FiTruck />
                      </div>

                      <div className="fo-order-card__title-wrap">
                        <span className="fo-order-card__code">{item.id}</span>
                        <h3 className="fo-order-card__title">
                          {item.product || 'Chưa cập nhật'}
                        </h3>
                      </div>
                    </div>

                    <StatusBadge status={item.status} />
                  </div>

                  <div className="farmer-order-card__grid fo-order-card__grid">
                    <div>
                      <span>Doanh nghiệp</span>
                      <strong>{item.buyer || 'Chưa cập nhật'}</strong>
                    </div>

                    <div>
                      <span>Số lượng</span>
                      <strong>{item.quantity || 'Chưa cập nhật'}</strong>
                    </div>

                    <div>
                      <span>Ngày giao</span>
                      <strong>{formatDate(item.deliveryDate)}</strong>
                    </div>

                    <div>
                      <span>Địa điểm giao nhận</span>
                      <strong className="fo-order-card__location">
                        <FiMapPin />
                        {item.address || 'Chưa cập nhật'}
                      </strong>
                    </div>
                  </div>

                  <div className="fo-order-card__milestone">
                    <span>Tiến độ hiện tại</span>
                    <strong>{item.milestone}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="farmer-pagination fo-order-pagination">
              <span>
                Trang {page} / {totalPages} —{' '}
                {pagination.total.toLocaleString('vi-VN')} đơn hàng
              </span>

              <div className="farmer-pagination__buttons">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.max(1, currentPage - 1)
                    )
                  }
                >
                  <FiChevronLeft size={14} />
                  Trước
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.min(totalPages, currentPage + 1)
                    )
                  }
                >
                  Sau
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default FarmerOrders;
