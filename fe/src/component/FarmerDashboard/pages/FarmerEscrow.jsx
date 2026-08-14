import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiGift, FiClock, FiActivity, FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import escrowService from '../../../services/escrow.service';
import { ESCROW_STATUS_LABEL } from '../../../constants/escrow';
import { formatMoney } from '../utils';
import './FarmerEscrow.css';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'all', label: 'Tất cả' },
];

const PROCESS_STEPS = [
  { num: 1, title: 'Ký hợp đồng', desc: 'Xác nhận điều khoản bao tiêu với doanh nghiệp' },
  { num: 2, title: 'DN ký quỹ', desc: 'Doanh nghiệp nạp tiền ký quỹ vào PreOnic' },
  { num: 3, title: 'Giao hàng', desc: 'Bạn xác nhận đã giao hàng theo đúng thỏa thuận' },
  { num: 4, title: 'DN kiểm tra', desc: 'Doanh nghiệp kiểm tra chất lượng, xác nhận đạt' },
  { num: 5, title: 'Nhận tiền', desc: 'Tiền tự động chuyển vào tài khoản của bạn' },
];

const PROTECTION_POINTS = [
  'Tiền đã được doanh nghiệp ký quỹ trước — đảm bảo thanh toán',
  'Giao hàng đúng cam kết = tự động nhận tiền theo mốc',
  'Doanh nghiệp không thể tự rút tiền đã ký quỹ',
  'Có tranh chấp? Admin PreOnic phân xử công bằng',
];

// Mốc tiếp theo chưa hoàn tất — hiển thị "đang chờ ở bước nào" trên thẻ tóm tắt.
const currentMilestoneLabel = (escrow) => {
  const next = (escrow.milestones || []).find((m) => m.status !== 'completed');
  return next ? next.name : 'Đã hoàn tất tất cả các mốc';
};

function FarmerEscrow() {
  const navigate = useNavigate();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({ totalReleased: 0, pendingAmount: 0, activeCount: 0 });

  useEffect(() => {
    escrowService.summary()
      .then((res) => setSummary(res?.data?.summary || { totalReleased: 0, pendingAmount: 0, activeCount: 0 }))
      .catch(() => setSummary({ totalReleased: 0, pendingAmount: 0, activeCount: 0 }));
  }, []);

  useEffect(() => {
    if (tab === 'overview') {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    escrowService.list({
      page,
      limit: 6,
      ...(tab === 'active' || tab === 'completed' ? { status: tab } : {}),
    })
      .then((res) => {
        if (!alive) return;
        setEscrows(res?.data?.escrows || []);
        const next = res?.data?.pagination || {};
        setPagination({ total: Number(next.total || 0), totalPages: Number(next.totalPages || 0) });
      })
      .catch(() => {
        if (!alive) return;
        setEscrows([]);
        setPagination({ total: 0, totalPages: 0 });
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, page]);

  const stats = {
    received: Number(summary.totalReleased || 0),
    pending: Number(summary.pendingAmount || 0),
    activeCount: Number(summary.activeCount || 0),
  };
  const filteredEscrows = escrows;

  return (
    <div className="farmer-stack">
      <SectionHeader
        breadcrumb="Thanh toán trung gian"
        eyebrow="Ký quỹ & Giải ngân"
        title="Thanh toán trung gian"
        desc="Theo dõi toàn bộ giao dịch ký quỹ và các mốc giải ngân"
      />

      {loading ? (
        <div className="spinner-border text-success" role="status" />
      ) : (
        <>
          <div className="fe-stats-row">
            <div className="fe-stat-card">
              <span className="fe-stat-card__icon fe-stat-card__icon--green"><FiGift /></span>
              <div>
                <label>Đã nhận</label>
                <strong>{formatMoney(stats.received)}</strong>
                <span>Tổng giải ngân</span>
              </div>
            </div>
            <div className="fe-stat-card">
              <span className="fe-stat-card__icon fe-stat-card__icon--gold"><FiClock /></span>
              <div>
                <label>Chờ giải ngân</label>
                <strong>{formatMoney(stats.pending)}</strong>
                <span>Đang giữ trong escrow</span>
              </div>
            </div>
            <div className="fe-stat-card">
              <span className="fe-stat-card__icon fe-stat-card__icon--blue"><FiActivity /></span>
              <div>
                <label>Escrow hoạt động</label>
                <strong>{stats.activeCount}</strong>
                <span>giao dịch</span>
              </div>
            </div>
          </div>

          <nav className="fe-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={tab === t.key ? 'active' : ''}
                onClick={() => { setTab(t.key); setPage(1); }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === 'overview' ? (
            <>
              <section className="farmer-card">
                <h3 className="fe-section-title">Quy trình nhận thanh toán</h3>
                <div className="fe-process">
                  {PROCESS_STEPS.map((step, idx) => (
                    <React.Fragment key={step.num}>
                      <div className="fe-process__step">
                        <span className="fe-process__circle">{step.num}</span>
                        <strong>{step.title}</strong>
                        <p>{step.desc}</p>
                      </div>
                      {idx < PROCESS_STEPS.length - 1 && <span className="fe-process__line" />}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              <section className="farmer-card fe-protect-card">
                <h3><FiShield size={16} /> Bảo vệ quyền lợi nông dân</h3>
                <ul>
                  {PROTECTION_POINTS.map((point) => (
                    <li key={point}><FiCheck size={13} /> {point}</li>
                  ))}
                </ul>
              </section>
            </>
          ) : filteredEscrows.length === 0 ? (
            <section className="farmer-card">
              <EmptyState
                title="Chưa có ký quỹ nào"
                desc="Ký quỹ sẽ xuất hiện tại đây sau khi doanh nghiệp nạp tiền cho hợp đồng đã ký."
              />
            </section>
          ) : (
            <section className="farmer-card">
              <div className="farmer-escrow-grid">
                {filteredEscrows.map((item) => (
                  <article
                    className="farmer-escrow-card"
                    key={item.id}
                    onClick={() => navigate(`/farmer/contracts/${item.contractId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="farmer-escrow-card__icon"><FiShield /></div>
                    <div className="farmer-escrow-card__top">
                      <div>
                        <span>{item.contractCode}</span>
                        <h3>{item.partnerName}</h3>
                      </div>
                      <span className={`farmer-badge farmer-badge--${item.status === 'completed' ? 'success' : item.status === 'active' ? 'info' : 'neutral'}`}>
                        {ESCROW_STATUS_LABEL[item.status] || item.status}
                      </span>
                    </div>
                    <p>{item.productName} — {currentMilestoneLabel(item)}</p>
                    <div className="farmer-escrow-card__money">
                      <div>
                        <span>Tổng ký quỹ</span>
                        <strong>{formatMoney(item.totalAmount)}</strong>
                      </div>
                      <div>
                        <span>Đã giải ngân</span>
                        <strong>{formatMoney(item.releasedAmount)}</strong>
                      </div>
                    </div>
                    <ProgressBar value={item.progress?.percentReleased || 0} />
                    <small>Đã giải ngân {item.progress?.percentReleased || 0}% · {item.progress?.completedMilestones || 0}/{item.progress?.totalMilestones || 5} mốc</small>
                  </article>
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <div className="farmer-pagination">
                  <span>Trang {page} / {pagination.totalPages} — {pagination.total} giao dịch</span>
                  <div className="farmer-pagination__buttons">
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

export default FarmerEscrow;
