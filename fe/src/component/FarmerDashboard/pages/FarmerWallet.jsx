import React, { useEffect, useMemo, useState } from 'react';
import {
  FiGrid, FiPlus, FiArrowUpRight, FiArrowDownLeft, FiClock,
  FiLock, FiRefreshCw, FiFileText, FiShield,
  FiCheck, FiHome, FiZap, FiInbox,
} from 'react-icons/fi';
import { useToast } from '../../../contexts/ToastContext';
import walletService from '../../../services/wallet.service';
import { formatMoney } from '../utils';
import './FarmerWallet.css';

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: FiGrid },
  { key: 'deposit',  label: 'Nạp tiền',  icon: FiPlus },
  { key: 'withdraw', label: 'Rút tiền',  icon: FiArrowUpRight },
  { key: 'history',  label: 'Lịch sử',   icon: FiClock },
];

// demoTopupWallet (backend) gioi han toi da 100,000,000 VND / lan nap.
const QUICK_AMOUNTS = [
  { value: 500000,    label: '500 nghìn' },
  { value: 1000000,   label: '1 triệu' },
  { value: 5000000,   label: '5 triệu' },
  { value: 10000000,  label: '10 triệu' },
  { value: 50000000,  label: '50 triệu' },
  { value: 100000000, label: '100 triệu' },
];

const BANKS = [
  'Vietcombank', 'Techcombank', 'BIDV', 'VietinBank', 'Agribank',
  'MB Bank', 'ACB', 'VPBank', 'Sacombank', 'TPBank',
];

// Khop voi Transaction.type that su tra ve tu GET /wallet/transactions (topup | deposit | release | refund).
const TX_META = {
  topup:   { label: 'Nạp tiền',   icon: FiPlus,          tone: 'green' },
  deposit: { label: 'Ký quỹ',     icon: FiLock,          tone: 'gold' },
  release: { label: 'Nhận tiền',  icon: FiArrowUpRight,  tone: 'blue' },
  refund:  { label: 'Hoàn tiền',  icon: FiArrowDownLeft, tone: 'purple' },
};

