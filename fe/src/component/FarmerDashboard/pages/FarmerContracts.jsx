import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiEye } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { resolveContractStatusLabel } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';
import useContractList from '../../../hooks/useContractList';

const TABS = [
  { key: 'all',       label: 'Tất cả' },
  { key: 'pending',   label: 'Chờ ký xác nhận' },
  { key: 'approved',  label: 'Đã ký — chờ ký quỹ' },
  { key: 'active',    label: 'Đang hiệu lực' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'disputed',  label: 'Tranh chấp' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const CONTRACTS_PER_PAGE = 10;

function FarmerContracts() {
  const navigate = useNavigate();
  const {
    tab,
    contracts,
    loading,
    page,
    pagination,
    totalPages,
    setPage,
    handleTabChange,
  } = useContractList({ pageSize: CONTRACTS_PER_PAGE });

  return (
    <div className="farmer-stack">
      <section className="farmer-card fct-shell">
        <SectionHeader
          breadcrumb="Hợp đồng"
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và hợp đồng mua bán"
          desc="Ký xác nhận hoặc từ chối các đề xuất hợp đồng từ doanh nghiệp."
        />

        <div className="farmer-filter-row fct-filters">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => handleTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : contracts.length === 0 ? (
          <EmptyState
            title="Chưa có hợp đồng nào"
            desc="Các đề xuất hợp đồng từ doanh nghiệp sẽ hiển thị tại đây."
          />
        ) : (
          <>
            <div className="farmer-table-wrap fct-table-wrap">
              <table className="farmer-table fct-table">
                <thead>
                  <tr>
                    <th>Mã HĐ</th>
                    <th>Doanh nghiệp</th>
                    <th>Nông sản</th>
                    <th>Số lượng</th>
                    <th>Giá trị</th>
                    <th>Hạn giao</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contractCode}</td>
                      <td>{c.enterprise?.name}</td>
                      <td>{c.product?.name}</td>
                      <td>{c.quantity} {c.unit}</td>
                      <td>{formatMoney(c.totalValue)}</td>
                      <td>{formatDate(c.deliveryDate)}</td>
                      <td><StatusBadge status={resolveContractStatusLabel(c)} /></td>
                      <td>
                        <div className="farmer-action-group">
                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() => navigate(`/farmer/contracts/${c.id}`)}
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

            <div className="farmer-pagination">
              <span>
                Trang {page} / {totalPages} — {pagination.total.toLocaleString('vi-VN')} hợp đồng
              </span>
              <div className="farmer-pagination__buttons">
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

export default FarmerContracts;
