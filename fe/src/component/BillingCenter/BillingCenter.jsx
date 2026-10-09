import React, { useEffect, useState } from 'react';
import {
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
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
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
    <section className="billing-card">
      <div className="billing-card__head">
        <div>
          <h3>Tài khoản nhận tiền hàng</h3>
          <p>Tiền hàng từ doanh nghiệp sẽ được chuyển trực tiếp vào tài khoản mặc định này.</p>
        </div>
      </div>

      <form className="billing-bank-form" onSubmit={save}>
        <input
          placeholder="Mã ngân hàng, VD: VCB"
          value={form.bankCode}
          onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
          required
        />
        <input
          placeholder="Tên ngân hàng"
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
        />
        <input
          placeholder="Tên chủ tài khoản"
          value={form.accountHolder}
          onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
          required
        />
        <input
          placeholder="Số tài khoản"
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          required
          inputMode="numeric"
          autoComplete="off"
        />
        <label className="billing-check">
          <input
            type="checkbox"
            checked={form.makeDefault}
            onChange={(e) => setForm({ ...form, makeDefault: e.target.checked })}
          />
          Đặt làm mặc định
        </label>
        <button className="billing-btn billing-btn--primary" disabled={saving}>
          <FiPlus /> {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
        </button>
      </form>

      {loading ? (
        <p className="billing-muted">Đang tải...</p>
      ) : accounts.length === 0 ? (
        <p className="billing-muted">Bạn chưa có tài khoản nhận tiền. Cần thêm tài khoản trước khi ký hợp đồng Direct V2.</p>
      ) : (
        <div className="billing-bank-list">
          {accounts.map((account) => (
            <div className="billing-bank-item" key={account.id}>
              <div>
                <strong>{account.bankName || account.bankCode}</strong>
                <span>{account.accountHolder} · {account.maskedAccountNumber}</span>
              </div>
              <div className="billing-bank-actions">
                {account.isDefault ? (
                  <span className="billing-default"><FiCheckCircle /> Mặc định</span>
                ) : account.status === 'active' ? (
                  <button type="button" onClick={() => makeDefault(account.id)}>Đặt mặc định</button>
                ) : null}
                {account.status === 'active' && (
                  <button type="button" className="danger" onClick={() => disable(account.id)}>
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

  return (
    <div className="billing-page">
      <div className="billing-hero">
        <div>
          <p>Thanh toán & phí dịch vụ</p>
          <h2>Trung tâm billing PreOnic</h2>
          <span>Tiền hàng không đi qua PreOnic. Khu vực này chỉ dùng để quản lý phí dịch vụ nền tảng.</span>
        </div>
        <button type="button" className="billing-refresh" onClick={load} disabled={loading}>
          <FiRefreshCw /> Làm mới
        </button>
      </div>

      <div className="billing-summary">
        <div><span>Phí chưa thanh toán</span><strong>{fmtMoney(outstanding)}</strong></div>
        <div><span>Phí quá hạn</span><strong>{fmtMoney(account?.overdueAmount)}</strong></div>
        <div>
          <span>Trạng thái</span>
          <strong className={`billing-state billing-state--${account?.status || 'good_standing'}`}>
            {account?.status === 'restricted' ? 'Đang bị giới hạn'
              : account?.status === 'overdue' ? 'Quá hạn'
                : account?.status === 'due' ? 'Có phí cần thanh toán'
                  : 'Bình thường'}
          </strong>
        </div>
      </div>

      {account?.status === 'restricted' && (
        <div className="billing-warning">
          Tài khoản đang bị giới hạn tạo giao dịch mới do phí quá hạn. Thanh toán phí để hệ thống tự gỡ giới hạn.
        </div>
      )}

      {outstanding > 0 && (
        <div className="billing-pay-all">
          <div>
            <FiCreditCard />
            <span>Thanh toán toàn bộ công nợ hiện tại</span>
            <strong>{fmtMoney(outstanding)}</strong>
          </div>
          <button
            className="billing-btn billing-btn--primary"
            onClick={() => payAmount({ amount: outstanding })}
            disabled={paying}
          >
            {paying ? 'Đang tạo...' : 'Thanh toán ngay'}
          </button>
        </div>
      )}

      <section className="billing-card">
        <div className="billing-card__head">
          <div>
            <h3>Bảng kê phí</h3>
            <p>Các khoản phí giao dịch được cộng dồn và tổng hợp theo tháng.</p>
          </div>
        </div>

        {loading ? (
          <p className="billing-muted">Đang tải...</p>
        ) : statements.length === 0 ? (
          <p className="billing-muted">Chưa có bảng kê phí.</p>
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
                    <td>{statement.status}</td>
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
