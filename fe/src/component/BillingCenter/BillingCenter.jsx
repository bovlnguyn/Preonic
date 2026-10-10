import React, { useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCreditCard,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from 'react-icons/fi';
import billingService from '../../services/billing.service';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './BillingCenter.css';

const fmtMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '—');
const idempotencyKey = () => window.crypto?.randomUUID?.()
  || `fee-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

function SettlementAccounts() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bankCode: '',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    makeDefault: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await billingService.listSettlementAccounts();
      setAccounts(res?.data?.accounts || []);
    } catch (err) {
      toast.error(err?.message || 'Không thể tải tài khoản nhận tiền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await billingService.saveSettlementAccount(form);
      toast.success('Đã lưu tài khoản nhận tiền.');
      setForm({
        bankCode: '',
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        makeDefault: true,
      });
      await load();
    } catch (err) {
      toast.error(err?.message || 'Không thể lưu tài khoản nhận tiền.');
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (id) => {
    try {
      await billingService.setDefaultSettlementAccount(id);
      toast.success('Đã đổi tài khoản nhận tiền mặc định.');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Không thể đổi tài khoản mặc định.');
    }
  };

  const disable = async (id) => {
    if (!window.confirm('Vô hiệu hóa tài khoản nhận tiền này?')) return;
    try {
      await billingService.disableSettlementAccount(id);
      toast.success('Đã vô hiệu hóa tài khoản.');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Không thể vô hiệu hóa tài khoản.');
    }
  };

  return (
    <section className="billing-card billing-card--settlement">
      <div className="billing-card__head billing-card__head--spacious">
        <div>
          <span className="billing-card__eyebrow">Tài khoản nhận tiền</span>
          <h3>Tài khoản nhận tiền hàng</h3>
          <p>Tiền hàng từ doanh nghiệp sẽ được chuyển trực tiếp vào tài khoản mặc định này. Hãy khai báo chính xác để tránh ảnh hưởng tới hợp đồng Direct V2.</p>
        </div>
      </div>

      <form className="billing-bank-form" onSubmit={save}>
        <div className="billing-field">
          <label htmlFor="settlement-bank-code">Mã ngân hàng</label>
          <input
            id="settlement-bank-code"
            placeholder="VD: VCB"
            value={form.bankCode}
            onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
            required
          />
        </div>

        <div className="billing-field">
          <label htmlFor="settlement-bank-name">Tên ngân hàng</label>
          <input
            id="settlement-bank-name"
            placeholder="Nhập tên ngân hàng"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
        </div>

        <div className="billing-field">
          <label htmlFor="settlement-account-holder">Tên chủ tài khoản</label>
          <input
            id="settlement-account-holder"
            placeholder="Nhập tên chủ tài khoản"
            value={form.accountHolder}
            onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
            required
          />
        </div>

        <div className="billing-field">
          <label htmlFor="settlement-account-number">Số tài khoản</label>
          <input
            id="settlement-account-number"
            placeholder="Nhập số tài khoản nhận tiền"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            required
            inputMode="numeric"
            autoComplete="off"
          />
        </div>

        <div className="billing-bank-form__footer">
          <label className="billing-check">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(e) => setForm({ ...form, makeDefault: e.target.checked })}
            />
            Đặt làm mặc định
          </label>

          <button type="submit" className="billing-btn billing-btn--primary billing-btn--save" disabled={saving}>
            <FiPlus /> {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="billing-muted">Đang tải...</p>
      ) : accounts.length === 0 ? (
        <div className="billing-inline-alert" role="alert">
          <FiAlertCircle />
          <span>Bạn chưa có tài khoản nhận tiền. Cần thêm tài khoản trước khi ký hợp đồng Direct V2.</span>
        </div>
      ) : (
        <div className="billing-bank-list">
          {accounts.map((account) => (
            <div className="billing-bank-item" key={account.id}>
              <div className="billing-bank-item__content">
                <div className="billing-bank-item__meta">
                  <strong>{account.bankName || account.bankCode}</strong>
                  <span>{account.accountHolder} · {account.maskedAccountNumber}</span>
                </div>
                {account.isDefault && (
                  <span className="billing-default"><FiCheckCircle /> Mặc định</span>
                )}
              </div>

              <div className="billing-bank-actions">
                {!account.isDefault && account.status === 'active' && (
                  <button type="button" className="billing-ghost-btn" onClick={() => makeDefault(account.id)}>
                    Đặt mặc định
                  </button>
                )}
                {account.status === 'active' && (
                  <button type="button" className="billing-icon-btn danger" onClick={() => disable(account.id)} aria-label="Vô hiệu hóa tài khoản">
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const getStatusLabel = (status) => {
  if (status === 'restricted') return 'Đang bị giới hạn';
  if (status === 'overdue') return 'Quá hạn';
  if (status === 'due') return 'Có phí cần thanh toán';
  return 'Bình thường';
};

export default function BillingCenter() {
  const { user } = useAuth();
  const toast = useToast();
  const [account, setAccount] = useState(null);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [accountRes, statementRes] = await Promise.all([
        billingService.getAccount(),
        billingService.listStatements({ page: 1, limit: 20 }),
      ]);
      setAccount(accountRes?.data || null);
      setStatements(statementRes?.data?.statements || []);
    } catch (err) {
      toast.error(err?.message || 'Không thể tải trung tâm thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const payAmount = async ({ amount, statementId }) => {
    if (!amount || amount <= 0) return;
    setPaying(true);
    try {
      const res = await billingService.createFeePayment({
        amount,
        statementId,
        idempotencyKey: idempotencyKey(),
      });
      const payment = res?.data?.payment;
      if (payment?.paymentUrl) {
        window.open(payment.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success('Đã tạo yêu cầu thanh toán phí.');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Không thể tạo thanh toán phí.');
    } finally {
      setPaying(false);
    }
  };

  const outstanding = Number(account?.outstandingAmount || 0);
  const overdue = Number(account?.overdueAmount || 0);
  const currentState = account?.status || 'good_standing';

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div className="billing-hero__content">
          <span className="billing-hero__eyebrow">Thanh toán & phí dịch vụ</span>
          <h2>Trung tâm billing PreOnic</h2>
          <p>Tiền hàng không đi qua PreOnic. Khu vực này chỉ dùng để theo dõi công nợ phí dịch vụ nền tảng, bảng kê theo tháng và cấu hình tài khoản nhận tiền trực tiếp từ doanh nghiệp.</p>
        </div>

        <button type="button" className="billing-refresh" onClick={load} disabled={loading}>
          <FiRefreshCw /> Làm mới
        </button>
      </section>

      <section className="billing-summary">
        <article className="billing-stat-card">
          <span>Phí chưa thanh toán</span>
          <strong>{fmtMoney(outstanding)}</strong>
          <small>Tổng công nợ phí hệ thống cần xử lý</small>
        </article>

        <article className="billing-stat-card">
          <span>Phí quá hạn</span>
          <strong>{fmtMoney(overdue)}</strong>
          <small>Các khoản phí đã vượt hạn thanh toán</small>
        </article>

        <article className="billing-stat-card">
          <span>Trạng thái tài khoản</span>
          <strong className={`billing-state billing-state--${currentState}`}>
            {getStatusLabel(currentState)}
          </strong>
          <small>
            {currentState === 'restricted'
              ? 'Một số chức năng sẽ bị khóa cho tới khi thanh toán phí.'
              : currentState === 'overdue'
                ? 'Hệ thống đang nhắc thanh toán các khoản phí đã quá hạn.'
                : currentState === 'due'
                  ? 'Bạn đang có công nợ phí cần thanh toán.'
                  : 'Tài khoản hiện đang hoạt động bình thường.'}
          </small>
        </article>
      </section>

      {account?.status === 'restricted' && (
        <div className="billing-warning" role="alert">
          <FiAlertCircle />
          <span>Tài khoản đang bị giới hạn tạo giao dịch mới do phí quá hạn. Thanh toán phí để hệ thống tự gỡ giới hạn.</span>
        </div>
      )}

      {outstanding > 0 && (
        <section className="billing-pay-all">
          <div className="billing-pay-all__content">
            <span className="billing-pay-all__icon"><FiCreditCard /></span>
            <div>
              <strong>Thanh toán toàn bộ công nợ hiện tại</strong>
              <p>Hệ thống sẽ tạo một giao dịch thanh toán cho toàn bộ phần phí đang còn lại.</p>
            </div>
          </div>

          <div className="billing-pay-all__action">
            <span>{fmtMoney(outstanding)}</span>
            <button
              type="button"
              className="billing-btn billing-btn--primary"
              onClick={() => payAmount({ amount: outstanding })}
              disabled={paying}
            >
              {paying ? 'Đang tạo...' : 'Thanh toán ngay'}
            </button>
          </div>
        </section>
      )}

      <section className="billing-card">
        <div className="billing-card__head billing-card__head--spacious">
          <div>
            <span className="billing-card__eyebrow">Đối soát theo tháng</span>
            <h3>Bảng kê phí</h3>
            <p>Các khoản phí giao dịch được cộng dồn và tổng hợp theo tháng để bạn dễ kiểm tra, đối soát và thanh toán.</p>
          </div>
        </div>

        {loading ? (
          <p className="billing-muted">Đang tải...</p>
        ) : statements.length === 0 ? (
          <div className="billing-empty-state">
            <p>Chưa có bảng kê phí.</p>
          </div>
        ) : (
          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Mã bảng kê</th>
                  <th>Kỳ</th>
                  <th>Phát sinh</th>
                  <th>Đã trả</th>
                  <th>Còn lại</th>
                  <th>Hạn</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {statements.map((statement) => (
                  <tr key={statement.id}>
                    <td>{statement.statementCode}</td>
                    <td>{fmtDate(statement.periodStart)} - {fmtDate(statement.periodEnd)}</td>
                    <td>{fmtMoney(statement.currentPeriodCharges)}</td>
                    <td>{fmtMoney(statement.amountPaid)}</td>
                    <td>{fmtMoney(statement.remainingAmount)}</td>
                    <td>{fmtDate(statement.dueAt)}</td>
                    <td>
                      <span className={`billing-pill billing-pill--${statement.status}`}>
                        {statement.status}
                      </span>
                    </td>
                    <td>
                      {statement.remainingAmount > 0 && (
                        <button
                          type="button"
                          className="billing-small-btn"
                          disabled={paying}
                          onClick={() => payAmount({
                            amount: statement.remainingAmount,
                            statementId: statement.id,
                          })}
                        >
                          Thanh toán
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {user?.role === 'farmer' && <SettlementAccounts />}
    </div>
  );
}
