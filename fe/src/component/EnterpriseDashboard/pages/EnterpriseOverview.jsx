import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiFileText, FiLayers, FiPlus, FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { useState, useEffect } from 'react';
import contractService from '../../../services/contract.service';
import { formatDate, formatMoney } from '../utils';

const STAT_ICONS = {
  'total-contracts': FiFileText,
  'active-contracts': FiLayers,
  'escrow-locked': FiCreditCard,
  reputation: FiStar,
};

function EnterpriseOverview() {
  const navigate = useNavigate();
  const [stats] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [contractSummary, setContractSummary] = useState({
    totalContracts: 0,
    totalContractValue: 0,
  });
  const [orders] = useState([]);

  useEffect(() => {
    Promise.all([
      contractService.list(undefined, { limit: 100 }),
      contractService.summary(),
      // Khi có API orders: orderService.list()
    ])
      .then(([contractsRes, summaryRes]) => {
        const list = contractsRes?.data?.contracts;
        setContracts(Array.isArray(list) ? list : []);
        setContractSummary(summaryRes?.data?.summary || {
          totalContracts: 0,
          totalContractValue: 0,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="ent-stack">

      {/* Hero */}
      <section className="ent-hero-card">
        <div>
          <span className="ent-eyebrow ent-eyebrow--light">Tổng quan doanh nghiệp</span>
          <h2>Kiểm soát thu mua, hợp đồng và dòng vốn trên một dashboard.</h2>
          <p>
            Theo dõi toàn bộ chuỗi cung ứng từ tìm nguồn cung đến giải ngân escrow.
            Khi backend hoàn thiện, dữ liệu thật sẽ thay thế mock data tự động.
          </p>
          <div className="ent-hero-card__actions">
            <button type="button" onClick={() => navigate('/enterprise/products')}>
              <FiPlus /> Tìm nguồn cung
            </button>
            <button type="button" onClick={() => navigate('/enterprise/contracts')}>
              Xem hợp đồng
            </button>
          </div>
        </div>
        <div className="ent-hero-card__panel">
          <span>Tổng giá trị hợp đồng</span>
          <strong>{formatMoney(contractSummary.totalContractValue)}</strong>
          <p>
            {contractSummary.totalContracts > 0
              ? `Từ ${contractSummary.totalContracts} hợp đồng chưa hủy.`
              : 'Chưa có hợp đồng nào trong hệ thống.'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="ent-grid ent-grid--4">
        {stats.map((item) => (
          <StatCard
            key={item.id}
            icon={STAT_ICONS[item.id]}
            label={item.label}
            value={item.value}
            change={item.change}
            tone={item.tone}
          />
        ))}
      </section>

      {/* Mini-lists */}
      <section className="ent-grid ent-grid--2">
        <div className="ent-card">
          <SectionHeader
            eyebrow="Hợp đồng nổi bật"
            title="Hợp đồng cần theo dõi"
            desc="Ưu tiên các hợp đồng gần hạn giao hoặc đang ở bước escrow quan trọng."
          />
          <div className="ent-mini-list">
            {contracts.slice(0, 3).map((c) => (
              <article key={c.id} className="ent-mini-item">
                <div>
                  <strong>{c.id} — {c.product?.name}</strong>
                  <span>{c.farmer?.name} • {formatMoney(c.totalValue)} • {formatDate(c.deliveryDate)}</span>
                  <ProgressBar value={c.progress} />
                </div>
                <StatusBadge status={c.status} />
              </article>
            ))}
          </div>
        </div>

        <div className="ent-card">
          <SectionHeader
            eyebrow="Đơn hàng gần đây"
            title="Luồng giao nhận mới nhất"
            desc="Theo dõi milestone vận chuyển và kiểm tra chất lượng để tránh trễ tiến độ."
          />
          <div className="ent-mini-list">
            {orders.map((o) => (
              <article key={o.id} className="ent-mini-item">
                <div>
                  <strong>{o.id} • {o.product}</strong>
                  <span>{o.farmer} • {o.milestone}</span>
                  <ProgressBar value={o.status.includes('vận chuyển') ? 60 : o.status.includes('kiểm tra') ? 80 : 40} />
                </div>
                <StatusBadge status={o.status} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contracts table */}
      <section className="ent-card">
        <SectionHeader
          eyebrow="Hợp đồng"
          title="Các hợp đồng đang hoạt động"
          desc="Frontend dùng mock data. Khi backend xong, phần này thay bằng contract API."
        />
        <div className="ent-table-wrap">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Mã HĐ</th><th>Nông dân</th><th>Nông sản</th>
                <th>Giá trị</th><th>Hạn giao</th><th>Tiến độ</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.farmer?.name}</td>
                  <td>{c.product?.name}</td>
                  <td>{formatMoney(c.totalValue)}</td>
                  <td>{formatDate(c.deliveryDate)}</td>
                  <td className="ent-table__progress"><ProgressBar value={c.progress} /></td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

export default EnterpriseOverview;
