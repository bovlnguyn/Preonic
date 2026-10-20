import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiLock,
  FiPlus,
  FiSmartphone,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiX,
  FiExternalLink,
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

const OPEN_PAYMENT_STATUSES = new Set(['pending', 'processing']);

const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

const isPaymentActive = (payment) => Boolean(
  payment
  && OPEN_PAYMENT_STATUSES.has(payment.status)
  && payment.expiresAt
  && new Date(payment.expiresAt).getTime() > Date.now()
);

const INITIAL_BANK_FORM = {
  bankCode: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
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
    errors.accountHolder = 'Tên chủ tài khoản phải từ 2 đến 150 ký tự.';
  } else if (/\p{N}/u.test(accountHolder)) {
    errors.accountHolder = 'Tên chủ tài khoản không được chứa số.';
  } else if (!/^[\p{L}\s.'’&()-]+$/u.test(accountHolder) || (accountHolder.match(/\p{L}/gu) || []).length < 2) {
    errors.accountHolder = 'Chỉ nhập chữ cái và dấu phân cách tên hợp lệ.';
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
  const [verifyingId, setVerifyingId] = useState(null);
  const [form, setForm] = useState(INITIAL_BANK_FORM);
  const [touched, setTouched] = useState({});
  const [verificationCapability, setVerificationCapability] = useState({
    configured: false,
    requiredForPayments: true,
    mode: 'unavailable',
    message: '',
  });

  const errors = useMemo(() => validateSettlementForm(form), [form]);
  const isFormValid = Object.keys(errors).length === 0;

  const load = async () => {
    setLoading(true);
    try {
      const res = await billingService.listSettlementAccounts();
      setAccounts(res?.data?.accounts || []);
      setVerificationCapability((prev) => res?.data?.verification || prev);
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
      toast.success('Đã gửi yêu cầu xác minh tài khoản cho quản trị viên.');
      setForm(INITIAL_BANK_FORM);
      setTouched({});
      await load();
    } catch (err) {
      toast.error(err?.message || 'Không thể lưu tài khoản nhận tiền.');
    } finally {
      setSaving(false);
    }
  };

  const reverify = async (id) => {
    if (!verificationCapability.configured || verifyingId) return;
    setVerifyingId(id);
    try {
      const response = await billingService.reverifySettlementAccount(id);
      if (response?.data?.verification?.status === 'verified') {
        toast.success('Tài khoản ngân hàng đã được xác minh.');
      } else {
        toast.error(response?.data?.verification?.message || 'Không thể xác minh tài khoản.');
      }
      await load();
    } catch (err) {
      toast.error(err?.message || 'Không thể xác minh lại tài khoản.');
    } finally {
      setVerifyingId(null);
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

      <div className={`billing-verification billing-capability billing-verification--${verificationCapability.configured ? 'verified' : 'unavailable'}`} role="status">
        {verificationCapability.configured ? <FiShield /> : <FiAlertCircle />}
        <div>
          <strong>{verificationCapability.configured ? 'Dịch vụ xác minh đã sẵn sàng' : 'Chưa kết nối dịch vụ xác minh'}</strong>
          <span>{verificationCapability.message || 'Chỉ tài khoản đã xác minh mới được dùng để ký và thanh toán hợp đồng.'}</span>
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
            maxLength={150}
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
          <span className="billing-field-hint">Tài khoản xác minh đầu tiên sẽ tự động trở thành tài khoản mặc định.</span>

          <div className="billing-bank-form__actions">
            <button
              type="submit"
              className="billing-btn billing-btn--primary billing-btn--save"
              disabled={!isFormValid || saving}
            >
              <FiPlus /> {saving ? 'Đang gửi...' : 'Gửi yêu cầu xác minh'}
            </button>
          </div>
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
                <span className={`billing-verification-badge billing-verification-badge--${account.verificationStatus || 'pending_admin_review'}`}>
                  {account.verificationStatus === 'verified' ? <FiCheckCircle /> : ['failed', 'rejected'].includes(account.verificationStatus) ? <FiAlertCircle /> : <FiShield />}
                  {{
                    pending_admin_review: 'Chờ admin duyệt',
                    awaiting_sepay_link: 'Chờ liên kết SePay',
                    verified: 'Đã xác minh',
                    rejected: 'Đã từ chối',
                    failed: 'Chưa tìm thấy trên SePay',
                  }[account.verificationStatus] || 'Chờ xác minh'}
                </span>
                {account.adminReviewNote && <small className="billing-bank-item__note">Ghi chú: {account.adminReviewNote}</small>}
              </div>

              <div className="billing-bank-actions">
                {['awaiting_sepay_link', 'failed'].includes(account.verificationStatus) && account.status === 'active' && (
                  <>
                    {verificationCapability.selfServiceUrl && (
                      <a className="billing-ghost-btn" href={verificationCapability.selfServiceUrl} target="_blank" rel="noreferrer">
                        Mở SePay <FiExternalLink />
                      </a>
                    )}
                  <button
                    type="button"
                    className="billing-ghost-btn"
                    onClick={() => reverify(account.id)}
                    disabled={!verificationCapability.configured || verifyingId === account.id}
                    title={!verificationCapability.configured ? 'Chưa cấu hình dịch vụ xác minh' : undefined}
                  >
                    {verifyingId === account.id ? 'Đang đối chiếu...' : 'Tôi đã liên kết — kiểm tra'}
                  </button>
                  </>
                )}
                {!account.isDefault && account.status === 'active' && account.verificationStatus === 'verified' && (
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

function FeePaymentSuccessModal({ payment, role, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!payment) return null;

  return createPortal(
    <div className={`billing-success-backdrop billing-success-backdrop--${role}`} role="presentation" onMouseDown={onClose}>
      <section
        className="billing-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-success-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="billing-success-modal__close" onClick={onClose} aria-label="Đóng thông báo">
          <FiX />
        </button>
        <span className="billing-success-modal__icon"><FiCheckCircle /></span>
        <h3 id="billing-success-title">Thanh toán thành công</h3>
        <p>PreOnic đã xác nhận khoản phí của bạn qua SePay.</p>
        <strong>{fmtMoney(payment.amount)}</strong>
        <small>Mã thanh toán: {payment.transferContent}</small>
        <button type="button" className="billing-btn billing-btn--primary" onClick={onClose} autoFocus>
          Hoàn tất
        </button>
      </section>
    </div>,
    document.body
  );
}

function FeePaymentBox({
  sectionRef,
  payment,
  secondsLeft,
  paying,
  outstanding,
  onCreate,
  onRegenerate,
  onCopy,
}) {
  const active = isPaymentActive(payment);
  const expired = payment?.status === 'expired'
    || (OPEN_PAYMENT_STATUSES.has(payment?.status) && secondsLeft <= 0);
  const mismatched = payment?.status === 'amount_mismatch';

  return (
    <section ref={sectionRef} className={`billing-card billing-payment ${payment ? 'billing-payment--ready' : 'billing-payment--empty'}`}>
      <div className="billing-card__head billing-card__head--spacious">
        <div>
          <span className="billing-card__eyebrow">Thanh toán phí qua SePay</span>
          <h3>Quét mã QR để thanh toán</h3>
          <p>Mã QR chứa sẵn số tiền và nội dung chuyển khoản. Hệ thống tự kiểm tra giao dịch và cập nhật công nợ.</p>
        </div>
        {active && (
          <div className="billing-payment__timer" aria-live="polite">
            <FiClock />
            <span>Còn hiệu lực</span>
            <strong>{formatCountdown(secondsLeft)}</strong>
          </div>
        )}
      </div>

      {!payment ? (
        <div className="billing-payment-placeholder">
          <div className="billing-payment-placeholder__preview" aria-hidden="true">
            <span className="billing-payment-placeholder__qr" />
            <span className="billing-payment-placeholder__line" />
            <span className="billing-payment-placeholder__line billing-payment-placeholder__line--short" />
          </div>
          <div className="billing-payment-placeholder__message">
            <span><FiLock /></span>
            <strong>Chưa có thông tin thanh toán</strong>
            <p>Nhấn “Thanh toán ngay” ở phần công nợ để hệ thống tạo mã QR có hiệu lực trong 10 phút.</p>
            {outstanding > 0 && (
              <button type="button" className="billing-btn billing-btn--primary" onClick={() => onCreate({ amount: outstanding })} disabled={paying}>
                {paying ? 'Đang tạo mã...' : 'Tạo mã thanh toán'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`billing-payment__body ${expired || mismatched ? 'billing-payment__body--inactive' : ''}`}>
          <div className="billing-payment__qr-wrap">
            {payment.paymentUrl && payment.provider === 'bank_transfer' ? (
              <img src={payment.paymentUrl} alt={`Mã QR thanh toán ${fmtMoney(payment.amount)}`} className="billing-payment__qr" />
            ) : (
              <div className="billing-payment__qr-fallback"><FiSmartphone /><span>Mã QR chỉ hiển thị khi dùng cấu hình SePay.</span></div>
            )}
            {(expired || mismatched) && (
              <div className="billing-payment__inactive-cover">
                <FiAlertCircle />
                <strong>{mismatched ? 'Số tiền nhận chưa khớp' : 'Mã QR đã hết hiệu lực'}</strong>
              </div>
            )}
          </div>

          <div className="billing-payment__details">
            <div className="billing-payment__amount">
              <span>Số tiền thanh toán</span>
              <strong>{fmtMoney(payment.amount)}</strong>
            </div>
            <dl>
              <div><dt>Ngân hàng</dt><dd>{payment.recipient?.bankCode || 'Theo mã QR'}</dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{payment.recipient?.accountHolder || 'PREONIC'}</dd></div>
              <div><dt>Số tài khoản</dt><dd>{payment.recipient?.accountNumber || 'Đã mã hóa trong QR'}</dd></div>
              <div>
                <dt>Nội dung chuyển khoản</dt>
                <dd>
                  <code>{payment.transferContent}</code>
                  <button type="button" onClick={() => onCopy(payment.transferContent)} aria-label="Sao chép nội dung chuyển khoản"><FiCopy /></button>
                </dd>
              </div>
            </dl>
            {payment.status === 'paid' ? (
              <div className="billing-payment__confirmed"><FiCheckCircle /><p><strong>Đã thanh toán</strong>Giao dịch đã được SePay xác nhận thành công.</p></div>
            ) : active ? (
              <div className="billing-payment__waiting"><span /><p><strong>Đang chờ thanh toán</strong>Giữ trang này mở, hệ thống sẽ tự xác nhận sau khi SePay nhận giao dịch.</p></div>
            ) : (
              <div className={`billing-payment__notice ${mismatched ? 'billing-payment__notice--danger' : ''}`}>
                <FiAlertCircle />
                <p>{mismatched
                  ? 'Số tiền ngân hàng ghi nhận không khớp. Vui lòng liên hệ hỗ trợ và không chuyển thêm vào mã này.'
                  : 'Mã này không còn hiệu lực. Hãy tạo mã mới trước khi chuyển khoản.'}</p>
              </div>
            )}
            {expired && (
              <button type="button" className="billing-btn billing-btn--primary billing-payment__regenerate" onClick={onRegenerate} disabled={paying}>
                <FiRefreshCw /> {paying ? 'Đang tạo mã...' : 'Tạo mã mới'}
              </button>
            )}
          </div>
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
  const location = useLocation();
  const paymentSectionRef = useRef(null);
  const [account, setAccount] = useState(null);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [activePayment, setActivePayment] = useState(() => location.state?.feePayment || null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [successPayment, setSuccessPayment] = useState(null);
  const paymentStorageKey = useMemo(
    () => `preonic:active-fee-payment:${user?.id || user?._id || user?.role || 'anonymous'}`,
    [user?.id, user?._id, user?.role]
  );

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

  useEffect(() => {
    const routedPayment = location.state?.feePayment;
    if (routedPayment?.id) {
      setActivePayment(routedPayment);
      sessionStorage.setItem(paymentStorageKey, routedPayment.id);
      window.requestAnimationFrame(() => paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    const cachedId = sessionStorage.getItem(paymentStorageKey);
    let cancelled = false;
    const request = cachedId
      ? billingService.getFeePayment(cachedId)
      : billingService.getActiveFeePayment();
    request
      .then((response) => {
        const payment = response?.data?.payment || null;
        if (!cancelled) setActivePayment(payment);
        if (payment?.id) sessionStorage.setItem(paymentStorageKey, payment.id);
      })
      .catch(() => sessionStorage.removeItem(paymentStorageKey));
    return () => { cancelled = true; };
  }, [location.state, paymentStorageKey]);

  useEffect(() => {
    if (!activePayment?.expiresAt || !OPEN_PAYMENT_STATUSES.has(activePayment.status)) {
      setSecondsLeft(0);
      return undefined;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(activePayment.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setActivePayment((current) => current?.id === activePayment.id
          ? { ...current, status: 'expired' }
          : current);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activePayment?.id, activePayment?.expiresAt, activePayment?.status]);

  useEffect(() => {
    if (!activePayment?.id || !OPEN_PAYMENT_STATUSES.has(activePayment.status)) return undefined;
    let cancelled = false;
    let checking = false;

    const checkStatus = async () => {
      if (checking || cancelled) return;
      checking = true;
      try {
        const response = await billingService.getFeePayment(activePayment.id);
        const updated = response?.data?.payment;
        if (!updated || cancelled) return;
        setActivePayment(updated);
        if (updated.status === 'paid') {
          sessionStorage.removeItem(paymentStorageKey);
          setSuccessPayment(updated);
          await load();
        } else if (!OPEN_PAYMENT_STATUSES.has(updated.status)) {
          sessionStorage.removeItem(paymentStorageKey);
        }
      } catch {
        // A temporary network failure should not invalidate a still-valid QR.
      } finally {
        checking = false;
      }
    };

    const poller = window.setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePayment?.id, activePayment?.status, paymentStorageKey]);

  const payAmount = async ({ amount, statementId }) => {
    if (!amount || amount <= 0) return;
    if (isPaymentActive(activePayment)) {
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.info('Bạn đang có một mã thanh toán còn hiệu lực.');
      return;
    }
    setPaying(true);
    try {
      const res = await billingService.createFeePayment({
        amount,
        statementId,
        idempotencyKey: idempotencyKey(),
      });
      const payment = res?.data?.payment;
      if (payment?.id) {
        setActivePayment(payment);
        sessionStorage.setItem(paymentStorageKey, payment.id);
        window.requestAnimationFrame(() => paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }
      toast.success('Đã tạo mã QR thanh toán có hiệu lực trong 10 phút.');
    } catch (err) {
      toast.error(err?.message || 'Không thể tạo thanh toán phí.');
    } finally {
      setPaying(false);
    }
  };

  const copyTransferContent = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Đã sao chép nội dung chuyển khoản.');
    } catch {
      toast.error('Không thể sao chép tự động. Vui lòng sao chép thủ công.');
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

      <FeePaymentBox
        sectionRef={paymentSectionRef}
        payment={activePayment}
        secondsLeft={secondsLeft}
        paying={paying}
        outstanding={outstanding}
        onCreate={payAmount}
        onRegenerate={() => payAmount({
          amount: Number(activePayment?.amount || outstanding),
          statementId: activePayment?.statementId || undefined,
        })}
        onCopy={copyTransferContent}
      />

      <FeePaymentSuccessModal
        payment={successPayment}
        role={user?.role || 'farmer'}
        onClose={() => {
          setSuccessPayment(null);
          setActivePayment(null);
        }}
      />
    </div>
  );
}
