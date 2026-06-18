import React, { useMemo, useState } from 'react';
import { FiDownload, FiEye } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import ProgressBar   from '../components/ProgressBar';
import { enterpriseContracts } from '../data/enterpriseMockData';
import { formatDate, formatMoney } from '../utils';

const TABS = [
  { key: 'all',       label: 'Tất cả' },
  { key: 'active',    label: 'Đang thực hiện' },
  { key: 'pending',   label: 'Chờ giao hàng' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const matchTab = (status = '', tab) => {
  if (tab === 'all')       return true;
  if (tab === 'active')    return status.includes('thực hiện');
  if (tab === 'pending')   return status.includes('chờ');
  if (tab === 'completed') return status.includes('hoàn thành');
  if (tab === 'cancelled') return status.includes('hủy');
  return true;
};

function EnterpriseContracts() {
  const [tab, setTab] = useState('all');
  const filtered = useMemo(
    () => enterpriseContracts.filter((c) => matchTab(c.status.toLowerCase(), tab)),
    [tab],
  );

  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Theo dõi hợp đồng bao tiêu và mua bán nông sản"
          desc="Khi backend hoàn thiện, trang này cho phép ký/từ chối/hủy hợp đồng và nối escrow thật."
        />

        <div className="ent-filter-row">
          {TABS.map((t) => (
            <button key={t.key} type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </div>

        <div className="ent-table-wrap">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Mã HĐ</th><th>Nông dân</th><th>Nông sản</th><th>Số lượng</th>
                <th>Giá trị</th><th>Ngày ký</th><th>Hạn giao</th>
                <th>Tiến độ</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.farmer}</td>
                  <td>{c.product}</td>
                  <td>{c.quantity}</td>
                  <td>{formatMoney(c.value)}</td>
                  <td>{formatDate(c.signedDate)}</td>
                  <td>{formatDate(c.deliveryDate)}</td>
                  <td className="ent-table__progress"><ProgressBar value={c.progress} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <div className="ent-action-group">
                      <button type="button" title="Xem chi tiết"><FiEye /></button>
                      <button type="button" title="Tải hợp đồng"><FiDownload /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EnterpriseContracts;