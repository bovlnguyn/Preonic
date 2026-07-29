import React, { useEffect, useState } from 'react';
import { FiMapPin, FiTruck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import escrowService from '../../../services/escrow.service';
import { getOrderStatusLabel } from '../../../constants/escrow';
import { formatDate } from '../utils';

const ORDER_CONTRACT_STATUSES = ['active', 'completed'];

function FarmerOrders() {
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

        setOrders(contracts.map((c) => ({
          id: c.contractCode,
          buyer: c.enterprise?.name,
          product: c.product?.name,
          quantity: `${c.quantity} ${c.unit || ''}`.trim(),
          deliveryDate: c.deliveryDate,
          address: c.farmLocation,
          status: getOrderStatusLabel(c, escrowByContract.get(c.id)),
        })));
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
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
          <div className="farmer-order-list">
            {orders.map((item) => (
              <article className="farmer-order-card" key={item.id}>
                <div className="farmer-order-card__icon"><FiTruck /></div>
                <div className="farmer-order-card__body">
                  <div className="farmer-order-card__head">
                    <div>
                      <span>{item.id}</span>
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
        )}
      </section>
    </div>
  );
}

export default FarmerOrders;
