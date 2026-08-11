import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiEye, FiTrash2 } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import EmptyState    from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import { resolveContractStatusLabel } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';
import { useToast } from '../../../contexts/ToastContext';

const PAGE_SIZE = 8;

const TABS = [
  { key: 'all',       label: 'Tất cả' },
  { key: 'draft',     label: 'Nháp' },
  { key: 'pending',   label: 'Chờ ký xác nhận' },
  { key: 'approved',  label: 'Đã ký — chờ ký quỹ' },
  { key: 'active',    label: 'Đang thực hiện' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'disputed',  label: 'Tranh chấp' },
  { key: 'cancelled', label: 'Đã hủy' },
];

function EnterpriseContracts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    contractService.list()
      .then(res => setContracts(res?.data?.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (tab === 'all' ? contracts : contracts.filter((c) => c.status === tab)),
    [contracts, tab],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginatedContracts = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filtered.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filtered, page]);

  // Nếu xóa hợp đồng cuối cùng của một trang, tự lùi về trang còn dữ liệu.
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

  // Hợp đồng nháp chưa từng gửi cho nông dân -- xóa hẳn thay vì hủy
  const handleDelete = async (contract) => {
    if (!window.confirm(`Xóa hợp đồng nháp ${contract.contractCode}? Hành động này không thể hoàn tác.`)) return;
    try {
      await contractService.remove(contract.id);
      setContracts(prev => prev.filter(c => c.id !== contract.id));
      toast.success('Đã xóa hợp đồng nháp');
    } catch (err) {
      toast.error(err?.message || 'Xóa hợp đồng thất bại.');
    }
  };

  return (
    <div className="ent-stack">
      <section className="ent-card ent-page-shell">
        <SectionHeader
          breadcrumb="Hợp đồng"
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và mua bán nông sản"
          desc="Xem tiến trình ký xác nhận và theo dõi tình trạng từng hợp đồng đã đề xuất."
          action={
            <button
              type="button"
              className="ent-btn-primary"
              onClick={() => navigate('/enterprise/products')}
            >
              + Tạo hợp đồng mới
            </button>
          }
        />

        <div className="ent-filter-row">
          {TABS.map((t) => (
            <button key={t.key} type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => handleTabChange(t.key)}
            >{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-border text-primary" role="status" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Chưa có hợp đồng nào"
            desc="Các hợp đồng bạn đề xuất với nông dân sẽ hiển thị tại đây."
          />
        ) : (
          <>
            <div className="ent-table-wrap">
              <table className="ent-table">
                <thead>
                  <tr>
                    <th>Mã HĐ</th><th>Nông dân</th><th>Nông sản</th><th>Số lượng</th>
                    <th>Giá trị</th><th>Hạn giao</th>
                    <th>Trạng thái</th><th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contractCode}</td>
                      <td>{c.farmer?.name}</td>
                      <td>{c.product?.name}</td>
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
                          {c.status === 'draft' && (
                            <button
                              type="button"
                              title="Xóa hợp đồng nháp"
                              onClick={() => handleDelete(c)}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="et-pagination">
              <span>
                Trang {page} / {totalPages} — {filtered.length.toLocaleString('vi-VN')} hợp đồng
              </span>
              <div className="et-pagination-btns">
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

export default EnterpriseContracts;
