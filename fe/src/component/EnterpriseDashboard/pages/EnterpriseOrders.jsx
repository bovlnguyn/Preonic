import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiTruck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import EmptyState    from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import escrowService from '../../../services/escrow.service';
import { getOrderStatusLabel, getActiveMilestone } from '../../../constants/escrow';
import { formatDate } from '../utils';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];

function EnterpriseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

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
          <div className="ent-order-list">
            {orders.map((o) => (
              <article
                className="ent-order-card"
                key={o.id}
                onClick={() => navigate(`/enterprise/contracts/${o.contractId}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="ent-order-card__icon"><FiTruck /></div>
                <div className="ent-order-card__body">
                  <div className="ent-order-card__head">
                    <div>
                      <span>{o.id}</span>
                      <h3>{o.product}</h3>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="ent-order-card__grid">
                    <p><strong>Nông dân:</strong> {o.farmer}</p>
                    <p><strong>Số lượng:</strong> {o.quantity}</p>
                    <p><strong>Hạn giao:</strong> {formatDate(o.deliveryDate)}</p>
                    <p><FiMapPin /> {o.address}</p>
                  </div>
                  <p style={{ marginTop: 12, color: 'var(--ent-blue-700)', fontWeight: 900, fontSize: 13 }}>
                    {o.milestone}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default EnterpriseOrders;
