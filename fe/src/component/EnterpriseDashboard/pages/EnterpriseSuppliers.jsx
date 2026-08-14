import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import EmptyState    from '../components/EmptyState';
import { useState, useEffect } from 'react';
import { formatMoney } from '../utils';
import supplierService from '../../../services/supplier.service';
import { formatRatingValue } from '../../../utils/rating';

export const SUPPLIER_STATUS_LABEL = {
  active: 'Đang hợp tác',
  inactive: 'Đã hợp tác',
};

function EnterpriseSuppliers() {
  const navigate = useNavigate();
  const [enterpriseSuppliers, setEnterpriseSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supplierService.list({ page, limit: 12 })
      .then((res) => {
        if (!alive) return;
        setEnterpriseSuppliers(res?.data?.suppliers || []);
        const next = res?.data?.pagination || {};
        setPagination({ total: Number(next.total || 0), totalPages: Number(next.totalPages || 0) });
      })
      .catch(() => {
        if (!alive) return;
        setEnterpriseSuppliers([]);
        setPagination({ total: 0, totalPages: 0 });
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page]);

  return (
    <div className="ent-stack">
      <section className="ent-card ent-page-shell">
        <SectionHeader
          breadcrumb="Nhà cung cấp"
          eyebrow="Nhà cung cấp"
          title="Nông dân đang và đã hợp tác"
          desc="Xem lịch sử hợp đồng, tổng giá trị giao dịch và điểm uy tín để quyết định mở rộng hợp tác."
        />

        {loading ? (
          <div className="spinner-border text-primary" role="status" />
        ) : enterpriseSuppliers.length === 0 ? (
          <EmptyState
            title="Chưa có nhà cung cấp nào"
            desc="Nông dân đã hình thành quan hệ hợp tác qua hợp đồng đã ký sẽ hiển thị tại đây."
          />
        ) : (
          <>
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
                  <FiStar /><strong>{s.hasRatings ? formatRatingValue(s.rating, 1) : 'Chưa có đánh giá'}</strong>
                </div>
              </article>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="et-pagination">
              <span>Trang {page} / {pagination.totalPages} — {pagination.total} nhà cung cấp</span>
              <div className="et-pagination-btns">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><FiChevronLeft /> Trước</button>
                <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Sau <FiChevronRight /></button>
              </div>
            </div>
          )}
          </>
        )}
      </section>
    </div>
  );
}

export default EnterpriseSuppliers;