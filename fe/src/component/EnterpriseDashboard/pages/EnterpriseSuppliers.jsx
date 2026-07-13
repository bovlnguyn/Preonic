import React from 'react';
import { FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import { useState, useEffect } from 'react';
import { formatMoney } from '../utils';

function EnterpriseSuppliers() {
  const [enterpriseSuppliers, setEnterpriseSuppliers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Khi có API: supplierService.list().then(...)
  setLoading(false);
}, []);
  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Nhà cung cấp"
          title="Nông dân đang và đã hợp tác"
          desc="Xem lịch sử hợp đồng, tổng giá trị giao dịch và điểm uy tín để quyết định mở rộng hợp tác."
        />

        <div className="ent-supplier-grid">
          {enterpriseSuppliers.map((s) => (
            <article className="ent-supplier-card" key={s.id}>
              <div className="ent-supplier-card__top">
                <span>{s.location}</span>
                <StatusBadge status={s.status} />
              </div>
              <h3>{s.name}</h3>
              <p>{s.products.join(' • ')}</p>
              <div className="ent-supplier-card__stats">
                <div>
                  <span>Hợp đồng</span>
                  <strong>{s.completedContracts}/{s.contracts}</strong>
                </div>
                <div>
                  <span>Tổng giá trị</span>
                  <strong>{formatMoney(s.totalValue)}</strong>
                </div>
              </div>
              <div className="ent-rating-card__score" style={{ width: 'fit-content' }}>
                <FiStar /><strong>{s.rating}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default EnterpriseSuppliers;