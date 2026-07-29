import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiLock, FiClock, FiActivity, FiCheck } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import ProgressBar   from '../components/ProgressBar';
import EmptyState    from '../components/EmptyState';
import escrowService from '../../../services/escrow.service';
import { ESCROW_STATUS_LABEL } from '../../../constants/escrow';
import { formatMoney } from '../utils';
import './EnterpriseEscrow.css';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'all', label: 'Tất cả' },
];

const PROCESS_STEPS = [
  { num: 1, title: 'Ký hợp đồng', desc: 'Xác nhận điều khoản bao tiêu với nông dân' },
  { num: 2, title: 'Nạp ký quỹ', desc: 'Bạn nạp tiền ký quỹ vào PreOnic' },
  { num: 3, title: 'Chờ giao hàng', desc: 'Nông dân xác nhận đã giao hàng theo thỏa thuận' },
  { num: 4, title: 'Kiểm tra chất lượng', desc: 'Bạn kiểm tra chất lượng, xác nhận đạt' },
  { num: 5, title: 'Giải ngân', desc: 'Tiền tự động chuyển cho nông dân' },
];

const PROTECTION_POINTS = [
  'Chỉ giải ngân khi nông dân giao hàng đúng cam kết',
  'Kiểm tra chất lượng trước khi xác nhận giải ngân',
  'Ký quỹ được giữ minh bạch tại PreOnic, không giao thẳng cho nông dân',
  'Có tranh chấp? Admin PreOnic phân xử công bằng',
];

// Mốc tiếp theo chưa hoàn tất — hiển thị "đang chờ ở bước nào" trên thẻ tóm tắt.
const currentMilestoneLabel = (escrow) => {
  const next = (escrow.milestones || []).find((m) => m.status !== 'completed');
  return next ? next.name : 'Đã hoàn tất tất cả các mốc';
};

function EnterpriseEscrow() {
  const navigate = useNavigate();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    escrowService.list()
      .then((res) => setEscrows(res?.data?.escrows || []))
      .catch(() => setEscrows([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const deposited = escrows.reduce((sum, e) => sum + Number(e.depositedAmount || 0), 0);
    const activeEscrows = escrows.filter((e) => e.status === 'active');
    const pending = activeEscrows.reduce(
      (sum, e) => sum + (Number(e.totalAmount || 0) - Number(e.releasedAmount || 0)),
      0
    );
    return { deposited, pending, activeCount: activeEscrows.length };
  }, [escrows]);

  const filteredEscrows = useMemo(() => {
    if (tab === 'active') return escrows.filter((e) => e.status === 'active');
    if (tab === 'completed') return escrows.filter((e) => e.status === 'completed');
    return escrows;
  }, [escrows, tab]);

  return (
    <div className="ent-stack">
      <div className="ee-breadcrumb">
        <span onClick={() => navigate('/enterprise')} style={{ cursor: 'pointer' }}>Trang chủ</span>
        <span> › </span>
        <span>Thanh toán trung gian</span>
      </div>

      <SectionHeader
        title="Thanh toán trung gian"
        desc="Theo dõi toàn bộ giao dịch ký quỹ và các mốc giải ngân"
      />

      {loading ? (
        <div className="spinner-border text-success" role="status" />
      ) : (
        <>
          <div className="ee-stats-row">
            <div className="ee-stat-card">
              <span className="ee-stat-card__icon ee-stat-card__icon--blue"><FiLock /></span>
              <div>
                <label>Đã ký quỹ</label>
                <strong>{formatMoney(stats.deposited)}</strong>
                <span>Tổng ký quỹ</span>
              </div>
            </div>
            <div className="ee-stat-card">
              <span className="ee-stat-card__icon ee-stat-card__icon--gold"><FiClock /></span>
              <div>
                <label>Chờ giải ngân</label>
                <strong>{formatMoney(stats.pending)}</strong>
                <span>Đang giữ trong escrow</span>
              </div>
            </div>
            <div className="ee-stat-card">
              <span className="ee-stat-card__icon ee-stat-card__icon--green"><FiActivity /></span>
              <div>
                <label>Escrow hoạt động</label>
                <strong>{stats.activeCount}</strong>
                <span>giao dịch</span>
              </div>
            </div>
          </div>

          <nav className="ee-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={tab === t.key ? 'active' : ''}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === 'overview' ? (
            <>
              <section className="ent-card">
                <h3 className="ee-section-title">Quy trình ký quỹ &amp; giải ngân</h3>
                <div className="ee-process">
                  {PROCESS_STEPS.map((step, idx) => (
                    <React.Fragment key={step.num}>
                      <div className="ee-process__step">
                        <span className="ee-process__circle">{step.num}</span>
                        <strong>{step.title}</strong>
                        <p>{step.desc}</p>
                      </div>
                      {idx < PROCESS_STEPS.length - 1 && <span className="ee-process__line" />}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <section className="ent-card ee-protect-card">
                <h3><FiShield size={16} /> Bảo vệ quyền lợi doanh nghiệp</h3>
                <ul>
                  {PROTECTION_POINTS.map((point) => (
                    <li key={point}><FiCheck size={13} /> {point}</li>
                  ))}
                </ul>
              </section>
            </>
          ) : filteredEscrows.length === 0 ? (
            <section className="ent-card">
              <EmptyState
                title="Chưa có ký quỹ nào"
                desc="Nạp ký quỹ từ trang chi tiết hợp đồng sau khi hợp đồng được ký đầy đủ hai bên."
              />
            </section>
          ) : (
            <section className="ent-card">
              <div className="ent-escrow-grid">
                {filteredEscrows.map((e) => (
                  <article
                    className="ent-escrow-card"
                    key={e.id}
                    onClick={() => navigate(`/enterprise/contracts/${e.contractId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="ent-escrow-card__icon"><FiShield /></div>
                    <div className="ent-escrow-card__top">
                      <div>
                        <span>{e.contractCode}</span>
                        <h3>{e.partnerName}</h3>
                      </div>
                      <span className={`ent-badge ent-badge--${e.status === 'completed' ? 'success' : e.status === 'active' ? 'info' : 'neutral'}`}>
                        {ESCROW_STATUS_LABEL[e.status] || e.status}
                      </span>
                    </div>
                    <p>{e.productName} — {currentMilestoneLabel(e)}</p>
                    <div className="ent-escrow-card__money">
                      <div>
                        <span>Tổng ký quỹ</span>
                        <strong>{formatMoney(e.totalAmount)}</strong>
                      </div>
                      <div>
                        <span>Đã giải ngân</span>
                        <strong>{formatMoney(e.releasedAmount)}</strong>
                      </div>
                    </div>
                    <ProgressBar value={e.progress?.percentReleased || 0} />
                    <small>Đã giải ngân {e.progress?.percentReleased || 0}% · {e.progress?.completedMilestones || 0}/{e.progress?.totalMilestones || 5} mốc</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default EnterpriseEscrow;
