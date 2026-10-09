import React, { useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiPackage,
  FiRefreshCw,
  FiTruck,
} from 'react-icons/fi';
import contractService from '../../services/contract.service';
import billingService from '../../services/billing.service';
import { useToast } from '../../contexts/ToastContext';
import './DirectPaymentPanel.css';

const fmtMoney = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const PAYMENT_STATUS = {
  planned: 'Đã lên kế hoạch',
  payable: 'Chờ doanh nghiệp thanh toán',
  awaiting_payment: 'Chờ thanh toán',
  awaiting_confirmation: 'Đã báo chuyển — chờ nông dân xác nhận',
  confirmed: 'Đã nhận tiền',
  disputed: 'Đang tranh chấp',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
};

const DELIVERY_STATUS = {
  pending: 'Chờ chuẩn bị',
  preparing: 'Đang chuẩn bị hàng',
  shipping: 'Đang giao hàng',
  delivered: 'Đã nhận hàng',
  failed: 'Giao hàng thất bại',
};

const buildIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `fee-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};

function FeePrompt({ feeAccount, onClose }) {
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const outstanding = Number(feeAccount?.outstandingAmount || 0);

  const handlePayNow = async () => {
    if (outstanding <= 0) return onClose();
    setPaying(true);
    try {
      const res = await billingService.createFeePayment({
        amount: outstanding,
        idempotencyKey: buildIdempotencyKey(),
      });
      const payment = res?.data?.payment;
      if (payment?.paymentUrl) {
        window.open(payment.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success('Đã tạo yêu cầu thanh toán phí PreOnic.');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Không thể tạo thanh toán phí.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="dp-modal-backdrop">
      <div className="dp-modal">
        <h3>Phí dịch vụ đã được ghi nhận</h3>
        <p>
          Công nợ phí PreOnic hiện tại của bạn là <strong>{fmtMoney(outstanding)}</strong>.
          Bạn có thể thanh toán ngay hoặc để hệ thống cộng dồn vào bảng kê.
        </p>
        <div className="dp-modal__actions">
          <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose} disabled={paying}>
            Để sau
          </button>
          <button type="button" className="dp-btn dp-btn--primary" onClick={handlePayNow} disabled={paying}>
            {paying ? 'Đang tạo...' : 'Thanh toán phí ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({
  contractId,
  payment,
  userRole,
  onRefresh,
  onFeePrompt,
}) {
  const toast = useToast();
  const [acting, setActing] = useState(false);
  const [instruction, setInstruction] = useState(null);

  const canShowInstruction =
    userRole === 'enterprise' &&
    ['payable', 'awaiting_payment', 'awaiting_confirmation'].includes(payment.status);

  const loadInstruction = async () => {
    setActing(true);
    try {
      const res = await contractService.getDirectPaymentInstruction(contractId, payment.id);
      setInstruction(res?.data?.instruction || null);
    } catch (err) {
      toast.error(err?.message || 'Không thể lấy mã QR thanh toán.');
    } finally {
      setActing(false);
    }
  };

  const markSent = async () => {
    setActing(true);
    try {
      await contractService.markDirectPaymentSent(contractId, payment.id);
      toast.success('Đã báo cho nông dân rằng bạn đã chuyển tiền.');
      setInstruction(null);
      onRefresh();
    } catch (err) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái thanh toán.');
    } finally {
      setActing(false);
    }
  };

  const confirmReceived = async () => {
    setActing(true);
    try {
      const res = await contractService.confirmDirectPaymentReceived(contractId, payment.id);
      toast.success('Đã xác nhận nhận tiền.');
      if (res?.data?.promptFeePayment) {
        onFeePrompt(res.data.feeAccount);
      }
      onRefresh();
    } catch (err) {
      toast.error(err?.message || 'Không thể xác nhận nhận tiền.');
    } finally {
      setActing(false);
    }
  };

  return (
    <article className="dp-payment-card">
      <div className="dp-payment-card__head">
        <div>
          <span>Đợt {payment.installmentSequence}</span>
          <strong>{fmtMoney(payment.amount)}</strong>
        </div>
        <span className={`dp-status dp-status--${payment.status}`}>
          {PAYMENT_STATUS[payment.status] || payment.status}
        </span>
      </div>

      <div className="dp-grid">
        <div><span>Nội dung chuyển khoản</span><strong>{payment.transferContent}</strong></div>
        <div><span>Tài khoản nhận</span><strong>{payment.recipient?.accountHolder || '—'}</strong></div>
        <div><span>Số tài khoản</span><strong>{payment.recipient?.maskedAccountNumber || '—'}</strong></div>
        <div><span>Phí DN</span><strong>{fmtMoney(payment.fees?.enterpriseFeeAmount)}</strong></div>
        <div><span>Phí nông dân</span><strong>{fmtMoney(payment.fees?.farmerFeeAmount)}</strong></div>
      </div>

      {canShowInstruction && (
        <div className="dp-actions">
          <button type="button" className="dp-btn dp-btn--secondary" onClick={loadInstruction} disabled={acting}>
            <FiCreditCard /> {acting ? 'Đang tải...' : 'Xem QR & thông tin chuyển khoản'}
          </button>
        </div>
      )}

      {userRole === 'enterprise' && payment.status === 'payable' && (
        <div className="dp-actions">
          <button type="button" className="dp-btn dp-btn--primary" onClick={markSent} disabled={acting}>
            <FiCheckCircle /> Tôi đã chuyển tiền
          </button>
        </div>
      )}

      {userRole === 'farmer' && payment.status === 'awaiting_confirmation' && (
        <div className="dp-actions">
          <button type="button" className="dp-btn dp-btn--primary" onClick={confirmReceived} disabled={acting}>
            <FiCheckCircle /> Tôi đã nhận đủ tiền
          </button>
        </div>
      )}

      {instruction && (
        <div className="dp-instruction">
          <div className="dp-instruction__qr">
            <img
              src={instruction.qrUrl}
              alt={`QR thanh toán ${fmtMoney(instruction.amount)}`}
              loading="lazy"
            />
          </div>
          <div className="dp-instruction__details">
            <h4>Chuyển trực tiếp cho nông dân</h4>
            <p><span>Ngân hàng:</span><strong>{instruction.recipient?.bankName || instruction.recipient?.bankCode}</strong></p>
            <p><span>Chủ tài khoản:</span><strong>{instruction.recipient?.accountHolder}</strong></p>
            <p><span>Số tài khoản:</span><strong>{instruction.recipient?.accountNumber}</strong></p>
            <p><span>Số tiền:</span><strong>{fmtMoney(instruction.amount)}</strong></p>
            <p><span>Nội dung:</span><strong>{instruction.transferContent}</strong></p>
            <small>
              Tiền đi thẳng từ tài khoản doanh nghiệp tới tài khoản nông dân. PreOnic không giữ tiền hàng.
            </small>
          </div>
        </div>
      )}
    </article>
  );
}

export default function DirectPaymentPanel({ contract, userRole, onContractRefresh }) {
  const toast = useToast();
  const [workflow, setWorkflow] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [feePrompt, setFeePrompt] = useState(null);
  const [feeAccount, setFeeAccount] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, feeRes] = await Promise.all([
        contractService.getDirectProgress(contract.id),
        billingService.getAccount().catch(() => null),
      ]);
      setWorkflow(res?.data?.workflow || null);
      setPayments(res?.data?.payments || []);
      setFeeAccount(feeRes?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Không thể tải tiến độ thanh toán trực tiếp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract?.paymentFlow === 'direct_v2') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id, contract?.paymentFlow]);

  const confirmedUpfront = useMemo(
    () => payments
      .filter((item) => item.trigger === 'contract_active')
      .every((item) => item.status === 'confirmed'),
    [payments]
  );

  const runDeliveryAction = async (action) => {
    setActing(true);
    try {
      if (action === 'preparing') {
        await contractService.markPreparing(contract.id);
        toast.success('Đã chuyển sang trạng thái chuẩn bị hàng.');
      } else if (action === 'shipped') {
        await contractService.markShipped(contract.id);
        toast.success('Đã xác nhận hàng đang được giao.');
      } else if (action === 'accepted') {
        await contractService.acceptDelivery(contract.id);
        toast.success('Đã xác nhận nhận hàng.');
      }
      await load();
      onContractRefresh?.();
    } catch (err) {
      toast.error(err?.message || 'Không thể cập nhật tiến độ giao hàng.');
    } finally {
      setActing(false);
    }
  };

  if (contract?.paymentFlow !== 'direct_v2') return null;

  return (
    <section className="dp-panel">
      <div className="dp-panel__header">
        <div>
          <p className="dp-eyebrow">Direct Payment V2</p>
          <h3>Thanh toán trực tiếp & tiến độ giao hàng</h3>
          <p>
            Doanh nghiệp chuyển tiền trực tiếp cho nông dân; PreOnic chỉ theo dõi xác nhận và thu phí dịch vụ riêng.
          </p>
        </div>
        <button type="button" className="dp-icon-btn" onClick={load} disabled={loading}>
          <FiRefreshCw /> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="dp-loading">Đang tải tiến độ...</div>
      ) : (
        <>
          <div className="dp-overview">
            <div><FiCreditCard /><span>Đã xác nhận</span><strong>{fmtMoney(workflow?.paidAmount)}</strong></div>
            <div><FiClock /><span>Còn lại</span><strong>{fmtMoney(workflow?.remainingAmount)}</strong></div>
            <div><FiTruck /><span>Giao hàng</span><strong>{DELIVERY_STATUS[workflow?.deliveryStatus] || workflow?.deliveryStatus || '—'}</strong></div>
          </div>

          {Number(feeAccount?.outstandingAmount || 0) > 0 && (
            <div className="dp-fee-banner">
              <div>
                <span>Phí dịch vụ đang chờ thanh toán</span>
                <strong>{fmtMoney(feeAccount.outstandingAmount)}</strong>
                {Number(feeAccount?.overdueAmount || 0) > 0 && (
                  <small>Quá hạn: {fmtMoney(feeAccount.overdueAmount)}</small>
                )}
              </div>
              <button
                type="button"
                className="dp-btn dp-btn--secondary"
                onClick={() => setFeePrompt(feeAccount)}
              >
                Thanh toán phí
              </button>
            </div>
          )}

          <div className="dp-payments">
            {payments.length === 0 ? (
              <div className="dp-empty">
                <FiCreditCard />
                <p>Chưa có khoản thanh toán đến hạn ở giai đoạn hiện tại.</p>
              </div>
            ) : payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                contractId={contract.id}
                payment={payment}
                userRole={userRole}
                onRefresh={async () => {
                  await load();
                  onContractRefresh?.();
                }}
                onFeePrompt={setFeePrompt}
              />
            ))}
          </div>

          {contract.status === 'active' && (
            <div className="dp-delivery">
              <h4><FiPackage /> Tiến độ giao hàng</h4>
              <div className="dp-delivery__actions">
                {userRole === 'farmer' && workflow?.deliveryStatus === 'pending' && (
                  <button
                    type="button"
                    className="dp-btn dp-btn--primary"
                    onClick={() => runDeliveryAction('preparing')}
                    disabled={acting || !confirmedUpfront}
                    title={!confirmedUpfront ? 'Cần xác nhận xong khoản trả trước trước khi chuẩn bị hàng' : undefined}
                  >
                    Bắt đầu chuẩn bị hàng
                  </button>
                )}

                {userRole === 'farmer' && workflow?.deliveryStatus === 'preparing' && (
                  <button
                    type="button"
                    className="dp-btn dp-btn--primary"
                    onClick={() => runDeliveryAction('shipped')}
                    disabled={acting}
                  >
                    <FiTruck /> Xác nhận đã giao hàng
                  </button>
                )}

                {userRole === 'enterprise' && workflow?.deliveryStatus === 'shipping' && (
                  <button
                    type="button"
                    className="dp-btn dp-btn--primary"
                    onClick={() => runDeliveryAction('accepted')}
                    disabled={acting}
                  >
                    <FiCheckCircle /> Xác nhận đã nhận hàng
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {feePrompt && (
        <FeePrompt feeAccount={feePrompt} onClose={() => setFeePrompt(null)} />
      )}
    </section>
  );
}
