import React from 'react';
import { FiMapPin, FiTruck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import { farmerOrders } from '../../../data/farmer';
import { formatDate } from '../utils';

function FarmerOrders() {
  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Đơn hàng"
          title="Theo dõi chuẩn bị hàng và lịch giao"
          desc="Farmer có thể theo dõi số lượng, địa chỉ giao và trạng thái xử lý của từng đơn hàng."
        />

        <div className="farmer-order-list">
          {farmerOrders.map((item) => (
            <article className="farmer-order-card" key={item.id}>
              <div className="farmer-order-card__icon"><FiTruck /></div>
              <div className="farmer-order-card__body">
                <div className="farmer-order-card__head">
                  <div>
                    <span>{item.id} • {item.contractId}</span>
                    <h3>{item.product}</h3>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="farmer-order-card__grid">
                  <p><strong>Doanh nghiệp:</strong> {item.buyer}</p>
                  <p><strong>Số lượng:</strong> {item.quantity}</p>
                  <p><strong>Ngày giao:</strong> {formatDate(item.deliveryDate)}</p>
                  <p><FiMapPin /> {item.address}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FarmerOrders;
