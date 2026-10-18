import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiArrowDownCircle,
  FiCalendar,
  FiFileText,
  FiRefreshCw,
  FiTrendingUp,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import billingService from '../../services/billing.service';
import { formatDate, formatMoney } from '../../utils/dashboard';
import FarmerSectionHeader from '../FarmerDashboard/components/SectionHeader';
import EnterpriseSectionHeader from '../EnterpriseDashboard/components/SectionHeader';
import './CashflowReport.css';

const STATUS_LABELS = {
  pending: 'Chờ ký',
  active: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancel_pending: 'Chờ hủy',
  cancelled: 'Đã hủy',
  disputed: 'Tranh chấp',
};

const PERIODS = [3, 6, 12, 24];

const compactMoney = (value) => new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value || 0));

function CashflowReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFarmer = user?.role === 'farmer';
  const PageSectionHeader = isFarmer ? FarmerSectionHeader : EnterpriseSectionHeader;
  const primaryColor = isFarmer ? '#15803d' : '#2563eb';
  const gridColor = isFarmer ? 'rgba(15, 75, 43, .12)' : 'rgba(37, 99, 235, .12)';
  const axisColor = isFarmer ? '#617066' : '#64748b';
  const [months, setMonths] = useState(12);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await billingService.getCashflowReport(months);
      setReport(response?.data || null);
    } catch (requestError) {
      setError(requestError?.message || 'Không thể tải báo cáo dòng tiền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const summary = useMemo(() => report?.summary || {}, [report]);
  const cards = useMemo(() => ([
    {
      icon: isFarmer ? FiTrendingUp : FiArrowDownCircle,
      label: isFarmer ? 'Doanh thu đã nhận' : 'Chi phí hàng hóa',
      value: formatMoney(summary.goodsCashflowAllTime || 0),
      note: `${formatMoney(summary.goodsCashflowInPeriod || 0)} trong ${months} tháng`,
      tone: 'primary',
    },
    {
      icon: FiActivity,
      label: isFarmer ? 'Doanh thu sau phí' : 'Tổng dòng tiền ra',
      value: formatMoney(summary.netCashflowAllTime || 0),
      note: `Phí dịch vụ ${formatMoney(summary.serviceFeeAllTime || 0)}`,
      tone: 'accent',
    },
    {
      icon: FiCalendar,
      label: isFarmer ? 'Khoản chờ nhận' : 'Khoản chờ thanh toán',
      value: formatMoney(summary.pendingGoodsAmount || 0),
      note: 'Theo các lệnh thanh toán chưa hoàn tất',
      tone: 'warning',
    },
    {
      icon: FiFileText,
      label: 'Giá trị hợp đồng theo dõi',
      value: formatMoney(summary.committedContractValue || 0),
      note: `${summary.activeContracts || 0} đang chạy · ${summary.completedContracts || 0} hoàn thành`,
      tone: 'neutral',
    },
  ]), [isFarmer, months, summary]);

  if (loading && !report) {
    return (
      <section className="cashflow-report cashflow-report--state" aria-live="polite">
        <FiRefreshCw className="cashflow-report__spinner" />
        <h2>Đang tổng hợp dòng tiền</h2>
        <p>Hệ thống đang đối chiếu hợp đồng, thanh toán và phí dịch vụ.</p>
      </section>
    );
  }

  return (
    <div className={`cashflow-report cashflow-report--${isFarmer ? 'farmer' : 'enterprise'}`}>
      <PageSectionHeader
        breadcrumb={isFarmer ? 'Báo cáo doanh thu' : 'Báo cáo chi phí'}
        eyebrow="Báo cáo tài chính"
        title={isFarmer ? 'Doanh thu từ hợp đồng' : 'Chi phí thu mua theo hợp đồng'}
        desc={isFarmer
          ? 'Theo dõi tiền hàng thực nhận, khoản còn chờ và phí dịch vụ trên từng hợp đồng.'
          : 'Theo dõi tiền hàng đã chi, nghĩa vụ sắp thanh toán và phí dịch vụ của doanh nghiệp.'}
        action={(
          <label className="cashflow-report__period">
            <span>Khoảng biểu đồ</span>
            <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
              {PERIODS.map((value) => <option key={value} value={value}>{value} tháng</option>)}
            </select>
          </label>
        )}
      />

      {error && (
        <div className="cashflow-report__error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={loadReport}>Thử lại</button>
        </div>
      )}

      <section className="cashflow-report__stats" aria-label="Tổng quan dòng tiền">
        {cards.map(({ icon: Icon, ...card }) => (
          <article key={card.label} className={`cashflow-report__stat cashflow-report__stat--${card.tone}`}>
            <div className="cashflow-report__stat-icon"><Icon /></div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </section>

      <section className="cashflow-report__panel">
        <div className="cashflow-report__panel-heading">
          <div>
            <span>Xu hướng {months} tháng</span>
            <h2>{isFarmer ? 'Tiền hàng đã nhận' : 'Tiền hàng đã thanh toán'}</h2>
          </div>
          <div className="cashflow-report__legends">
            <span className="cashflow-report__legend"><i /> Tiền hàng đã xác nhận</span>
            <span className="cashflow-report__legend cashflow-report__legend--fee"><i /> Phí dịch vụ</span>
          </div>
        </div>
        <div className="cashflow-report__chart" aria-label="Biểu đồ dòng tiền theo tháng">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report?.cashflow || []} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="cashflowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={primaryColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" vertical={false} stroke={gridColor} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis width={62} axisLine={false} tickLine={false} tickFormatter={compactMoney} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [formatMoney(value), name === 'serviceFee' ? 'Phí dịch vụ' : isFarmer ? 'Đã nhận' : 'Đã chi']}
                labelStyle={{ color: isFarmer ? '#12331f' : '#172554', fontWeight: 800 }}
                contentStyle={{
                  borderRadius: 14,
                  border: `1px solid ${isFarmer ? 'rgba(22,101,52,.14)' : 'rgba(37,99,235,.14)'}`,
                  boxShadow: `0 14px 36px ${isFarmer ? 'rgba(5,46,22,.1)' : 'rgba(30,58,138,.1)'}`,
                }}
              />
              <Area type="monotone" dataKey="goodsAmount" stroke={primaryColor} strokeWidth={3} fill="url(#cashflowFill)" activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="serviceFee" stroke="#f59e0b" strokeWidth={2} fill="transparent" activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="cashflow-report__panel">
        <div className="cashflow-report__panel-heading">
          <div>
            <span>Đối chiếu hợp đồng</span>
            <h2>{isFarmer ? 'Nguồn doanh thu' : 'Các khoản thu mua'}</h2>
          </div>
          <strong>{report?.contracts?.length || 0} hợp đồng gần nhất</strong>
        </div>

        {!report?.contracts?.length ? (
          <div className="cashflow-report__empty">
            <FiFileText />
            <h3>Chưa có hợp đồng để báo cáo</h3>
            <p>Số liệu sẽ xuất hiện khi hợp đồng được gửi và phát sinh thanh toán.</p>
          </div>
        ) : (
          <div className="cashflow-report__table-wrap">
            <table className="cashflow-report__table">
              <thead>
                <tr>
                  <th>Hợp đồng</th>
                  <th>Đối tác</th>
                  <th>Trạng thái</th>
                  <th>Tổng giá trị</th>
                  <th>{isFarmer ? 'Đã nhận' : 'Đã chi'}</th>
                  <th>Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {report.contracts.map((contract) => (
                  <tr key={contract.id} onClick={() => navigate(`/${user.role}/contracts/${contract.id}`)}>
                    <td>
                      <button type="button" className="cashflow-report__contract-link">
                        <strong>{contract.contractCode}</strong>
                        <span>{contract.productName || 'Nông sản'} · {formatDate(contract.createdAt)}</span>
                      </button>
                    </td>
                    <td>{contract.partnerName || 'Đối tác PreOnic'}</td>
                    <td><span className={`cashflow-report__status cashflow-report__status--${contract.status}`}>{STATUS_LABELS[contract.status] || contract.status}</span></td>
                    <td>{formatMoney(contract.totalValue)}</td>
                    <td className="cashflow-report__money-success">{formatMoney(contract.paidAmount)}</td>
                    <td>{formatMoney(contract.remainingAmount)}</td>
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

export default CashflowReport;
