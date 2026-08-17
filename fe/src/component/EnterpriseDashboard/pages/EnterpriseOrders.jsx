import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiMapPin, FiTruck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import useOrderList from '../../../hooks/useOrderList';
import { formatDate } from '../utils';

const ORDERS_PER_PAGE = 4;

function EnterpriseOrders() {
  const navigate = useNavigate();
  const { orders, loading, page, setPage, pagination, totalPages } = useOrderList({
    role: 'enterprise',
    pageSize: ORDERS_PER_PAGE,
  });

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
              {orders.map((o) => (
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
                      <strong>{o.partnerName || 'Chưa cập nhật'}</strong>
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
                Trang {page} / {totalPages} — {pagination.total.toLocaleString('vi-VN')} đơn hàng
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
