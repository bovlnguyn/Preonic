import React, { useEffect, useMemo, useState } from 'react';
import {
  FiGrid, FiPlus, FiArrowUpRight, FiArrowDownLeft, FiClock,
  FiLock, FiRefreshCw, FiFileText, FiShield,
  FiCheck, FiHome, FiZap, FiInbox, FiCopy, FiLoader, FiCamera,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import { useToast } from '../../../contexts/ToastContext';
import walletService from '../../../services/wallet.service';
import { formatMoney } from '../utils';
import './EnterpriseWallet.css';

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

// Khop voi Transaction.type that su tra ve tu GET /wallet/transactions (topup | withdraw | deposit | release | refund).
const TX_META = {
  topup:    { label: 'Nạp tiền',  icon: FiPlus,          tone: 'green' },
  withdraw: { label: 'Rút tiền',  icon: FiArrowUpRight,  tone: 'red' },
  deposit:  { label: 'Ký quỹ',    icon: FiLock,          tone: 'gold' },
  release:  { label: 'Giải ngân', icon: FiArrowUpRight,  tone: 'blue' },
  refund:   { label: 'Hoàn tiền', icon: FiArrowDownLeft, tone: 'purple' },
};

const HISTORY_FILTERS = [
  { key: 'all',      label: 'Tất cả' },
  { key: 'topup',    label: 'Nạp tiền' },
  { key: 'withdraw', label: 'Rút tiền' },
  { key: 'deposit',  label: 'Ký quỹ' },
  { key: 'release',  label: 'Giải ngân' },
  { key: 'refund',   label: 'Hoàn tiền' },
];

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Escrow transactions không có cột status (luôn hoàn tất ngay), chỉ giao dịch
// nguồn 'payment' (topup demo/SePay) mới có thể đang ở trạng thái pending.
function TxStatusBadge({ tx }) {
  if (tx.source === 'payment' && tx.status === 'pending') {
    return <span className="ent-badge ent-badge--warning">Đang chờ</span>;
  }
  if (tx.source === 'payment' && tx.status === 'rejected') {
    return <span className="ent-badge ent-badge--danger">Đã từ chối</span>;
  }
  if (tx.source === 'payment' && tx.status && tx.status !== 'completed') {
    return <span className="ent-badge ent-badge--danger">Thất bại</span>;
  }
  return <span className="ent-badge ent-badge--success">Thành công</span>;
}

function EnterpriseWallet() {
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

  // Nạp tiền qua SePay — lệnh chuyển khoản đang chờ webhook xác nhận
  const [sepayOrder, setSepayOrder] = useState(null);
  const [sepayCreating, setSepayCreating] = useState(false);

  // Rút tiền — yêu cầu rút (demo hoặc qua ngân hàng) đều ở trạng thái 'pending' cho tới khi admin duyệt.
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [wForm, setWForm] = useState({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Lịch sử — phân trang & lọc phía server
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const loadWithdrawals = () => {
    setWithdrawalsLoading(true);
    walletService.listTransactions({ type: 'withdraw', limit: 20 })
      .then((res) => setWithdrawals(res?.data?.transactions || []))
      .catch(() => setWithdrawals([]))
      .finally(() => setWithdrawalsLoading(false));
  };

  useEffect(() => {
    if (tab === 'withdraw') loadWithdrawals();
  }, [tab]);

  const totalDeposit = useMemo(
    () => transactions.filter((t) => t.type === 'topup').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions],
  );
  const totalSpent = useMemo(
    () => transactions.filter((t) => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions],
  );

  useEffect(() => {
    if (tab !== 'history') return;

    setHistoryLoading(true);
    walletService.listTransactions({
      type: historyFilter === 'all' ? undefined : historyFilter,
      page: historyPage,
      limit: 10,
    })
      .then((res) => {
        setHistoryTransactions(res?.data?.transactions || []);
        setHistoryPagination(res?.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .catch(() => {
        setHistoryTransactions([]);
        setHistoryPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => setHistoryLoading(false));
  }, [tab, historyFilter, historyPage]);

  const handleHistoryFilterChange = (key) => {
    setHistoryFilter(key);
    setHistoryPage(1);
  };

  const pickQuick = (value) => {
    setQuickPicked(value);
    setAmountRaw(String(value));
  };

  const onCustomAmountChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    setAmountRaw(digits);
    setQuickPicked(null);
  };

  const handleCreateSePayOrder = async () => {
    const amount = Number(amountRaw);
    if (!amount) { toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.'); return; }

    setSepayCreating(true);
    try {
      const res = await walletService.createSepayOrder(amount);
      setSepayOrder(res?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Tạo lệnh SePay thất bại, vui lòng thử lại.');
    } finally {
      setSepayCreating(false);
    }
  };

  const handleCreateDemoQrOrder = async () => {
    const amount = Number(amountRaw);
    if (!amount) { toast.warning('Vui lòng chọn hoặc nhập số tiền muốn nạp.'); return; }

    setSepayCreating(true);
    try {
      const res = await walletService.createDemoQrOrder(amount);
      setSepayOrder(res?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Tạo mã QR demo thất bại, vui lòng thử lại.');
    } finally {
      setSepayCreating(false);
    }
  };

  const resetSepayOrder = () => setSepayOrder(null);

  const copySepayField = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.warning('Không thể sao chép, vui lòng copy thủ công.');
    }
  };

  // Theo dõi trạng thái lệnh SePay đang chờ — webhook cộng ví ở phía backend,
  // FE chỉ cần poll để biết khi nào đã nhận được tiền.
  useEffect(() => {
    if (!sepayOrder || sepayOrder.status === 'completed') return undefined;

    const interval = setInterval(async () => {
      try {
        const res = await walletService.getSepayOrderStatus(sepayOrder.orderCode);
        if (res?.data?.status === 'completed') {
          setSepayOrder((prev) => (prev ? { ...prev, status: 'completed' } : prev));
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời, thử lại ở lần poll kế tiếp.
      }
    }, 3000);

    return () => clearInterval(interval);
  // Cố ý chỉ chạy lại khi mã/trạng thái thay đổi; không phụ thuộc toàn object để tránh reset polling.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sepayOrder?.orderCode, sepayOrder?.status]);

  // Lệnh QR demo không có ngân hàng/webhook thật — tự giả lập xác nhận sau vài giây,
  // vòng poll ở trên sẽ phát hiện và cập nhật giao diện như lệnh SePay thật.
  useEffect(() => {
    if (!sepayOrder?.isDemo || sepayOrder.status !== 'pending') return undefined;

    const timer = setTimeout(() => {
      walletService.confirmDemoQrOrder(sepayOrder.orderCode).catch(() => {});
    }, 4000);

    return () => clearTimeout(timer);
  }, [sepayOrder?.orderCode, sepayOrder?.isDemo, sepayOrder?.status]);

  useEffect(() => {
    if (sepayOrder?.status !== 'completed') return undefined;

    toast.success(`Nạp thành công ${formatMoney(sepayOrder.amount)} vào ví${sepayOrder.isDemo ? ' (QR demo)' : ' qua SePay'}.`);
    loadWallet();

    const timer = setTimeout(() => {
      setSepayOrder(null);
      setAmountRaw('');
      setQuickPicked(null);
      setTab('overview');
    }, 1800);

    return () => clearTimeout(timer);
  // Giữ trigger theo status để callback completed chỉ chạy một lần cho mỗi lệnh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sepayOrder?.status]);

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

  const submitWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(wForm.amount.replace(/\D/g, ''));

    if (!amount || amount <= 0)      { toast.warning('Vui lòng nhập số tiền muốn rút.'); return; }
    if (amount > balance)            { toast.error('Số tiền rút vượt quá số dư khả dụng.'); return; }
    if (!wForm.bank)                 { toast.warning('Vui lòng chọn ngân hàng nhận tiền.'); return; }
    if (!wForm.accountNumber.trim()) { toast.warning('Vui lòng nhập số tài khoản.'); return; }
    if (!wForm.accountHolder.trim()) { toast.warning('Vui lòng nhập tên chủ tài khoản.'); return; }

    setWithdrawLoading(true);
    try {
      await walletService.requestWithdraw({
        amount,
        note: wForm.note.trim(),
        isDemo: false,
        bankName: wForm.bank,
        bankAccountNumber: wForm.accountNumber.trim(),
        bankAccountHolder: wForm.accountHolder.trim().toUpperCase(),
      });
      setWForm({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });
      toast.success('Đã gửi yêu cầu rút tiền. Quản trị viên sẽ xử lý sớm nhất.');
      loadWithdrawals();
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu rút tiền thất bại, vui lòng thử lại.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleDemoWithdraw = async () => {
    const amount = Number(wForm.amount.replace(/\D/g, ''));
    if (!amount || amount <= 0) { toast.warning('Vui lòng nhập số tiền muốn rút.'); return; }
    if (amount > balance) { toast.error('Số tiền rút vượt quá số dư khả dụng.'); return; }

    setWithdrawLoading(true);
    try {
      await walletService.requestWithdraw({ amount, isDemo: true });
      setWForm({ amount: '', bank: '', accountNumber: '', accountHolder: '', note: '' });
      toast.success(`Đã gửi yêu cầu rút ${formatMoney(amount)} (demo). Chờ quản trị viên duyệt để hoàn tất.`);
      loadWithdrawals();
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu rút tiền thất bại, vui lòng thử lại.');
    } finally {
      setWithdrawLoading(false);
    }
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

      {loading ? (
        <div className="spinner-border text-success" role="status" />
      ) : (
        <>
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
                {transactions.length === 0 ? (
                  <div className="ewt-empty">
                    <FiInbox />
                    <p>Chưa có giao dịch nào.</p>
                  </div>
                ) : (
                  <div className="ewt-tx-list">
                    {transactions.slice(0, 5).map((tx) => {
                      const meta = TX_META[tx.type] || TX_META.topup;
                      const Icon = meta.icon;
                      const isOutgoing = (tx.source === 'escrow' && tx.direction === 'out') || tx.type === 'withdraw';
                      return (
                        <article key={`${tx.source}-${tx.id}`} className="ewt-tx-row">
                          <span className={`ewt-tx-icon ewt-tx-icon--${meta.tone}`}><Icon /></span>
                          <div className="ewt-tx-main">
                            <strong>{tx.typeLabel || meta.label}</strong>
                            <span>{tx.description}</span>
                            <small>{formatDateTime(tx.createdAt)}</small>
                          </div>
                          <div className="ewt-tx-right">
                            <span className={`ewt-tx-amount ${isOutgoing ? 'down' : 'up'}`}>
                              {isOutgoing ? '-' : '+'}{formatMoney(tx.amount)}
                            </span>
                            <TxStatusBadge tx={tx} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
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
                  <span className={`ewt-progress-steps__item ${sepayOrder ? 'done' : 'active'}`}>
                    <span className="ewt-progress-steps__dot">1</span>Chọn số tiền
                  </span>
                  <span className="ewt-progress-steps__line" />
                  <span className={`ewt-progress-steps__item ${sepayOrder?.status === 'completed' ? 'done' : sepayOrder ? 'active' : ''}`}>
                    <span className="ewt-progress-steps__dot">2</span>Thanh toán
                  </span>
                  <span className="ewt-progress-steps__line" />
                  <span className={`ewt-progress-steps__item ${sepayOrder?.status === 'completed' ? 'done' : ''}`}>
                    <span className="ewt-progress-steps__dot">3</span>Tiền vào ví
                  </span>
                </div>

                {!sepayOrder ? (
                  <>
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
                      <button
                        type="button"
                        className="ewt-btn ewt-btn--outline"
                        onClick={handleCreateSePayOrder}
                        disabled={sepayCreating}
                      >
                        <FiHome /> {sepayCreating ? 'Đang tạo lệnh...' : 'Tạo lệnh SePay'}
                      </button>
                      <button
                        type="button"
                        className="ewt-btn ewt-btn--outline"
                        onClick={handleCreateDemoQrOrder}
                        disabled={sepayCreating}
                      >
                        <FiCamera /> {sepayCreating ? 'Đang tạo mã...' : 'Quét mã QR (demo)'}
                      </button>
                      <button
                        type="button"
                        className="ewt-btn ewt-btn--gradient"
                        onClick={handleDemoTopUp}
                        disabled={topupLoading}
                      >
                        <FiZap /> {topupLoading ? 'Đang xử lý...' : 'Nạp demo (tức thì)'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="ewt-sepay-panel">
                    {sepayOrder.isDemo && (
                      <div className="ewt-sepay-demo-note">
                        <FiCamera /> Mã QR demo — không cần chuyển khoản thật, hệ thống sẽ tự xác nhận sau vài giây.
                      </div>
                    )}

                    <img className="ewt-sepay-qr" src={sepayOrder.qrUrl} alt="QR chuyển khoản SePay" />

                    <div className="ewt-sepay-info">
                      <div className="ewt-sepay-row">
                        <span>Ngân hàng</span>
                        <strong>{sepayOrder.bank?.bankCode}</strong>
                      </div>
                      <div className="ewt-sepay-row">
                        <span>Số tài khoản</span>
                        <strong>{sepayOrder.bank?.accountNumber}</strong>
                        <button type="button" onClick={() => copySepayField(sepayOrder.bank?.accountNumber, 'số tài khoản')}>
                          <FiCopy />
                        </button>
                      </div>
                      <div className="ewt-sepay-row">
                        <span>Chủ tài khoản</span>
                        <strong>{sepayOrder.bank?.accountHolder}</strong>
                      </div>
                      <div className="ewt-sepay-row">
                        <span>Số tiền</span>
                        <strong>{formatMoney(sepayOrder.amount)}</strong>
                      </div>
                      <div className="ewt-sepay-row ewt-sepay-row--highlight">
                        <span>Nội dung chuyển khoản (bắt buộc, giữ đúng)</span>
                        <strong>{sepayOrder.transferContent}</strong>
                        <button type="button" onClick={() => copySepayField(sepayOrder.transferContent, 'nội dung chuyển khoản')}>
                          <FiCopy />
                        </button>
                      </div>
                    </div>

                    <div className={`ewt-sepay-status ${sepayOrder.status === 'completed' ? 'success' : ''}`}>
                      {sepayOrder.status === 'completed' ? (
                        <><FiCheck /> Đã nhận được tiền, đang cộng vào ví...</>
                      ) : sepayOrder.isDemo ? (
                        <><FiLoader className="ewt-spin" /> Đang giả lập xác nhận...</>
                      ) : (
                        <><FiLoader className="ewt-spin" /> Đang chờ SePay xác nhận chuyển khoản...</>
                      )}
                    </div>

                    {sepayOrder.status !== 'completed' && (
                      <button type="button" className="ewt-btn ewt-btn--outline ewt-btn--full" onClick={resetSepayOrder}>
                        Nhập số tiền khác
                      </button>
                    )}
                  </div>
                )}
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
                      <p>Nạp tức thì, không cần thanh toán — dùng để trải nghiệm và kiểm thử hệ thống. Tối đa 100.000.000đ/lần.</p>
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

                  <button
                    type="button"
                    className="ewt-btn ewt-btn--outline ewt-btn--full"
                    onClick={handleDemoWithdraw}
                    disabled={withdrawLoading}
                  >
                    <FiZap /> {withdrawLoading ? 'Đang xử lý...' : 'Rút demo (tức thì) — không cần thông tin ngân hàng'}
                  </button>

                  <p className="ewt-helper" style={{ marginTop: 0 }}>
                    Hoặc điền đầy đủ thông tin bên dưới để gửi yêu cầu rút tiền qua ngân hàng thật (chờ quản trị viên duyệt):
                  </p>

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
                {withdrawalsLoading ? (
                  <div className="ewt-empty"><p>Đang tải...</p></div>
                ) : withdrawals.length === 0 ? (
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
                          <TxStatusBadge tx={{ source: 'payment', status: w.status }} />
                        </div>
                        <p className="ewt-withdraw-item__meta">
                          {w.bankName ? `${w.bankName} • ${w.bankAccountNumber} • ${w.bankAccountHolder}` : 'Rút demo — không cần thông tin ngân hàng'}
                        </p>
                        <p className="ewt-withdraw-item__meta">{formatDateTime(w.createdAt)}</p>
                        {w.status === 'rejected' && w.rejectReason && (
                          <p className="ewt-withdraw-item__meta" style={{ color: '#dc2626' }}>Lý do từ chối: {w.rejectReason}</p>
                        )}
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
                    onClick={() => handleHistoryFilterChange(f.key)}
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
                      <th>Trạng thái</th><th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTransactions.map((tx) => {
                      const meta = TX_META[tx.type] || TX_META.topup;
                      const Icon = meta.icon;
                      const isOutgoing = (tx.source === 'escrow' && tx.direction === 'out') || tx.type === 'withdraw';
                      return (
                        <tr key={`${tx.source}-${tx.id}`}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <span className={`ewt-tx-icon ewt-tx-icon--${meta.tone}`} style={{ width: 30, height: 30 }}>
                                <Icon />
                              </span>
                              {tx.typeLabel || meta.label}
                            </span>
                          </td>
                          <td>{tx.description}</td>
                          <td className={isOutgoing ? 'ent-money ent-money--down' : 'ent-money ent-money--up'}>
                            {isOutgoing ? '-' : '+'}{formatMoney(tx.amount)}
                          </td>
                          <td><TxStatusBadge tx={tx} /></td>
                          <td>{formatDateTime(tx.createdAt)}</td>
                        </tr>
                      );
                    })}
                    {!historyLoading && historyTransactions.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>Không có giao dịch phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {historyTransactions.length > 0 && (
                <div className="et-pagination">
                  <span>
                    Trang {historyPagination.page} / {historyPagination.totalPages} — {historyPagination.total.toLocaleString('vi-VN')} giao dịch
                  </span>
                  <div className="et-pagination-btns">
                    <button
                      type="button"
                      disabled={historyPagination.page <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    >
                      <FiChevronLeft size={14} /> Trước
                    </button>
                    <button
                      type="button"
                      disabled={historyPagination.page >= historyPagination.totalPages}
                      onClick={() => setHistoryPage((p) => Math.min(historyPagination.totalPages, p + 1))}
                    >
                      Sau <FiChevronRight size={14} />
                    </button>
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

export default EnterpriseWallet;
