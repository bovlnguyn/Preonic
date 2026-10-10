import React, { useEffect, useMemo, useState } from 'react';
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
import { VN_BANKS, getVietnamBankByCode } from '../../data/vn-banks';
import FarmerSectionHeader from '../FarmerDashboard/components/SectionHeader';
import EnterpriseSectionHeader from '../EnterpriseDashboard/components/SectionHeader';
import './BillingCenter.css';

const fmtMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '—');
const idempotencyKey = () => window.crypto?.randomUUID?.()
  || `fee-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const INITIAL_BANK_FORM = {
  bankCode: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  makeDefault: true,
};

const normalizeSpaces = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const validateSettlementForm = (values) => {
  const errors = {};
  const selectedBank = getVietnamBankByCode(values.bankCode);
  const accountHolder = normalizeSpaces(values.accountHolder);
  const accountNumber = String(values.accountNumber || '').trim();

  if (!selectedBank || selectedBank.name !== values.bankName) {
    errors.bankName = 'Vui lòng chọn ngân hàng hợp lệ.';
  }

  if (!accountHolder) {
    errors.accountHolder = 'Vui lòng nhập tên chủ tài khoản.';
  } else if (accountHolder.length < 2 || accountHolder.length > 150) {
    errors.accountHolder = 'Tên chủ tài khoản không phù hợp.';
  } else if (!/^[\p{L}\p{N}\s.,&'()/-]+$/u.test(accountHolder)) {
    errors.accountHolder = 'Tên chủ tài khoản không phù hợp.';
  }

  if (!accountNumber) {
    errors.accountNumber = 'Vui lòng nhập số tài khoản.';
  } else if (!/^[0-9]{6,20}$/.test(accountNumber)) {
    errors.accountNumber = 'Số tài khoản không phù hợp.';
  }

  return errors;
};

function SettlementAccounts() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_BANK_FORM);
  const [touched, setTouched] = useState({});

  const errors = useMemo(() => validateSettlementForm(form), [form]);
  const isFormValid = Object.keys(errors).length === 0;

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

  const touchField = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleBankChange = (event) => {
    const bankCode = event.target.value;
    const bank = getVietnamBankByCode(bankCode);

    setForm((prev) => ({
      ...prev,
      bankCode: bank?.code || '',
      bankName: bank?.name || '',
    }));
    touchField('bankName');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    touchField(name);
  };

  const handleBlur = (event) => touchField(event.target.name);

  const save = async (event) => {
    event.preventDefault();
    const allTouched = {
      bankName: true,
      accountHolder: true,
      accountNumber: true,
    };
    setTouched(allTouched);

    if (!isFormValid || saving) return;

    setSaving(true);
    try {
      await billingService.saveSettlementAccount({
        ...form,
        accountHolder: normalizeSpaces(form.accountHolder),
        accountNumber: form.accountNumber.trim(),
      });
      toast.success('Đã lưu tài khoản nhận tiền.');
      setForm(INITIAL_BANK_FORM);
      setTouched({});
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
          <p>
            Tiền hàng từ doanh nghiệp sẽ được chuyển trực tiếp vào tài khoản mặc định này.
            Hãy khai báo chính xác để tránh ảnh hưởng đến việc thanh toán hợp đồng.
          </p>
        </div>
      </div>

      <form className="billing-bank-form" onSubmit={save} noValidate>
        <div className="billing-field">
          <label htmlFor="settlement-bank-name">Tên ngân hàng</label>
          <select
            id="settlement-bank-name"
            name="bankName"
            value={form.bankCode}
            onChange={handleBankChange}
            onBlur={handleBlur}
            className={touched.bankName && errors.bankName ? 'billing-control--invalid' : ''}
          >
            <option value="">Chọn ngân hàng</option>
            {VN_BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          {touched.bankName && errors.bankName && (
            <span className="billing-field-error" role="alert">{errors.bankName}</span>
          )}
        </div>

        <div className="billing-field">
          <label htmlFor="settlement-bank-code">Mã ngân hàng</label>
          <input
            id="settlement-bank-code"
            value={form.bankCode}
            placeholder="Tự động theo ngân hàng đã chọn"
            readOnly
            aria-readonly="true"
          />
          <span className="billing-field-hint">Mã được hệ thống tự điền theo ngân hàng bạn chọn.</span>
        </div>

        <div className="billing-field">
          <label htmlFor="settlement-account-holder">Tên chủ tài khoản</label>
          <input
            id="settlement-account-holder"
            name="accountHolder"
            placeholder="Nhập tên chủ tài khoản"
            value={form.accountHolder}
            onChange={handleFieldChange}
            onBlur={handleBlur}
            className={touched.accountHolder && errors.accountHolder ? 'billing-control--invalid' : ''}
            autoComplete="name"
          />
          {touched.accountHolder && errors.accountHolder && (
            <span className="billing-field-error" role="alert">{errors.accountHolder}</span>
          )}
        </div>

        <div className="billing-field">
          <label htmlFor="settlement-account-number">Số tài khoản</label>
          <input
            id="settlement-account-number"
            name="accountNumber"
            placeholder="Nhập số tài khoản nhận tiền"
            value={form.accountNumber}
            onChange={handleFieldChange}
            onBlur={handleBlur}
            className={touched.accountNumber && errors.accountNumber ? 'billing-control--invalid' : ''}
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
          />
          {touched.accountNumber && errors.accountNumber && (
            <span className="billing-field-error" role="alert">{errors.accountNumber}</span>
          )}
        </div>

        <div className="billing-bank-form__footer">
          <label className="billing-check">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(event) => setForm((prev) => ({ ...prev, makeDefault: event.target.checked }))}
            />
            Đặt làm mặc định
          </label>

          <button
            type="submit"
            className="billing-btn billing-btn--primary billing-btn--save"
            disabled={!isFormValid || saving}
          >
            <FiPlus /> {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="billing-muted">Đang tải...</p>
      ) : accounts.length === 0 ? (
        <div className="billing-inline-warning" role="alert">
          <FiAlertCircle />
          <span>Bạn chưa có tài khoản nhận tiền. Cần thêm tài khoản trước khi ký hợp đồng.</span>
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
                  <button
                    type="button"
                    className="billing-icon-btn danger"
                    onClick={() => disable(account.id)}
                    aria-label="Vô hiệu hóa tài khoản"
                  >
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
  const PageSectionHeader = user?.role === 'enterprise'
    ? EnterpriseSectionHeader
    : FarmerSectionHeader;

  return (
    <div className={user?.role === 'enterprise' ? 'ent-stack billing-page' : 'farmer-stack billing-page'}>
      <PageSectionHeader
        breadcrumb="Thanh toán & Phí"
        eyebrow="Thanh toán & phí"
        title="Theo dõi thanh toán và phí dịch vụ"
        desc="Theo dõi công nợ phí nền tảng, bảng kê theo tháng và tài khoản nhận tiền phục vụ thanh toán hợp đồng."
        action={(
          <button type="button" className="billing-refresh" onClick={load} disabled={loading}>
            <FiRefreshCw /> Làm mới
          </button>
        )}
      />

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
