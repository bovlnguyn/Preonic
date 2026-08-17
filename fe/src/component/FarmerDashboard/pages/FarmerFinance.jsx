import React from 'react';
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
import {
  FiArrowRight, FiBarChart2, FiChevronLeft, FiChevronRight,
  FiCreditCard, FiFileText, FiShield,
} from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import useTransactionOverview from '../../../hooks/useTransactionOverview';
import { TRANSACTION_STATUS_LABELS, getTransactionStatusTone } from '../../../utils/transactions';
import { formatDate, formatMoney } from '../utils';
import './FarmerFinance.css';

const QUICK_LINKS = [
  { key: 'contracts', label: 'Hợp đồng', path: '/farmer/contracts', icon: FiFileText },
  { key: 'wallet', label: 'Ví & Thanh toán', path: '/farmer/wallet', icon: FiCreditCard },
  { key: 'escrow', label: 'Thanh toán trung gian', path: '/farmer/escrow', icon: FiShield },
];

const TYPE_LABELS = {
  wallet: 'Nạp / Rút tiền',
  contract: 'Hợp đồng',
  escrow: 'Ký quỹ / Giải ngân',
};

const TYPE_FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'contract', label: 'Hợp đồng' },
  { key: 'wallet', label: 'Nạp / Rút tiền' },
  { key: 'escrow', label: 'Ký quỹ / Giải ngân' },
];

const getDetailPath = (item) => {
  if (item.detailUrl) return item.detailUrl;
  if (item.type === 'contract' && item.referenceId) return `/farmer/contracts/${item.referenceId}`;
  if (item.type === 'escrow') return '/farmer/escrow';
  if (item.type === 'wallet') return '/farmer/wallet';
  return null;
};

const tooltipFormatter = (value, name) => {
  const labels = {
    revenue: 'Doanh thu',
  };

  return [formatMoney(Number(value || 0)), labels[name] || name];
};

function FarmerFinance() {
  const navigate = useNavigate();
  const {
    loading, error, typeFilter, setPage, handleTypeFilterChange,
    chartData, transactions, summary, pagination,
  } = useTransactionOverview({
    chartValueKey: 'revenue',
    errorMessage: 'Không thể tải tổng quan doanh thu',
  });

  return (
    <div className="farmer-stack">
      <section className="farmer-card ff-overview-card">
        <div className="ff-header-row">
          <SectionHeader
            breadcrumb="Tài chính"
            eyebrow="Tài chính"
            title="Doanh thu từ hợp đồng và dòng tiền của bạn"
            desc="Theo dõi doanh thu hợp đồng, tiến độ giải ngân và toàn bộ lịch sử nạp, rút tiền trên cùng một trang."
          />

          <div className="ff-quick-links">
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
          <div className="spinner-border text-success" role="status" />
        ) : error ? (
          <EmptyState title="Không tải được dữ liệu" desc={error} />
        ) : (
          <>
            <div className="ff-summary-grid">
              <article>
                <span>Doanh thu từ các hợp đồng</span>
                <strong>{formatMoney(summary.totalContractValue)}</strong>
                <small>Tổng giá trị {summary.totalContracts || 0} hợp đồng chưa hủy</small>
              </article>
              <article>
                <span>Doanh thu đã nhận</span>
                <strong>{formatMoney(summary.totalRevenue)}</strong>
                <small>Tiền đã giải ngân về ví trong năm</small>
              </article>
              <article>
                <span>Tổng bản ghi</span>
                <strong>
                  {(Number(summary.totalWalletTransactions || 0)
                    + Number(summary.totalContracts || 0)
                    + Number(summary.totalEscrows || 0)).toLocaleString('vi-VN')}
                </strong>
                <small>Hợp đồng, ví và ký quỹ</small>
              </article>
            </div>

            <section className="ff-chart-card">
              <div className="ff-chart-title">
                <div>
                  <span><FiBarChart2 size={15} /> Biểu đồ phân tích doanh thu từng tháng</span>
                  <p>Tiền đã giải ngân về ví theo từng tháng trong năm</p>
                </div>
              </div>

              <div className="ff-chart-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => Number(value / 1000000).toLocaleString('vi-VN')} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="farmer-filter-row">
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

            <div className="farmer-table-wrap">
              <table className="farmer-table">
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
                        <td className={amount < 0 ? 'farmer-money farmer-money--down' : 'farmer-money farmer-money--up'}>
                          {amount > 0 ? '+' : ''}{formatMoney(amount)}
                        </td>
                        <td>
                          <span className={`farmer-badge farmer-badge--${getTransactionStatusTone(item.status)}`}>
                            {TRANSACTION_STATUS_LABELS[item.status] || item.status}
                          </span>
                        </td>
                        <td>
                          {detailPath && (
                            <button
                              type="button"
                              className="ff-detail-btn"
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
                  desc="Khi có hợp đồng, ký quỹ hoặc nạp/rút ví, dữ liệu sẽ hiển thị tại đây."
                />
              )}
            </div>

            {transactions.length > 0 && (
              <div className="ff-pagination">
                <span>
                  Trang {pagination.page} / {pagination.totalPages} — {pagination.total.toLocaleString('vi-VN')} giao dịch
                </span>
                <div className="ff-pagination-btns">
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

export default FarmerFinance;
