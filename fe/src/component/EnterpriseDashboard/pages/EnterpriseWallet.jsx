import React, { useMemo, useState } from 'react';
import {
  FiGrid, FiPlus, FiArrowUpRight, FiArrowDownLeft, FiClock,
  FiCreditCard, FiLock, FiRefreshCw, FiFileText, FiShield,
  FiCheck, FiHome, FiZap, FiInbox,
} from 'react-icons/fi';
import { useToast } from '../../../contexts/ToastContext';
import { formatMoney } from '../utils';
import './EnterpriseWallet.css';

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: FiGrid },
  { key: 'deposit',  label: 'Nạp tiền',  icon: FiPlus },
  { key: 'withdraw', label: 'Rút tiền',  icon: FiArrowUpRight },
  { key: 'history',  label: 'Lịch sử',   icon: FiClock },
];

const QUICK_AMOUNTS = [
  { value: 100000000,   label: '100 triệu' },
  { value: 500000000,   label: '500 triệu' },
  { value: 1000000000,  label: '1 tỷ' },
  { value: 5000000000,  label: '5 tỷ' },
  { value: 10000000000, label: '10 tỷ' },
  { value: 100000000000, label: '100 tỷ' },
];

const BANKS = [
  'Vietcombank', 'Techcombank', 'BIDV', 'VietinBank', 'Agribank',
  'MB Bank', 'ACB', 'VPBank', 'Sacombank', 'TPBank',
];

const TX_META = {
  deposit:      { label: 'Nạp tiền',   icon: FiPlus,          tone: 'green' },
  escrow:       { label: 'Ký quỹ',     icon: FiLock,          tone: 'gold' },
  disbursement: { label: 'Giải ngân',  icon: FiArrowUpRight,  tone: 'blue' },
  refund:       { label: 'Hoàn tiền',  icon: FiArrowDownLeft, tone: 'purple' },
};

const HISTORY_FILTERS = [
  { key: 'all',          label: 'Tất cả' },
  { key: 'deposit',      label: 'Nạp tiền' },
  { key: 'escrow',       label: 'Ký quỹ' },
  { key: 'disbursement', label: 'Giải ngân' },
  { key: 'refund',       label: 'Hoàn tiền' },
];

const INITIAL_TRANSACTIONS = [
  { id: 'tx-1', type: 'escrow',  detail: 'Ký quỹ hợp đồng 6a20e6b6020018ad58c0365e', amount: -200000000,  balanceAfter: 4810000000,  time: '09:46 04/06/2026' },
  { id: 'tx-2', type: 'deposit', detail: '[Demo] Nạp 5.000.000.000 VND',              amount: 5000000000,  balanceAfter: 5010000000,  time: '09:42 04/06/2026' },
  { id: 'tx-3', type: 'escrow',  detail: 'Ký quỹ hợp đồng 6a20e4ef020018ad58c033ec', amount: -1500000000, balanceAfter: 10000000000, time: '09:41 04/06/2026' },
  { id: 'tx-4', type: 'deposit', detail: '[Demo] Nạp 500.000.000 VND',                amount: 500000000,   balanceAfter: 1510000000,  time: '09:41 04/06/2026' },
  { id: 'tx-5', type: 'deposit', detail: '[Demo] Nạp 1.000.000.000 VND',              amount: 1000000000,  balanceAfter: 1010000000,  time: '09:14 04/06/2026' },
];

function nowLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function EnterpriseWallet() {
  const toast = useToast();

  const [tab, setTab] = useState('overview');

  // Ví
  const [balance, setBalance]           = useState(4810000000);
  const [totalDeposit, setTotalDeposit] = useState(6500000000);
  const [totalSpent]                    = useState(1700000000);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  // Nạp tiền
  const [amountRaw, setAmountRaw]   = useState('');
  const [quickPicked, setQuickPicked] = useState(null);

  // Rút tiền
  const [withdrawals, setWithdrawals] = useState([]);
  const [wForm, setWForm] = useState({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });

  // Lịch sử
  const [historyFilter, setHistoryFilter] = useState('all');

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

  const handleDemoTopUp = () => {
    const amount = Number(amountRaw);
    if (!amount || amount <= 0) { toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.'); return; }

    const newBalance = balance + amount;
    const tx = {
      id: `tx-${Date.now()}`,
      type: 'deposit',
      detail: `[Demo] Nạp ${formatMoney(amount)}`,
      amount,
      balanceAfter: newBalance,
      time: nowLabel(),
    };

    setTransactions((prev) => [tx, ...prev]);
    setBalance(newBalance);
    setTotalDeposit((prev) => prev + amount);
    setAmountRaw('');
    setQuickPicked(null);
    toast.success(`Nạp thành công ${formatMoney(amount)} vào ví (demo).`);
    setTab('overview');
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
      time: nowLabel(),
    };

    setWithdrawals((prev) => [request, ...prev]);
    setWForm({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });
    toast.success('Đã gửi yêu cầu rút tiền. Quản trị viên sẽ xử lý sớm nhất.');
  };

  return (
    <div className="ent-stack">
      {/* Hero balance */}
      <section className="ewt-hero">
        <div>
          <span className="ewt-hero__badge"><span />VÍ DOANH NGHIỆP • PREONIC</span>
          <p className="ewt-hero__label">Số dư khả dụng</p>
          <h2 className="ewt-hero__balance">{formatMoney(balance)}</h2>
          <p className="ewt-hero__sub">Dùng để ký quỹ và thanh toán các hợp đồng bao tiêu</p>
          <button type="button" className="ewt-hero__cta" onClick={() => setTab('deposit')}>
            <FiPlus /> Nạp tiền ngay
          </button>
        </div>

        <div className="ewt-hero__stats">
          <div className="ewt-hero__stat">
            <span className="ewt-hero__stat-icon"><FiArrowUpRight /></span>
            <div><p>Tổng nạp</p><strong>{formatMoney(totalDeposit)}</strong></div>
          </div>
          <div className="ewt-hero__stat">
            <span className="ewt-hero__stat-icon"><FiArrowDownLeft /></span>
            <div><p>Tổng chi</p><strong>{formatMoney(totalSpent)}</strong></div>
          </div>
          <div className="ewt-hero__stat">
            <span className="ewt-hero__stat-icon"><FiFileText /></span>
            <div><p>Giao dịch</p><strong>{transactions.length}</strong></div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="ewt-tabs" aria-label="Chuyển tab ví">
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

      {/* ── Tổng quan ── */}
      {tab === 'overview' && (
        <div className="ewt-split">
          <section className="ent-card">
            <div className="ewt-panel-head">
              <h3><FiClock /> Giao dịch gần đây</h3>
              <button type="button" className="ewt-panel-link" onClick={() => setTab('history')}>
                Xem tất cả <FiArrowUpRight style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="ewt-tx-list">
              {transactions.slice(0, 5).map((tx) => {
                const meta = TX_META[tx.type];
                const Icon = meta.icon;
                return (
                  <article key={tx.id} className="ewt-tx-row">
                    <span className={`ewt-tx-icon ewt-tx-icon--${meta.tone}`}><Icon /></span>
                    <div className="ewt-tx-main">
                      <strong>{meta.label}</strong>
                      <span>{tx.detail}</span>
                      <small>{tx.time}</small>
                    </div>
                    <div className="ewt-tx-right">
                      <span className={`ewt-tx-amount ${tx.amount >= 0 ? 'up' : 'down'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                      </span>
                      <span className="ent-badge ent-badge--success">Thành công</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="ent-card">
            <div className="ewt-panel-head"><h3><FiShield /> Cách hoạt động</h3></div>
            <div className="ewt-steps">
              <div className="ewt-step">
                <span className="ewt-step__num">1</span>
                <div className="ewt-step__body">
                  <strong><FiFileText /> Nạp tiền vào ví</strong>
                  <p>Tạo lệnh SePay, chuyển khoản đúng nội dung và chờ hệ thống tự cộng ví qua webhook.</p>
                </div>
              </div>
              <div className="ewt-step">
                <span className="ewt-step__num">2</span>
                <div className="ewt-step__body">
                  <strong><FiLock /> Ký quỹ hợp đồng</strong>
                  <p>Dùng tiền trong ví để ký quỹ đảm bảo thực hiện hợp đồng bao tiêu.</p>
                </div>
              </div>
              <div className="ewt-step">
                <span className="ewt-step__num">3</span>
                <div className="ewt-step__body">
                  <strong><FiRefreshCw /> Giải ngân tự động</strong>
                  <p>Tiền giải ngân khi cả hai bên xác nhận mốc thanh toán theo tiến độ.</p>
                </div>
              </div>
            </div>
            <div className="ewt-note">
              <FiShield />
              <span>Mọi giao dịch được mã hoá và bảo vệ bởi hệ thống escrow PreOnic.</span>
            </div>
          </section>
        </div>
      )}

      {/* ── Nạp tiền ── */}
      {tab === 'deposit' && (
        <div className="ewt-split">
          <section className="ent-card">
            <div className="ewt-panel-head"><h3><FiPlus /> Nạp tiền vào ví</h3></div>

            <div className="ewt-progress-steps">
              <span className="ewt-progress-steps__item done">
                <span className="ewt-progress-steps__dot">1</span>Chọn số tiền
              </span>
              <span className="ewt-progress-steps__line" />
              <span className="ewt-progress-steps__item">
                <span className="ewt-progress-steps__dot">2</span>Thanh toán
              </span>
              <span className="ewt-progress-steps__line" />
              <span className="ewt-progress-steps__item">
                <span className="ewt-progress-steps__dot">3</span>Tiền vào ví
              </span>
            </div>

            <span className="ewt-label">Chọn nhanh</span>
            <div className="ewt-quick-grid">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  className={`ewt-quick-btn ${quickPicked === q.value ? 'active' : ''}`}
                  onClick={() => pickQuick(q.value)}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <span className="ewt-label">Hoặc nhập tùy chỉnh</span>
            <div className="ewt-amount-input">
              <span className="ewt-amount-input__prefix">₫</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountRaw ? Number(amountRaw).toLocaleString('vi-VN') : ''}
                onChange={onCustomAmountChange}
              />
              <span className="ewt-amount-input__suffix">VND</span>
            </div>

            <div className="ewt-action-row">
              <button type="button" className="ewt-btn ewt-btn--outline" onClick={handleCreateSePayOrder}>
                <FiHome /> Tạo lệnh SePay
              </button>
              <button type="button" className="ewt-btn ewt-btn--gradient" onClick={handleDemoTopUp}>
                <FiZap /> Nạp demo (tức thì)
              </button>
            </div>
          </section>

          <div className="ent-stack" style={{ gap: 18 }}>
            <section className="ent-card">
              <div className="ewt-panel-head"><h3>Thông tin nạp tiền</h3></div>
              <div className="ewt-info-block">
                <span className="ewt-info-block__icon"><FiHome /></span>
                <div>
                  <strong>SePay — Chuyển khoản tự động</strong>
                  <p>Tạo lệnh nạp tiền, chuyển khoản đúng nội dung và chờ hệ thống SePay gửi webhook để hệ thống cộng ví tự động.</p>
                </div>
              </div>
              <div className="ewt-info-block">
                <span className="ewt-info-block__icon"><FiZap /></span>
                <div>
                  <strong>Demo — Miễn phí</strong>
                  <p>Nạp tức thì, không cần thanh toán — dùng để trải nghiệm và kiểm thử hệ thống.</p>
                </div>
              </div>
            </section>

            <section className="ent-card">
              <div className="ewt-panel-head"><h3>Bảo mật &amp; An toàn</h3></div>
              <ul className="ewt-checklist">
                <li><FiCheck /> Giao dịch được mã hóa SSL 256-bit</li>
                <li><FiCheck /> Tiền ký quỹ không thể rút đơn phương</li>
                <li><FiCheck /> SePay xác minh tự động qua webhook khi chuyển khoản thành công</li>
                <li><FiCheck /> Hoàn tiền đầy đủ nếu tranh chấp</li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* ── Rút tiền ── */}
      {tab === 'withdraw' && (
        <div className="ewt-split">
          <section className="ent-card">
            <div className="ewt-panel-head"><h3><FiArrowUpRight /> Tạo yêu cầu rút tiền</h3></div>

            <div className="ewt-balance-box">
              <span>Số dư khả dụng</span>
              <strong>{formatMoney(balance)}</strong>
            </div>

            <form className="ewt-form" onSubmit={submitWithdraw}>
              <div className="ewt-field">
                <label>Số tiền muốn rút (VNĐ) <span className="ewt-req">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 500,000"
                  value={wForm.amount ? Number(wForm.amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                  onChange={(e) => setWField('amount', e.target.value)}
                />
              </div>

              <div className="ewt-field">
                <label>Ngân hàng <span className="ewt-req">*</span></label>
                <select value={wForm.bank} onChange={(e) => setWField('bank', e.target.value)}>
                  <option value="">-- Chọn ngân hàng --</option>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="ewt-field">
                <label>Số tài khoản <span className="ewt-req">*</span></label>
                <input
                  type="text"
                  placeholder="Số tài khoản nhận tiền"
                  value={wForm.accountNumber}
                  onChange={(e) => setWField('accountNumber', e.target.value)}
                />
              </div>

              <div className="ewt-field">
                <label>Chủ tài khoản <span className="ewt-req">*</span></label>
                <input
                  type="text"
                  placeholder="Tên chủ tài khoản (in hoa)"
                  value={wForm.accountHolder}
                  onChange={(e) => setWField('accountHolder', e.target.value)}
                />
              </div>

              <div className="ewt-field">
                <label>Ghi chú (không bắt buộc)</label>
                <textarea
                  placeholder="Ghi chú thêm cho quản trị viên..."
                  value={wForm.note}
                  onChange={(e) => setWField('note', e.target.value)}
                />
              </div>

              <button type="submit" className="ewt-btn ewt-btn--green ewt-btn--full">
                Gửi yêu cầu rút tiền
              </button>
            </form>

            <p className="ewt-helper">
              Quản trị viên sẽ kiểm tra và chuyển khoản thủ công. Số dư chỉ bị trừ khi yêu cầu được hoàn tất.
            </p>
          </section>

          <section className="ent-card">
            <div className="ewt-panel-head"><h3>Lịch sử rút tiền</h3></div>
            {withdrawals.length === 0 ? (
              <div className="ewt-empty">
                <FiInbox />
                <p>Chưa có yêu cầu rút tiền nào.</p>
              </div>
            ) : (
              <div className="ewt-withdraw-list">
                {withdrawals.map((w) => (
                  <article key={w.id} className="ewt-withdraw-item">
                    <div className="ewt-withdraw-item__top">
                      <strong>{formatMoney(w.amount)}</strong>
                      <span className="ent-badge ent-badge--warning">Chờ duyệt</span>
                    </div>
                    <p className="ewt-withdraw-item__meta">{w.bank} • {w.accountNumber} • {w.accountHolder}</p>
                    <p className="ewt-withdraw-item__meta">{w.time}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Lịch sử ── */}
      {tab === 'history' && (
        <section className="ent-card">
          <div className="ewt-panel-head"><h3><FiClock /> Lịch sử giao dịch</h3></div>

          <div className="ent-filter-row">
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

          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>Loại</th><th>Chi tiết</th><th>Số tiền</th>
                  <th>Số dư sau</th><th>Trạng thái</th><th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((tx) => {
                  const meta = TX_META[tx.type];
                  const Icon = meta.icon;
                  return (
                    <tr key={tx.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span className={`ewt-tx-icon ewt-tx-icon--${meta.tone}`} style={{ width: 30, height: 30 }}>
                            <Icon />
                          </span>
                          {meta.label}
                        </span>
                      </td>
                      <td>{tx.detail}</td>
                      <td className={tx.amount >= 0 ? 'ent-money ent-money--up' : 'ent-money ent-money--down'}>
                        {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                      </td>
                      <td>{formatMoney(tx.balanceAfter)}</td>
                      <td><span className="ent-badge ent-badge--success">Thành công</span></td>
                      <td>{tx.time}</td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>Không có giao dịch phù hợp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default EnterpriseWallet;