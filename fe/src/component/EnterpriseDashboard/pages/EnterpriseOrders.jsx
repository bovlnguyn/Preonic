import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiMapPin, FiTruck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import escrowService from '../../../services/escrow.service';
import { getOrderStatusLabel, getActiveMilestone } from '../../../constants/escrow';
import { formatDate } from '../utils';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];
const ORDERS_PER_PAGE = 4;

function EnterpriseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      contractService.list(),
      escrowService.list().catch(() => ({ data: { escrows: [] } })),
    ])
      .then(([contractsRes, escrowsRes]) => {
        const contracts = (contractsRes?.data?.contracts || [])
          .filter((c) => ORDER_CONTRACT_STATUSES.includes(c.status));
        const escrowByContract = new Map(
          (escrowsRes?.data?.escrows || []).map((e) => [e.contractId, e])
        );

        setOrders(contracts.map((c) => {
          const escrow = escrowByContract.get(c.id);
          const activeMilestone = getActiveMilestone(escrow);
          return {
            id: c.contractCode,
            contractId: c.id,
            farmer: c.farmer?.name,
            product: c.product?.name,
            quantity: `${c.quantity} ${c.unit || ''}`.trim(),
            deliveryDate: c.deliveryDate,
            address: c.farmLocation,
            status: getOrderStatusLabel(c, escrow),
            milestone: escrow
              ? (activeMilestone ? activeMilestone.description : 'Đã hoàn tất tất cả mốc thanh toán')
              : 'Chờ nạp ký quỹ để bắt đầu theo dõi',
          };
        }));
        setPage(1);
      })
      .catch(() => {
        setOrders([]);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * ORDERS_PER_PAGE;
    return orders.slice(start, start + ORDERS_PER_PAGE);
  }, [orders, page]);

  return (
    <div className="ent-stack">
      <section className="ent-card ent-page-shell">
        <SectionHeader
          breadcrumb="Theo dõi đơn hàng"
          eyebrow="Đơn hàng"
          title="Theo dõi giao nhận từ nông trại đến kho"
          desc="Theo dõi số lượng, lịch giao, kiểm tra chất lượng và trạng thái xử lý của từng đơn hàng."
        />

        {loading ? (
          <div className="spinner-border text-primary" role="status" />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Chưa có đơn hàng nào"
            desc="Đơn hàng sẽ xuất hiện khi hợp đồng được kích hoạt."
          />
        ) : (
          <>
            <div className="ent-order-list">
              {paginatedOrders.map((o) => (
                <article
                  className="ent-order-card"
                  key={o.id}
                  onClick={() => navigate(`/enterprise/contracts/${o.contractId}`)}
                >
                  <div className="ent-order-card__top">
                    <div className="ent-order-card__identity">
                      <div className="ent-order-card__icon"><FiTruck /></div>
                      <div className="ent-order-card__title">
                        <span>{o.id}</span>
                        <h3>{o.product}</h3>
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  <div className="ent-order-card__meta">
                    <div>
                      <span>Nông dân</span>
                      <strong>{o.farmer || 'Chưa cập nhật'}</strong>
                    </div>
                    <div>
                      <span>Số lượng</span>
                      <strong>{o.quantity || 'Chưa cập nhật'}</strong>
                    </div>
                    <div>
                      <span>Hạn giao</span>
                      <strong>{formatDate(o.deliveryDate)}</strong>
                    </div>
                    <div>
                      <span>Địa điểm giao nhận</span>
                      <strong className="ent-order-card__location">
                        <FiMapPin /> {o.address || 'Chưa cập nhật'}
                      </strong>
                    </div>
                  </div>

                  <div className="ent-order-card__milestone">
                    <span>Tiến độ hiện tại</span>
                    <strong>{o.milestone}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="et-pagination ent-order-pagination">
              <span>
                Trang {page} / {totalPages} — {orders.length.toLocaleString('vi-VN')} đơn hàng
              </span>
              <div className="et-pagination-btns">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <FiChevronLeft size={14} /> Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Sau <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default EnterpriseOrders;
