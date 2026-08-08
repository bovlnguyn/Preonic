import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import EmptyState    from '../components/EmptyState';
import { useState, useEffect } from 'react';
import { formatMoney } from '../utils';
import supplierService from '../../../services/supplier.service';

export const SUPPLIER_STATUS_LABEL = {
  active: 'Đang hợp tác',
  inactive: 'Đã hợp tác',
};

function EnterpriseSuppliers() {
  const navigate = useNavigate();
  const [enterpriseSuppliers, setEnterpriseSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierService.list()
      .then(res => setEnterpriseSuppliers(res?.data?.suppliers || []))
      .catch(() => setEnterpriseSuppliers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Nhà cung cấp"
          title="Nông dân đang và đã hợp tác"
          desc="Xem lịch sử hợp đồng, tổng giá trị giao dịch và điểm uy tín để quyết định mở rộng hợp tác."
        />

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : enterpriseSuppliers.length === 0 ? (
          <EmptyState
            title="Chưa có nhà cung cấp nào"
            desc="Nông dân bạn từng đề xuất hoặc ký hợp đồng cùng sẽ hiển thị tại đây."
          />
        ) : (
          <div className="ent-supplier-grid">
            {enterpriseSuppliers.map((s) => (
              <article
                className="ent-supplier-card"
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/enterprise/suppliers/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/enterprise/suppliers/${s.id}`);
                }}
              >
                <div className="ent-supplier-card__top">
                  <span>{s.location}</span>
                  <StatusBadge status={SUPPLIER_STATUS_LABEL[s.status] || s.status} />
                </div>
                <h3>{s.name}</h3>
                <p>{s.products.join(' • ') || 'Chưa có sản phẩm'}</p>
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
                  <FiStar /><strong>{s.rating.toFixed(1)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default EnterpriseSuppliers;