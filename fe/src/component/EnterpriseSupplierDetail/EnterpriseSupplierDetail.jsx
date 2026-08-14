import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiStar, FiEye, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import SectionHeader from '../EnterpriseDashboard/components/SectionHeader';
import StatusBadge   from '../EnterpriseDashboard/components/StatusBadge';
import EmptyState    from '../EnterpriseDashboard/components/EmptyState';
import { formatMoney, formatDate } from '../EnterpriseDashboard/utils';
import { resolveContractStatusLabel } from '../../constants/contract';
import supplierService from '../../services/supplier.service';
import { SUPPLIER_STATUS_LABEL } from '../EnterpriseDashboard/pages/EnterpriseSuppliers';
import { formatRatingValue } from '../../utils/rating';

const PAGE_SIZE = 5;

function EnterpriseSupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  useEffect(() => { setPage(1); }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    supplierService.getById(id, { page, limit: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        const nextSupplier = res?.data?.supplier || null;
        setSupplier(nextSupplier);
        const next = nextSupplier?.pagination || {};
        setPagination({ total: Number(next.total || 0), totalPages: Number(next.totalPages || 0) });
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Không thể tải thông tin nhà cung cấp.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, page]);

  const contractHistory = supplier?.contractHistory || [];
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const pagedContracts = contractHistory;

  return (
    <div className="ent-stack">
      <div className="ent-page-top-actions">
        <button type="button" className="ent-back-button" onClick={() => navigate('/enterprise/suppliers')}>
          <FiArrowLeft /> Quay lại
        </button>
      </div>

      <section className="ent-card ent-page-shell">
        <SectionHeader
          breadcrumb={{
            items: [
              { label: 'Nhà cung cấp', to: '/enterprise/suppliers' },
              { label: 'Chi tiết nhà cung cấp' },
            ],
          }}
          eyebrow="Nhà cung cấp"
          title={supplier?.name || 'Chi tiết nhà cung cấp'}
          desc={supplier?.location || 'Theo dõi hồ sơ, uy tín và lịch sử hợp tác với nhà cung cấp.'}
        />

        {loading ? (
          <div className="spinner-border text-primary" role="status" />
        ) : error || !supplier ? (
          <EmptyState
            title="Không tìm thấy nhà cung cấp"
            desc={error || 'Nhà cung cấp này không tồn tại hoặc chưa từng hợp tác với bạn.'}
          />
        ) : (
          <>
            <div className="ent-supplier-card__top" style={{ marginBottom: 12 }}>
              <StatusBadge status={SUPPLIER_STATUS_LABEL[supplier.status] || supplier.status} />
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--ent-muted)' }}>
              {supplier.products?.join(' • ') || 'Chưa có sản phẩm'}
            </p>

            <div className="ent-supplier-card__stats" style={{ maxWidth: 480 }}>
              <div>
                <span>Hợp đồng</span>
                <strong>{supplier.completedContracts}/{supplier.contracts}</strong>
              </div>
              <div>
                <span>Tổng giá trị</span>
                <strong>{formatMoney(supplier.totalValue)}</strong>
              </div>
            </div>
            <div className="ent-rating-card__score" style={{ width: 'fit-content', margin: '16px 0 24px' }}>
              <FiStar /><strong>{supplier.hasRatings ? formatRatingValue(supplier.rating, 1) : 'Chưa có đánh giá'}</strong>
            </div>

            <h3 style={{ margin: '0 0 12px', color: 'var(--ent-blue-950)', fontSize: 16, fontWeight: 950 }}>
              Lịch sử hợp đồng
            </h3>
            {contractHistory.length === 0 ? (
              <EmptyState
                title="Chưa có hợp đồng nào"
                desc="Các hợp đồng với nhà cung cấp này sẽ hiển thị tại đây."
              />
            ) : (
              <>
                <div className="ent-table-wrap">
                  <table className="ent-table">
                    <thead>
                      <tr>
                        <th>Mã HĐ</th><th>Nông sản</th><th>Số lượng</th>
                        <th>Giá trị</th><th>Hạn giao</th>
                        <th>Trạng thái</th><th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedContracts.map((c) => (
                        <tr key={c.id}>
                          <td>{c.contractCode}</td>
                          <td>{c.productName}</td>
                          <td>{c.quantity} {c.unit}</td>
                          <td>{formatMoney(c.totalValue)}</td>
                          <td>{formatDate(c.deliveryDate)}</td>
                          <td><StatusBadge status={resolveContractStatusLabel(c)} /></td>
                          <td>
                            <div className="ent-action-group">
                              <button
                                type="button"
                                title="Xem chi tiết"
                                onClick={() => navigate(`/enterprise/contracts/${c.id}`)}
                              >
                                <FiEye />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="ent-pagination">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <FiChevronLeft />
                    </button>
                    <span>Trang {page} / {totalPages}</span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default EnterpriseSupplierDetail;
