import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiEye } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import { resolveContractStatusLabel } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';

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
  const [tab, setTab] = useState('all');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    contractService.list()
      .then((res) => setContracts(res?.data?.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (tab === 'all' ? contracts : contracts.filter((c) => c.status === tab)),
    [contracts, tab],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / CONTRACTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paginatedContracts = useMemo(() => {
    const start = (safePage - 1) * CONTRACTS_PER_PAGE;
    return filtered.slice(start, start + CONTRACTS_PER_PAGE);
  }, [filtered, safePage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

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
        ) : filtered.length === 0 ? (
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
                  {paginatedContracts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.contractCode}</td>
                      <td>{item.enterprise?.name}</td>
                      <td>{item.product?.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatMoney(item.totalValue)}</td>
                      <td>{formatDate(item.deliveryDate)}</td>
                      <td><StatusBadge status={resolveContractStatusLabel(item)} /></td>
                      <td>
                        <div className="farmer-action-group">
                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() => navigate(`/farmer/contracts/${item.id}`)}
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
                Trang {safePage} / {totalPages} — {filtered.length.toLocaleString('vi-VN')} hợp đồng
              </span>
              <div className="farmer-pagination__buttons">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <FiChevronLeft size={14} /> Trước
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
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
