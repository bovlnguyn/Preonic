import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye } from 'react-icons/fi';
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

function FarmerContracts() {
  const navigate = useNavigate();
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

  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và hợp đồng mua bán"
          desc="Ký xác nhận hoặc từ chối các đề xuất hợp đồng từ doanh nghiệp."
        />

        <div className="farmer-filter-row">
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
            desc="Các đề xuất hợp đồng từ doanh nghiệp sẽ hiển thị tại đây."
          />
        ) : (
          <div className="farmer-table-wrap">
            <table className="farmer-table">
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
                {filtered.map((item) => (
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
        )}
      </section>
    </div>
  );
}

export default FarmerContracts;