const HISTORY_FILTERS = [
  { key: 'all',     label: 'Tất cả' },
  { key: 'topup',   label: 'Nạp tiền' },
  { key: 'release', label: 'Nhận tiền' },
  { key: 'refund',  label: 'Hoàn tiền' },
];

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function FarmerWallet() {
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Ví — du lieu that tu GET /wallet + GET /wallet/transactions
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Nạp tiền
  const [amountRaw, setAmountRaw] = useState('');
  const [quickPicked, setQuickPicked] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);

  // Rút tiền — chua co API backend, tam giu dang yeu cau cho duyet thu cong.
  const [withdrawals, setWithdrawals] = useState([]);
  const [wForm, setWForm] = useState({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });

  // Lịch sử
  const [historyFilter, setHistoryFilter] = useState('all');

  const loadWallet = () => {
    setLoading(true);
    Promise.all([
      walletService.get(),
      walletService.listTransactions({ limit: 100 }),
    ])
      .then(([walletRes, txRes]) => {
        setBalance(walletRes?.data?.wallet?.balance || 0);
        setTransactions(txRes?.data?.transactions || []);
      })
      .catch(() => {
        setBalance(0);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadWallet, []);

  const totalDeposit = useMemo(
    () => transactions.filter((t) => t.type === 'topup').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions],
  );
  const totalReceived = useMemo(
    () => transactions.filter((t) => t.type === 'release').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions],
  );

  const filteredHistory = useMemo(
    () => (historyFilter === 'all' ? transactions : transactions.filter((t) => t.type === historyFilter)),
    [transactions, historyFilter],
  );

  const pickQuick = (value) => {
    setQuickPicked(value);
    setAmountRaw(String(value));
  };

  const onCustomAmountChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    setAmountRaw(digits);
    setQuickPicked(null);
  };

  const handleCreateSePayOrder = () => {
    if (!Number(amountRaw)) { toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.'); return; }
    toast.info('SePay sẽ được kết nối khi payment gateway thật sẵn sàng.');
  };

  const handleDemoTopUp = async () => {
    const amount = Number(amountRaw);
    if (!amount || amount <= 0) { toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.'); return; }

    setTopupLoading(true);
    try {
      const res = await walletService.demoTopup(amount);
      setBalance(res?.data?.wallet?.balance ?? balance);
      setAmountRaw('');
      setQuickPicked(null);
      toast.success(`Nạp thành công ${formatMoney(amount)} vào ví (demo).`);
      setTab('overview');
      loadWallet();
    } catch (err) {
      toast.error(err?.message || 'Nạp tiền thất bại, vui lòng thử lại.');
    } finally {
      setTopupLoading(false);
    }
  };

  const setWField = (key, value) => setWForm((prev) => ({ ...prev, [key]: value }));

  const submitWithdraw = (e) => {
    e.preventDefault();
    const amount = Number(wForm.amount.replace(/\D/g, ''));

    if (!amount || amount <= 0)      { toast.warning('Vui lòng nhập số tiền muốn rút.'); return; }
    if (amount > balance)            { toast.error('Số tiền rút vượt quá số dư khả dụng.'); return; }
    if (!wForm.bank)                 { toast.warning('Vui lòng chọn ngân hàng nhận tiền.'); return; }
    if (!wForm.accountNumber.trim()) { toast.warning('Vui lòng nhập số tài khoản.'); return; }
    if (!wForm.accountHolder.trim()) { toast.warning('Vui lòng nhập tên chủ tài khoản.'); return; }

    const request = {
      id: `wd-${Date.now()}`,
      amount,
      bank: wForm.bank,
      accountNumber: wForm.accountNumber.trim(),
      accountHolder: wForm.accountHolder.trim().toUpperCase(),
      note: wForm.note.trim(),
      time: formatDateTime(new Date()),
    };

    setWithdrawals((prev) => [request, ...prev]);
    setWForm({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });
    toast.success('Đã gửi yêu cầu rút tiền. Quản trị viên sẽ xử lý sớm nhất.');
  };

  return (
    <div className="farmer-stack">
      {/* Hero balance */}
      <section className="fwt-hero">
        <div>
          <span className="fwt-hero__badge"><span />VÍ NÔNG DÂN • PREONIC</span>
          <p className="fwt-hero__label">Số dư khả dụng</p>
          <h2 className="fwt-hero__balance">{formatMoney(balance)}</h2>
          <p className="fwt-hero__sub">Tiền được giải ngân từ các mốc hợp đồng sẽ cộng thẳng vào đây</p>
          <button type="button" className="fwt-hero__cta" onClick={() => setTab('deposit')}>
            <FiPlus /> Nạp tiền ngay
          </button>
        </div>

        <div className="fwt-hero__stats">
          <div className="fwt-hero__stat">
            <span className="fwt-hero__stat-icon"><FiArrowUpRight /></span>
            <div><p>Tổng nạp</p><strong>{formatMoney(totalDeposit)}</strong></div>
          </div>
          <div className="fwt-hero__stat">
            <span className="fwt-hero__stat-icon"><FiArrowDownLeft /></span>
            <div><p>Đã nhận</p><strong>{formatMoney(totalReceived)}</strong></div>
          </div>
          <div className="fwt-hero__stat">
            <span className="fwt-hero__stat-icon"><FiFileText /></span>
            <div><p>Giao dịch</p><strong>{transactions.length}</strong></div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="fwt-tabs" aria-label="Chuyển tab ví">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="spinner-border text-success" role="status" />
      ) : (
        <>
          {/* ── Tổng quan ── */}
          {tab === 'overview' && (
            <div className="fwt-split">
              <section className="farmer-card">
                <div className="fwt-panel-head">
                  <h3><FiClock /> Giao dịch gần đây</h3>
                  <button type="button" className="fwt-panel-link" onClick={() => setTab('history')}>
                    Xem tất cả <FiArrowUpRight style={{ transform: 'rotate(45deg)' }} />
                  </button>
                </div>
                {transactions.length === 0 ? (
                  <div className="fwt-empty">
                    <FiInbox />
                    <p>Chưa có giao dịch nào.</p>
                  </div>
                ) : (
                  <div className="fwt-tx-list">
                    {transactions.slice(0, 5).map((tx) => {
                      const meta = TX_META[tx.type] || TX_META.topup;
                      const Icon = meta.icon;
                      const isOutgoing = tx.source === 'escrow' && tx.direction === 'out';
                      return (
                        <article key={`${tx.source}-${tx.id}`} className="fwt-tx-row">
                          <span className={`fwt-tx-icon fwt-tx-icon--${meta.tone}`}><Icon /></span>
                          <div className="fwt-tx-main">
                            <strong>{tx.typeLabel || meta.label}</strong>
                            <span>{tx.description}</span>
                            <small>{formatDateTime(tx.createdAt)}</small>
                          </div>
                          <div className="fwt-tx-right">
                            <span className={`fwt-tx-amount ${isOutgoing ? 'down' : 'up'}`}>
                              {isOutgoing ? '-' : '+'}{formatMoney(tx.amount)}
                            </span>
                            <span className="farmer-badge farmer-badge--success">Thành công</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="farmer-card">
                <div className="fwt-panel-head"><h3><FiShield /> Cách hoạt động</h3></div>
                <div className="fwt-steps">
                  <div className="fwt-step">
                    <span className="fwt-step__num">1</span>
                    <div className="fwt-step__body">
                      <strong><FiFileText /> Ký hợp đồng bao tiêu</strong>
                      <p>Xác nhận hợp đồng với doanh nghiệp để bắt đầu theo dõi ký quỹ.</p>
                    </div>
                  </div>
                  <div className="fwt-step">
                    <span className="fwt-step__num">2</span>
                    <div className="fwt-step__body">
                      <strong><FiLock /> Xác nhận mốc giao nhận</strong>
                      <p>Chuẩn bị hàng, giao hàng theo đúng tiến độ mốc thanh toán.</p>
                    </div>
                  </div>
                  <div className="fwt-step">
                    <span className="fwt-step__num">3</span>
                    <div className="fwt-step__body">
                      <strong><FiRefreshCw /> Nhận giải ngân tự động</strong>
                      <p>Tiền được cộng thẳng vào ví ngay khi mốc thanh toán được xác nhận.</p>
                    </div>
                  </div>
                </div>
                <div className="fwt-note">
                  <FiShield />
                  <span>Mọi giao dịch được mã hoá và bảo vệ bởi hệ thống escrow PreOnic.</span>
                </div>
              </section>
            </div>
          )}

          {/* ── Nạp tiền ── */}
          {tab === 'deposit' && (
            <div className="fwt-split">
              <section className="farmer-card">
                <div className="fwt-panel-head"><h3><FiPlus /> Nạp tiền vào ví</h3></div>

                <div className="fwt-progress-steps">
                  <span className="fwt-progress-steps__item done">
                    <span className="fwt-progress-steps__dot">1</span>Chọn số tiền
                  </span>
                  <span className="fwt-progress-steps__line" />
                  <span className="fwt-progress-steps__item">
                    <span className="fwt-progress-steps__dot">2</span>Thanh toán
                  </span>
                  <span className="fwt-progress-steps__line" />
                  <span className="fwt-progress-steps__item">
                    <span className="fwt-progress-steps__dot">3</span>Tiền vào ví
                  </span>
                </div>

                <span className="fwt-label">Chọn nhanh</span>
                <div className="fwt-quick-grid">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q.value}
                      type="button"
                      className={`fwt-quick-btn ${quickPicked === q.value ? 'active' : ''}`}
                      onClick={() => pickQuick(q.value)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                <span className="fwt-label">Hoặc nhập tùy chỉnh</span>
                <div className="fwt-amount-input">
                  <span className="fwt-amount-input__prefix">₫</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountRaw ? Number(amountRaw).toLocaleString('vi-VN') : ''}
                    onChange={onCustomAmountChange}
                  />
                  <span className="fwt-amount-input__suffix">VND</span>
                </div>

                <div className="fwt-action-row">
                  <button type="button" className="fwt-btn fwt-btn--outline" onClick={handleCreateSePayOrder}>
                    <FiHome /> Tạo lệnh SePay
                  </button>
                  <button
                    type="button"
                    className="fwt-btn fwt-btn--gradient"
                    onClick={handleDemoTopUp}
                    disabled={topupLoading}
                  >
                    <FiZap /> {topupLoading ? 'Đang xử lý...' : 'Nạp demo (tức thì)'}
                  </button>
                </div>
              </section>

              <div className="farmer-stack" style={{ gap: 18 }}>
                <section className="farmer-card">
                  <div className="fwt-panel-head"><h3>Thông tin nạp tiền</h3></div>
                  <div className="fwt-info-block">
                    <span className="fwt-info-block__icon"><FiHome /></span>
                    <div>
                      <strong>SePay — Chuyển khoản tự động</strong>
                      <p>Tạo lệnh nạp tiền, chuyển khoản đúng nội dung và chờ hệ thống SePay gửi webhook để hệ thống cộng ví tự động.</p>
                    </div>
                  </div>
                  <div className="fwt-info-block">
                    <span className="fwt-info-block__icon"><FiZap /></span>
                    <div>
                      <strong>Demo — Miễn phí</strong>
                      <p>Nạp tức thì, không cần thanh toán — dùng để trải nghiệm và kiểm thử hệ thống. Tối đa 100.000.000đ/lần.</p>
                    </div>
                  </div>
                </section>

                <section className="farmer-card">
                  <div className="fwt-panel-head"><h3>Bảo mật &amp; An toàn</h3></div>
                  <ul className="fwt-checklist">
                    <li><FiCheck /> Giao dịch được mã hóa SSL 256-bit</li>
                    <li><FiCheck /> Tiền giải ngân được ghi nhận minh bạch theo từng mốc</li>
                    <li><FiCheck /> SePay xác minh tự động qua webhook khi chuyển khoản thành công</li>
                    <li><FiCheck /> Hoàn tiền đầy đủ nếu tranh chấp</li>
                  </ul>
                </section>
              </div>
            </div>
          )}

          {/* ── Rút tiền ── */}
          {tab === 'withdraw' && (
            <div className="fwt-split">
              <section className="farmer-card">
                <div className="fwt-panel-head"><h3><FiArrowUpRight /> Tạo yêu cầu rút tiền</h3></div>

                <div className="fwt-balance-box">
                  <span>Số dư khả dụng</span>
                  <strong>{formatMoney(balance)}</strong>
                </div>

                <form className="fwt-form" onSubmit={submitWithdraw}>
                  <div className="fwt-field">
                    <label>Số tiền muốn rút (VNĐ) <span className="fwt-req">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="VD: 500,000"
                      value={wForm.amount ? Number(wForm.amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                      onChange={(e) => setWField('amount', e.target.value)}
                    />
                  </div>

                  <div className="fwt-field">
                    <label>Ngân hàng <span className="fwt-req">*</span></label>
                    <select value={wForm.bank} onChange={(e) => setWField('bank', e.target.value)}>
                      <option value="">-- Chọn ngân hàng --</option>
                      {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div className="fwt-field">
                    <label>Số tài khoản <span className="fwt-req">*</span></label>
                    <input
                      type="text"
                      placeholder="Số tài khoản nhận tiền"
                      value={wForm.accountNumber}
                      onChange={(e) => setWField('accountNumber', e.target.value)}
                    />
                  </div>

                  <div className="fwt-field">
                    <label>Chủ tài khoản <span className="fwt-req">*</span></label>
                    <input
                      type="text"
                      placeholder="Tên chủ tài khoản (in hoa)"
                      value={wForm.accountHolder}
                      onChange={(e) => setWField('accountHolder', e.target.value)}
                    />
                  </div>

                  <div className="fwt-field">
                    <label>Ghi chú (không bắt buộc)</label>
                    <textarea
                      placeholder="Ghi chú thêm cho quản trị viên..."
                      value={wForm.note}
                      onChange={(e) => setWField('note', e.target.value)}
                    />
                  </div>

                  <button type="submit" className="fwt-btn fwt-btn--green fwt-btn--full">
                    Gửi yêu cầu rút tiền
                  </button>
                </form>

                <p className="fwt-helper">
                  Quản trị viên sẽ kiểm tra và chuyển khoản thủ công. Số dư chỉ bị trừ khi yêu cầu được hoàn tất.
                </p>
              </section>

              <section className="farmer-card">
                <div className="fwt-panel-head"><h3>Lịch sử rút tiền</h3></div>
                {withdrawals.length === 0 ? (
                  <div className="fwt-empty">
                    <FiInbox />
                    <p>Chưa có yêu cầu rút tiền nào.</p>
                  </div>
                ) : (
                  <div className="fwt-withdraw-list">
                    {withdrawals.map((w) => (
                      <article key={w.id} className="fwt-withdraw-item">
                        <div className="fwt-withdraw-item__top">
                          <strong>{formatMoney(w.amount)}</strong>
                          <span className="farmer-badge farmer-badge--warning">Chờ duyệt</span>
                        </div>
                        <p className="fwt-withdraw-item__meta">{w.bank} • {w.accountNumber} • {w.accountHolder}</p>
                        <p className="fwt-withdraw-item__meta">{w.time}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── Lịch sử ── */}
          {tab === 'history' && (
            <section className="farmer-card">
              <div className="fwt-panel-head"><h3><FiClock /> Lịch sử giao dịch</h3></div>

              <div className="farmer-filter-row">
                {HISTORY_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={historyFilter === f.key ? 'active' : ''}
                    onClick={() => setHistoryFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="farmer-table-wrap">
                <table className="farmer-table">
                  <thead>
                    <tr>
                      <th>Loại</th><th>Chi tiết</th><th>Số tiền</th>
                      <th>Trạng thái</th><th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((tx) => {
                      const meta = TX_META[tx.type] || TX_META.topup;
                      const Icon = meta.icon;
                      const isOutgoing = tx.source === 'escrow' && tx.direction === 'out';
                      return (
                        <tr key={`${tx.source}-${tx.id}`}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <span className={`fwt-tx-icon fwt-tx-icon--${meta.tone}`} style={{ width: 30, height: 30 }}>
                                <Icon />
                              </span>
                              {tx.typeLabel || meta.label}
                            </span>
                          </td>
                          <td>{tx.description}</td>
                          <td className={isOutgoing ? 'farmer-money farmer-money--down' : 'farmer-money farmer-money--up'}>
                            {isOutgoing ? '-' : '+'}{formatMoney(tx.amount)}
                          </td>
                          <td><span className="farmer-badge farmer-badge--success">Thành công</span></td>
                          <td>{formatDateTime(tx.createdAt)}</td>
                        </tr>
                      );
                    })}
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>Không có giao dịch phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default FarmerWallet;
