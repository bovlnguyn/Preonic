import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiTrash2 } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import EmptyState    from '../components/EmptyState';
import contractService from '../../../services/contract.service';
import { resolveContractStatusLabel } from '../../../constants/contract';
import { formatDate, formatMoney } from '../utils';
import { useToast } from '../../../contexts/ToastContext';

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
      <section className="ent-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và mua bán nông sản"
          desc="Xem tiến trình ký xác nhận và theo dõi tình trạng từng hợp đồng đã đề xuất."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            className="ent-btn-primary"
            onClick={() => navigate('/enterprise/products')}
          >
            + Tạo hợp đồng mới
          </button>
        </div>

        <div className="ent-filter-row">
          {TABS.map((t) => (
            <button key={t.key} type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Chưa có hợp đồng nào"
            desc="Các hợp đồng bạn đề xuất với nông dân sẽ hiển thị tại đây."
          />
        ) : (
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
                {filtered.map((c) => (
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
        )}
      </section>
    </div>
  );
}

export default EnterpriseContracts;
