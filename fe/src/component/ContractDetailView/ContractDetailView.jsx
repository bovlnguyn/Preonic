import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiAlertTriangle, FiMessageCircle } from 'react-icons/fi';
import contractService from '../../services/contract.service';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useMessagingWidget } from '../../contexts/MessagingWidgetContext';
import { CONTRACT_STATUS_LABEL, PAYMENT_TERMS_LABEL } from '../../constants/contract';
import ContractFlow from '../ContractFlow/ContractFlow';
import EscrowPanel from '../EscrowPanel/EscrowPanel';
import './ContractDetailView.css';

const FLOW_STEPS = [
  { key: 'proposed',        label: 'Đề xuất' },
  { key: 'farmer_sign',     label: 'Nông dân xác nhận' },
  { key: 'enterprise_sign', label: 'Doanh nghiệp ký' },
  { key: 'done',            label: 'Hoàn tất' },
];

const TERMINAL_STATUSES = ['cancelled', 'disputed'];
const CAN_CANCEL_STATUSES = ['pending', 'draft', 'approved', 'active'];

// Nong dan phai ky truoc, den luot doanh nghiep ky sau khi kich hoat hop dong
const resolveFlowProgress = (contract) => {
  const cancelled = TERMINAL_STATUSES.includes(contract.status);
  if (contract.status === 'active' || contract.status === 'completed')
    return { currentIndex: FLOW_STEPS.length, cancelled: false };
  if (cancelled) {
    const reachedIndex = contract.signedByFarmer ? 2 : 1;
    return { currentIndex: reachedIndex, cancelled: true };
  }
  if (contract.signedByEnterprise && contract.signedByFarmer)
    return { currentIndex: FLOW_STEPS.length, cancelled: false };
  if (contract.signedByFarmer)
    return { currentIndex: 2, cancelled: false };
  return { currentIndex: 1, cancelled: false };
};

const resolveStatusLabel = (contract) => {
  if (contract.status === 'cancel_pending') return 'Đang chờ xác nhận hủy';
  if (contract.status === 'pending' || contract.status === 'draft') {
    if (contract.signedByFarmer && !contract.signedByEnterprise) return 'Chờ doanh nghiệp ký';
    if (!contract.signedByFarmer && contract.signedByEnterprise)  return 'Chờ nông dân xác nhận';
    if (!contract.signedByFarmer && !contract.signedByEnterprise) return 'Chờ ký xác nhận';
  }
  return CONTRACT_STATUS_LABEL[contract.status] || contract.status;
};

const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const fmtDate  = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : 'Chưa cập nhật');

