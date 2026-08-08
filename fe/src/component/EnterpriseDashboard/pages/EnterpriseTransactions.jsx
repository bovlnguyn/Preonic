import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiArrowRight, FiBarChart2, FiChevronLeft, FiChevronRight, FiCreditCard, FiFileText, FiShield } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import walletService from '../../../services/wallet.service';
import { formatDate, formatMoney } from '../utils';

const QUICK_LINKS = [
  { key: 'wallet', label: 'Giao dịch ví', path: '/enterprise/wallet', icon: FiCreditCard },
  { key: 'contracts', label: 'Hợp đồng', path: '/enterprise/contracts', icon: FiFileText },
  { key: 'escrow', label: 'Escrow', path: '/enterprise/escrow', icon: FiShield },
];

const TYPE_LABELS = {
  wallet: 'Giao dịch ví',
  contract: 'Hợp đồng',
  escrow: 'Escrow',
};

const TYPE_FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'wallet', label: 'Giao dịch ví' },
  { key: 'contract', label: 'Hợp đồng' },
  { key: 'escrow', label: 'Escrow' },
];

const STATUS_LABELS = {
  completed: 'Hoàn tất',
  pending: 'Đang chờ',
  active: 'Đang hiệu lực',
  approved: 'Đã ký',
  draft: 'Nháp',
  disputed: 'Tranh chấp',
  refunded: 'Đã hoàn tiền',
  cancelled: 'Đã hủy',
};

const statusTone = (status = '') => {
  if (['completed', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'draft'].includes(status)) return 'warning';
  if (['cancelled', 'disputed'].includes(status)) return 'danger';
  return 'neutral';
};

const getDetailPath = (item) => {
  if (item.detailUrl) return item.detailUrl;
  if (item.type === 'contract' && item.referenceId) return `/enterprise/contracts/${item.referenceId}`;
  if (item.type === 'escrow') return '/enterprise/escrow';
  if (item.type === 'wallet') return '/enterprise/wallet';
  return null;
};

const tooltipFormatter = (value, name) => {
  const labels = {
    cost: 'Chi phí',
  };

  return [formatMoney(Number(value || 0)), labels[name] || name];
};

function EnterpriseTransactions() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({
    summary: {
      totalCost: 0,
      totalWalletTransactions: 0,
      totalContracts: 0,
      totalEscrows: 0,
    },
    chart: [],
    recentTransactions: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    walletService.overviewTransactions({ type: typeFilter || undefined, page })
      .then((res) => {
        setOverview(res?.data || {
          summary: {
            totalCost: 0,
            totalWalletTransactions: 0,
            totalContracts: 0,
            totalEscrows: 0,
          },
          chart: [],
          recentTransactions: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        });
        setError('');
      })
      .catch((err) => {
        setError(err?.message || 'Không thể tải tổng quan giao dịch');
      })
      .finally(() => setLoading(false));
  }, [typeFilter, page]);

  const handleTypeFilterChange = (key) => {
    setTypeFilter(key);
    setPage(1);
  };

  const chartData = useMemo(
    () => (overview.chart || []).map((item) => ({
      ...item,
      cost: Number(item.cost || 0),
    })),
    [overview.chart]
  );

  const transactions = overview.recentTransactions || [];
  const summary = overview.summary || {};
  const pagination = overview.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <div className="ent-stack">
      <section className="ent-card et-overview-card">
        <div className="et-header-row">
          <SectionHeader
            eyebrow="Lịch sử giao dịch"
            title="Toàn bộ dòng tiền của doanh nghiệp"
            desc="Xem lịch sử ví, trạng thái hợp đồng và tiến độ escrow trên cùng một trang."
          />

          <div className="et-quick-links">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="spinner-border text-primary" role="status" />
        ) : error ? (
          <EmptyState title="Không tải được dữ liệu" desc={error} />
        ) : (
          <>
            <div className="et-summary-grid et-summary-grid--compact">
              <article>
                <span>Tổng chi tiêu</span>
                <strong>{formatMoney(summary.totalCost)}</strong>
                <small>Tiền ký quỹ và giao dịch đi ra</small>
              </article>
              <article>
                <span>Tổng bản ghi</span>
                <strong>
                  {(Number(summary.totalWalletTransactions || 0)
                    + Number(summary.totalContracts || 0)
                    + Number(summary.totalEscrows || 0)).toLocaleString('vi-VN')}
                </strong>
                <small>Ví, hợp đồng và escrow</small>
              </article>
            </div>

            <section className="et-chart-card">
              <div className="et-chart-title">
                <div>
                  <span><FiBarChart2 size={15} /> Biểu đồ chi tiêu theo tháng</span>
                  <p>Đơn vị tính: triệu đồng</p>
                </div>
              </div>

              <div className="et-chart-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => Number(value / 1000000).toLocaleString('vi-VN')} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend />
                    <Bar dataKey="cost" name="Chi phí" fill="#facc15" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="ent-filter-row">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.key || 'all'}
                  type="button"
                  className={typeFilter === f.key ? 'active' : ''}
                  onClick={() => handleTypeFilterChange(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ent-table-wrap">
              <table className="ent-table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Loại</th>
                    <th>Nội dung</th>
                    <th>Ngày</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => {
                    const detailPath = getDetailPath(item);
                    const amount = Number(item.amount || 0);

                    return (
                      <tr key={`${item.type}-${item.id}`}>
                        <td>{item.title || item.id}</td>
                        <td>{TYPE_LABELS[item.type] || item.type}</td>
                        <td>{item.description}</td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td className={amount < 0 ? 'ent-money ent-money--down' : 'ent-money ent-money--up'}>
                          {amount > 0 ? '+' : ''}{formatMoney(amount)}
                        </td>
                        <td>
                          <span className={`ent-badge ent-badge--${statusTone(item.status)}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </td>
                        <td>
                          {detailPath && (
                            <button
                              type="button"
                              className="et-detail-btn"
                              onClick={() => navigate(detailPath)}
                            >
                              Xem <FiArrowRight size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {transactions.length === 0 && (
                <EmptyState
                  title="Chưa có giao dịch nào"
                  desc="Khi có nạp ví, hợp đồng hoặc escrow, dữ liệu sẽ hiển thị tại đây."
                />
              )}
            </div>

            {transactions.length > 0 && (
              <div className="et-pagination">
                <span>
                  Trang {pagination.page} / {pagination.totalPages} — {pagination.total.toLocaleString('vi-VN')} giao dịch
                </span>
                <div className="et-pagination-btns">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <FiChevronLeft size={14} /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  >
                    Sau <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default EnterpriseTransactions;
