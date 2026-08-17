import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiLock, FiClock, FiActivity, FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import ProgressBar   from '../components/ProgressBar';
import EmptyState    from '../components/EmptyState';
import useEscrowDashboard from '../../../hooks/useEscrowDashboard';
import { ESCROW_STATUS_LABEL, getCurrentMilestoneLabel } from '../../../constants/escrow';
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

function EnterpriseEscrow() {
  const navigate = useNavigate();
  const {
    escrows, loading, tab, changeTab, page, setPage, pagination, summary,
  } = useEscrowDashboard({ pageSize: 6 });

  const stats = {
    deposited: Number(summary.totalDeposited || 0),
    pending: Number(summary.pendingAmount || 0),
    activeCount: Number(summary.activeCount || 0),
  };
  const filteredEscrows = escrows;

  return (
    <div className="ent-stack">
      <SectionHeader
        breadcrumb="Thanh toán trung gian"
        eyebrow="Ký quỹ & Giải ngân"
        title="Thanh toán trung gian"
        desc="Theo dõi toàn bộ giao dịch ký quỹ, số tiền đang được bảo vệ và các mốc giải ngân."
      />

      {loading ? (
        <div className="spinner-border text-primary" role="status" />
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
                onClick={() => changeTab(t.key)}
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
                    <p>{e.productName} — {getCurrentMilestoneLabel(e)}</p>
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
              {pagination.totalPages > 1 && (
                <div className="et-pagination">
                  <span>Trang {page} / {pagination.totalPages} — {pagination.total} giao dịch</span>
                  <div className="et-pagination-btns">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><FiChevronLeft /> Trước</button>
                    <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Sau <FiChevronRight /></button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default EnterpriseEscrow;