// ── Modal hủy hợp đồng ────────────────────────────────────
function CancelModal({ acting, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div className="cdv-modal-overlay" onClick={onClose}>
      <div className="cdv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cdv-modal__header">
          <FiAlertTriangle size={20} color="#dc2626" />
          <h3>Xác nhận hủy hợp đồng</h3>
        </div>
        <p className="cdv-modal__desc">
          Yêu cầu hủy sẽ được gửi đến bên còn lại. Hợp đồng chỉ bị hủy chính thức
          khi bên kia xác nhận đồng ý.
        </p>
        <div className="cdv-modal__field">
          <label>Lý do hủy hợp đồng <span style={{ color: '#dc2626' }}>*</span></label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Giá cả không phù hợp, thay đổi kế hoạch kinh doanh..."
          />
        </div>
        <div className="cdv-modal__actions">
          <button className="cdv-btn cdv-btn--outline" onClick={onClose} disabled={acting}>
            Đóng
          </button>
          <button
            className="cdv-btn cdv-btn--danger"
            onClick={() => onConfirm(reason)}
            disabled={acting || !reason.trim()}
          >
            {acting ? 'Đang gửi...' : 'Gửi yêu cầu hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal xác nhận đồng ý hủy (bên bị yêu cầu hủy) ───────
function ConfirmCancelModal({ contract, acting, onConfirm, onDecline, onClose }) {
  return (
    <div className="cdv-modal-overlay" onClick={onClose}>
      <div className="cdv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cdv-modal__header">
          <FiAlertTriangle size={20} color="#dc2626" />
          <h3>Yêu cầu hủy hợp đồng</h3>
        </div>
        <p className="cdv-modal__desc">
          Bên kia đã gửi yêu cầu hủy hợp đồng <strong>{contract.contractCode}</strong>.
        </p>
        {contract.cancelReason && (
          <div className="cdv-modal__reason">
            <strong>Lý do:</strong> {contract.cancelReason}
          </div>
        )}
        <p className="cdv-modal__desc" style={{ marginTop: 12 }}>
          Bạn có đồng ý hủy hợp đồng này không?
        </p>
        <div className="cdv-modal__actions">
          <button className="cdv-btn cdv-btn--outline" onClick={onDecline} disabled={acting}>
            Không đồng ý
          </button>
          <button className="cdv-btn cdv-btn--danger" onClick={onConfirm} disabled={acting}>
            {acting ? 'Đang xử lý...' : 'Đồng ý hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function ContractDetailView() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();
  const { openChatWith } = useMessagingWidget();

  const [contract, setContract]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [acting, setActing]             = useState(false);
  const [showSignReject, setShowSignReject] = useState(false); // popup từ chối ký
  const [signRejectReason, setSignRejectReason] = useState('');
  const [showCancelModal, setShowCancelModal]   = useState(false); // popup hủy HĐ
  const [showConfirmCancel, setShowConfirmCancel] = useState(false); // popup xác nhận hủy

  const backPath = user?.role === 'farmer' ? '/farmer/contracts' : '/enterprise/contracts';
  const isFarmer = user?.role === 'farmer';

  const load = () => {
    setLoading(true);
    contractService.getById(id)
      .then(res => setContract(res?.data?.contract || null))
      .catch(err => setError(err?.message || 'Không thể tải thông tin hợp đồng.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  // Ký xác nhận
  const handleSign = async () => {
    setActing(true);
    try {
      await contractService.sign(id);
      toast.success('Ký xác nhận hợp đồng thành công');
      load();
    } catch (err) {
      toast.error(err?.message || 'Ký hợp đồng thất bại, vui lòng thử lại.');
    } finally {
      setActing(false);
    }
  };

  // Từ chối ký (farmer từ chối đề xuất)
  const handleSignReject = async () => {
    setActing(true);
    try {
      await contractService.reject(id, signRejectReason);
      toast.success('Đã từ chối hợp đồng');
      setShowSignReject(false);
      load();
    } catch (err) {
      toast.error(err?.message || 'Từ chối hợp đồng thất bại.');
    } finally {
      setActing(false);
    }
  };

  // Gửi yêu cầu hủy (cả 2 bên)
  const handleRequestCancel = async (reason) => {
    if (!reason.trim()) return;
    setActing(true);
    try {
      await contractService.cancel(id, reason);
      toast.success('Đã gửi yêu cầu hủy hợp đồng. Chờ bên kia xác nhận.');
      setShowCancelModal(false);
      load();
    } catch (err) {
      toast.error(err?.message || 'Gửi yêu cầu hủy thất bại.');
    } finally {
      setActing(false);
    }
  };

  // Bên bị hủy xác nhận đồng ý hủy
  const handleConfirmCancel = async () => {
    setActing(true);
    try {
      await contractService.confirmCancel(id);
      toast.success('Hợp đồng đã được hủy chính thức.');
      setShowConfirmCancel(false);
      load();
    } catch (err) {
      toast.error(err?.message || 'Xác nhận hủy thất bại.');
    } finally {
      setActing(false);
    }
  };

  // Bên bị hủy từ chối xác nhận hủy (giữ nguyên hợp đồng)
  const handleDeclineCancel = async () => {
    setActing(true);
    try {
      await contractService.declineCancel(id);
      toast.success('Đã từ chối yêu cầu hủy. Hợp đồng tiếp tục có hiệu lực.');
      setShowConfirmCancel(false);
      load();
    } catch (err) {
      toast.error(err?.message || 'Thao tác thất bại.');
    } finally {
      setActing(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-success" role="status" />
    </div>
  );

  if (error || !contract) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#dc2626' }}>{error || 'Không tìm thấy hợp đồng.'}</p>
      <button className="cdv-btn cdv-btn--outline" onClick={() => navigate(backPath)}>
        <FiArrowLeft /> Quay lại
      </button>
    </div>
  );

  const mySigned  = isFarmer ? contract.signedByFarmer : contract.signedByEnterprise;
  const isTerminal = TERMINAL_STATUSES.includes(contract.status);

  // Doanh nghiep chi duoc ky sau khi nong dan da ky (khop guard o BE contract.service.ts#signContract)
  const waitingOnFarmer = !isFarmer && !contract.signedByFarmer;

  // Có thể ký nếu chưa ký, HĐ chưa kết thúc, và (là nông dân hoặc nông dân đã ký)
  const canSign = !mySigned && !isTerminal && contract.status !== 'cancel_pending' && !waitingOnFarmer;

  // Có thể hủy nếu HĐ đang trong trạng thái cho phép và chưa ai gửi yêu cầu hủy
  const canCancel = contract.status === 'active';

  // Bên bị yêu cầu hủy: cancel_pending và mình không phải người gửi yêu cầu
  const isCancelRequester = contract.cancelRequestedBy === user?.id;
  const canRespondToCancel = contract.status === 'cancel_pending' && !isCancelRequester;

  const { currentIndex, cancelled } = resolveFlowProgress(contract);
  const partnerId = isFarmer ? contract.enterprise?.id : contract.farmer?.id;
  const partnerName = isFarmer ? contract.enterprise?.name : contract.farmer?.name;

  return (
    <div className="cdv-page">
      <div className="cdv-top">
        <button className="cdv-back" onClick={() => navigate(backPath)}>
          <FiArrowLeft size={14} /> Quay lại
        </button>
        {partnerId && (
          <button
            className="cdv-message-btn"
            onClick={() => openChatWith(partnerId, partnerName)}
          >
            <FiMessageCircle size={14} /> Nhắn tin
          </button>
        )}
      </div>

      <ContractFlow steps={FLOW_STEPS} currentIndex={currentIndex} cancelled={cancelled} />

      <div className="cdv-card">
        <div className="cdv-card__header">
          <div>
            <h3>HỢP ĐỒNG BAO TIÊU NÔNG SẢN</h3>
            <p>Số: {contract.contractCode}</p>
          </div>
          <span className={`cdv-badge cdv-badge--${contract.status}`}>
            {resolveStatusLabel(contract)}
          </span>
        </div>

        {/* Thông tin hợp đồng */}
        <div className="cdv-summary">
          <div className="cdv-summary__row"><span>Doanh nghiệp:</span><strong>{contract.enterprise?.name}</strong></div>
          <div className="cdv-summary__row"><span>Nông dân:</span><strong>{contract.farmer?.name}</strong></div>
          <div className="cdv-summary__row"><span>Sản phẩm:</span><strong>{contract.product?.name}</strong></div>
          <div className="cdv-summary__row"><span>Số lượng:</span><strong>{contract.quantity} {contract.unit}</strong></div>
          <div className="cdv-summary__row"><span>Đơn giá:</span><strong>{fmtMoney(contract.pricePerUnit)}/{contract.unit}</strong></div>
          <div className="cdv-summary__row"><span>Ngày giao hàng:</span><strong>{fmtDate(contract.deliveryDate)}</strong></div>
          <div className="cdv-summary__row"><span>Đặt cọc:</span><strong>{PAYMENT_TERMS_LABEL[contract.paymentTerms] || contract.paymentTerms}</strong></div>
          {contract.farmLocation && <div className="cdv-summary__row"><span>Khu vực:</span><strong>{contract.farmLocation}</strong></div>}
          {contract.notes && <div className="cdv-summary__row"><span>Ghi chú:</span><strong>{contract.notes}</strong></div>}
          <hr className="cdv-divider" />
          <div className="cdv-summary__row cdv-summary__row--total"><span>Tổng giá trị:</span><strong>{fmtMoney(contract.totalValue)}</strong></div>
          <div className="cdv-summary__row"><span>Phí dịch vụ PreOnic ({contract.commissionRate}%):</span><strong>{fmtMoney(contract.commission)}</strong></div>
        </div>

        {/* Chữ ký */}
        <div className="cdv-signatures">
          <div className={`cdv-sig ${contract.signedByEnterprise ? 'cdv-sig--signed' : ''}`}>
            <span className="cdv-sig__role">Bên mua (Doanh nghiệp)</span>
            <strong className="cdv-sig__name">{contract.enterprise?.name}</strong>
            <span className="cdv-sig__status">
              {contract.signedByEnterprise
                ? <><FiCheck size={12} /> Đã ký{contract.signedAt ? ` · ${fmtDate(contract.signedAt)}` : ''}</>
                : 'Chưa ký'}
            </span>
          </div>
          <div className={`cdv-sig ${contract.signedByFarmer ? 'cdv-sig--signed' : ''}`}>
            <span className="cdv-sig__role">Bên bán (Nông dân)</span>
            <strong className="cdv-sig__name">{contract.farmer?.name}</strong>
            <span className="cdv-sig__status">
              {contract.signedByFarmer
                ? <><FiCheck size={12} /> Đã ký{contract.signedAt ? ` · ${fmtDate(contract.signedAt)}` : ''}</>
                : 'Chưa ký'}
            </span>
          </div>
        </div>

        {/* Thông báo lý do hủy */}
        {contract.status === 'cancelled' && contract.cancelReason && (
          <div className="cdv-note cdv-note--danger">
            <FiAlertTriangle size={14} /> Lý do hủy: {contract.cancelReason}
          </div>
        )}

        {/* Thông báo đang chờ xác nhận hủy */}
        {contract.status === 'cancel_pending' && (
          <div className="cdv-note cdv-note--warning">
            <FiAlertTriangle size={14} />
            {isCancelRequester
              ? `Bạn đã gửi yêu cầu hủy. Đang chờ ${isFarmer ? 'doanh nghiệp' : 'nông dân'} xác nhận.`
              : `${isFarmer ? 'Doanh nghiệp' : 'Nông dân'} đã gửi yêu cầu hủy hợp đồng.`
            }
            {contract.cancelReason && <div style={{ marginTop: 4 }}>Lý do: <strong>{contract.cancelReason}</strong></div>}
          </div>
        )}

        {/* Doanh nghiệp: chờ nông dân xác nhận trước khi được ký */}
        {waitingOnFarmer && !isTerminal && contract.status !== 'cancel_pending' && (
          <div className="cdv-note cdv-note--info">
            Đang chờ nông dân xác nhận đề xuất. Bạn sẽ có thể ký chính thức sau khi nông dân đồng ý.
          </div>
        )}

        {/* Đã ký rồi — hiện thông báo chờ bên kia */}
        {!isTerminal && contract.status !== 'cancel_pending' && mySigned && (
          <div className="cdv-note cdv-note--success">
            <FiCheck size={14} /> Bạn đã ký xác nhận hợp đồng này
            {contract.signedAt ? ` vào ${fmtDate(contract.signedAt)}` : ''}.
            {(isFarmer ? !contract.signedByEnterprise : !contract.signedByFarmer) &&
              ` Đang chờ ${isFarmer ? 'doanh nghiệp' : 'nông dân'} ký.`}
          </div>
        )}

        {/* ── Khu vực hành động ── */}
        <div className="cdv-actions">

          {/* Ký xác nhận + từ chối ký (farmer chưa ký) */}
          {canSign && !showSignReject && (
            <>
              {isFarmer && (
                <button className="cdv-btn cdv-btn--danger" onClick={() => setShowSignReject(true)} disabled={acting}>
                  <FiX size={14} /> Từ chối
                </button>
              )}
              <button className="cdv-btn cdv-btn--primary" onClick={handleSign} disabled={acting}>
                <FiCheck size={14} /> {acting ? 'Đang xử lý...' : 'Ký xác nhận'}
              </button>
            </>
          )}

          {/* Popup từ chối ký */}
          {canSign && showSignReject && isFarmer && (
            <div className="cdv-reject">
              <label>Lý do từ chối (tùy chọn)</label>
              <textarea
                rows={3}
                value={signRejectReason}
                onChange={(e) => setSignRejectReason(e.target.value)}
                placeholder="VD: Giá chưa phù hợp, thời gian giao hàng không khả thi..."
              />
              <div className="cdv-reject__actions">
                <button className="cdv-btn cdv-btn--outline" onClick={() => setShowSignReject(false)} disabled={acting}>Hủy</button>
                <button className="cdv-btn cdv-btn--danger" onClick={handleSignReject} disabled={acting}>
                  {acting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          )}

          {/* Nút hủy hợp đồng — cả 2 bên đều có */}
          {canCancel && !showSignReject && (
            <button className="cdv-btn cdv-btn--ghost" onClick={() => setShowCancelModal(true)} disabled={acting}>
              <FiX size={14} /> Hủy hợp đồng
            </button>
          )}

          {/* Bên bị yêu cầu hủy: xác nhận hoặc từ chối */}
          {canRespondToCancel && (
            <button className="cdv-btn cdv-btn--warning" onClick={() => setShowConfirmCancel(true)} disabled={acting}>
              <FiAlertTriangle size={14} /> Xem & Phản hồi yêu cầu hủy
            </button>
          )}
        </div>
      </div>

      <EscrowPanel contract={contract} userRole={user?.role} />

      {/* Modal hủy hợp đồng */}
      {showCancelModal && (
        <CancelModal
          acting={acting}
          onConfirm={handleRequestCancel}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* Modal xác nhận hủy (bên bị yêu cầu) */}
      {showConfirmCancel && (
        <ConfirmCancelModal
          contract={contract}
          acting={acting}
          onConfirm={handleConfirmCancel}
          onDecline={handleDeclineCancel}
          onClose={() => setShowConfirmCancel(false)}
        />
      )}
    </div>
  );
}
