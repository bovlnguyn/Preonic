import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import contractService from '../../services/contract.service';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CONTRACT_STATUS_LABEL, PAYMENT_TERMS_LABEL } from '../../constants/contract';
import ContractFlow from '../ContractFlow/ContractFlow';
import './ContractDetailView.css';

const FLOW_STEPS = [
  { key: 'proposed',         label: 'Đề xuất' },
  { key: 'enterprise_sign',  label: 'Doanh nghiệp ký' },
  { key: 'farmer_sign',      label: 'Nông dân xác nhận' },
  { key: 'done',             label: 'Hoàn tất' },
];

const TERMINAL_STATUSES = ['cancelled', 'disputed'];

// Xac dinh buoc hien tai trong tien trinh dua tren trang thai + co ky that cua hop dong
const resolveFlowProgress = (contract) => {
  const cancelled = TERMINAL_STATUSES.includes(contract.status);

  if (contract.status === 'active' || contract.status === 'completed') {
    return { currentIndex: FLOW_STEPS.length, cancelled: false };
  }
  if (cancelled) {
    const reachedIndex = contract.signedByEnterprise ? 2 : 1;
    return { currentIndex: reachedIndex, cancelled: true };
  }
  if (contract.signedByEnterprise && contract.signedByFarmer) {
    return { currentIndex: FLOW_STEPS.length, cancelled: false };
  }
  // Chi can mot ben da ky (bat ke thu tu) la da qua buoc "cho ky", den luot ben con lai
  if (contract.signedByEnterprise || contract.signedByFarmer) {
    return { currentIndex: 2, cancelled: false };
  }
  return { currentIndex: 1, cancelled: false };
};

// Nhan trang thai chinh xac theo tung ben da ky hay chua, thay vi mot chuoi
// co dinh cho status 'pending'/'draft' (truoc day luon ghi "Cho nong dan xac nhan"
// ke ca khi nong dan da ky va dang cho doanh nghiep).
const resolveStatusLabel = (contract) => {
  if (contract.status === 'pending' || contract.status === 'draft') {
    if (contract.signedByFarmer && !contract.signedByEnterprise) return 'Chờ doanh nghiệp ký';
    if (!contract.signedByFarmer && contract.signedByEnterprise) return 'Chờ nông dân xác nhận';
    if (!contract.signedByFarmer && !contract.signedByEnterprise) return 'Chờ ký xác nhận';
  }
  return CONTRACT_STATUS_LABEL[contract.status] || contract.status;
};

const formatMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const formatDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : 'Chưa cập nhật');

function ContractDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const backPath = user?.role === 'farmer' ? '/farmer/contracts' : '/enterprise/contracts';

  const load = () => {
    setLoading(true);
    contractService.getById(id)
      .then(res => setContract(res?.data?.contract || null))
      .catch(err => setError(err?.message || 'Không thể tải thông tin hợp đồng.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

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

  const handleReject = async () => {
    setActing(true);
    try {
      await contractService.reject(id, reason);
      toast.success('Đã từ chối hợp đồng');
      setShowReject(false);
      load();
    } catch (err) {
      toast.error(err?.message || 'Từ chối hợp đồng thất bại, vui lòng thử lại.');
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

  const isFarmer = user?.role === 'farmer';
  const mySigned = isFarmer ? contract.signedByFarmer : contract.signedByEnterprise;
  // Ca hai ben deu co the tu ky xac nhan neu chua ky (vi du auto-sign luc tao
  // hop dong bi loi), nhung chi nong dan moi duoc phep tu choi hop dong.
  const canDecide = !mySigned &&
    !['cancelled', 'completed', 'disputed'].includes(contract.status);

  const { currentIndex, cancelled } = resolveFlowProgress(contract);

  return (
    <div className="cdv-page">
      <div className="cdv-top">
        <button className="cdv-back" onClick={() => navigate(backPath)}>
          <FiArrowLeft size={14} /> Quay lại
        </button>
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

        <div className="cdv-summary">
          <div className="cdv-summary__row"><span>Doanh nghiệp:</span><strong>{contract.enterprise?.name}</strong></div>
          <div className="cdv-summary__row"><span>Nông dân:</span><strong>{contract.farmer?.name}</strong></div>
          <div className="cdv-summary__row"><span>Sản phẩm:</span><strong>{contract.product?.name}</strong></div>
          <div className="cdv-summary__row"><span>Số lượng:</span><strong>{contract.quantity} {contract.unit}</strong></div>
          <div className="cdv-summary__row"><span>Đơn giá:</span><strong>{formatMoney(contract.pricePerUnit)}/{contract.unit}</strong></div>
          <div className="cdv-summary__row"><span>Ngày giao hàng:</span><strong>{formatDate(contract.deliveryDate)}</strong></div>
          <div className="cdv-summary__row"><span>Đặt cọc:</span><strong>{PAYMENT_TERMS_LABEL[contract.paymentTerms] || contract.paymentTerms}</strong></div>
          {contract.farmLocation && (
            <div className="cdv-summary__row"><span>Khu vực giao hàng:</span><strong>{contract.farmLocation}</strong></div>
          )}
          {contract.notes && (
            <div className="cdv-summary__row"><span>Ghi chú:</span><strong>{contract.notes}</strong></div>
          )}

          <hr className="cdv-divider" />
          <div className="cdv-summary__row cdv-summary__row--total"><span>Tổng giá trị:</span><strong>{formatMoney(contract.totalValue)}</strong></div>
          <div className="cdv-summary__row"><span>Phí dịch vụ PreOnic ({contract.commissionRate}%):</span><strong>{formatMoney(contract.commission)}</strong></div>
        </div>

        <div className="cdv-signatures">
          <div className={`cdv-sig ${contract.signedByEnterprise ? 'cdv-sig--signed' : ''}`}>
            <span className="cdv-sig__role">Bên mua (Doanh nghiệp)</span>
            <strong className="cdv-sig__name">{contract.enterprise?.name}</strong>
            <span className="cdv-sig__status">
              {contract.signedByEnterprise
                ? <><FiCheck size={12} /> Đã ký{contract.signedAt ? ` · ${formatDate(contract.signedAt)}` : ''}</>
                : 'Chưa ký'}
            </span>
          </div>
          <div className={`cdv-sig ${contract.signedByFarmer ? 'cdv-sig--signed' : ''}`}>
            <span className="cdv-sig__role">Bên bán (Nông dân)</span>
            <strong className="cdv-sig__name">{contract.farmer?.name}</strong>
            <span className="cdv-sig__status">
              {contract.signedByFarmer
                ? <><FiCheck size={12} /> Đã ký{contract.signedAt ? ` · ${formatDate(contract.signedAt)}` : ''}</>
                : 'Chưa ký'}
            </span>
          </div>
        </div>

        {contract.status === 'cancelled' && contract.cancelReason && (
          <div className="cdv-note cdv-note--danger">
            <FiAlertTriangle size={14} /> Lý do từ chối: {contract.cancelReason}
          </div>
        )}

        {canDecide && (
          <div className="cdv-actions">
            {!showReject ? (
              <>
                {isFarmer && (
                  <button className="cdv-btn cdv-btn--danger" disabled={acting} onClick={() => setShowReject(true)}>
                    <FiX size={14} /> Từ chối
                  </button>
                )}
                <button className="cdv-btn cdv-btn--primary" disabled={acting} onClick={handleSign}>
                  <FiCheck size={14} /> {acting ? 'Đang xử lý...' : 'Ký xác nhận'}
                </button>
              </>
            ) : (
              <div className="cdv-reject">
                <label>Lý do từ chối (tùy chọn)</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="VD: Giá chưa phù hợp, thời gian giao hàng không khả thi..."
                />
                <div className="cdv-reject__actions">
                  <button className="cdv-btn cdv-btn--outline" disabled={acting} onClick={() => setShowReject(false)}>
                    Hủy
                  </button>
                  <button className="cdv-btn cdv-btn--danger" disabled={acting} onClick={handleReject}>
                    {acting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!TERMINAL_STATUSES.includes(contract.status) && contract.status !== 'cancelled' && mySigned && (
          <div className="cdv-note cdv-note--success">
            <FiCheck size={14} /> Bạn đã ký xác nhận hợp đồng này{contract.signedAt ? ` vào ${formatDate(contract.signedAt)}` : ''}.
            {(isFarmer ? !contract.signedByEnterprise : !contract.signedByFarmer) &&
              ` Đang chờ ${isFarmer ? 'doanh nghiệp' : 'nông dân'} ký.`}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractDetailView;
