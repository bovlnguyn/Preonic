import React from 'react';
import { FiMapPin, FiTruck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import { enterpriseOrders } from '../data/enterpriseMockData';
import { formatDate } from '../utils';

function EnterpriseOrders() {
  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Theo dõi đơn hàng"
          title="Luồng giao nhận từ nông trại đến kho"
          desc="Theo dõi milestone vận chuyển, kiểm tra chất lượng và xác nhận nhận hàng để kích hoạt giải ngân."
        />

        <div className="ent-order-list">
          {enterpriseOrders.map((o) => (
            <article className="ent-order-card" key={o.id}>
              <div className="ent-order-card__icon"><FiTruck /></div>
              <div className="ent-order-card__body">
                <div className="ent-order-card__head">
                  <div>
                    <span>{o.id} • {o.contractId}</span>
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
      </section>
    </div>
  );
}

export default EnterpriseOrders;