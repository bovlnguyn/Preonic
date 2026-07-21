import React, { useEffect, useState } from 'react';
import { FiShield, FiCheck, FiClock, FiAlertTriangle } from 'react-icons/fi';
import escrowService from '../../services/escrow.service';
import { useToast } from '../../contexts/ToastContext';
import { ESCROW_STATUS_LABEL, MILESTONE_STATUS_LABEL, MILESTONE_ROLE_LABEL } from '../../constants/escrow';
import './EscrowPanel.css';

const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

// Nong dan xac nhan step 3 (Giao hang) co the kem thong tin van chuyen
const EVIDENCE_STEPS = [3];

// Mot moc co the xac nhan neu: escrow dang active, dung luot cua vai tro nay,
// chua hoan tat/tranh chap, va moc truoc do (neu co) da hoan tat.
const canConfirmMilestone = (escrow, milestone, index, userRole) => {
  if (!escrow || escrow.status !== 'active') return false;
  if (milestone.status === 'completed' || milestone.status === 'disputed') return false;
  if (milestone.requiredBy !== userRole) return false;
  if (index > 0) {
    const previous = escrow.milestones[index - 1];
    if (!previous || previous.status !== 'completed') return false;
  }
  return true;
};

function MilestoneItem({ escrow, milestone, index, userRole, onConfirm, confirmingStep }) {
  const canConfirm = canConfirmMilestone(escrow, milestone, index, userRole);
  const [evidence, setEvidence] = useState('');
  const isDone = milestone.status === 'completed';

  return (
    <li className={`esc-milestone esc-milestone--${milestone.status}`}>
      <div className="esc-milestone__dot">
        {isDone ? <FiCheck size={14} /> : milestone.status === 'disputed' ? <FiAlertTriangle size={14} /> : milestone.step}
      </div>
      <div className="esc-milestone__body">
        <div className="esc-milestone__top">
          <strong>{milestone.name}</strong>
          <span className={`esc-badge esc-badge--ms-${milestone.status}`}>
            {MILESTONE_STATUS_LABEL[milestone.status] || milestone.status}
          </span>
        </div>
        <p className="esc-milestone__desc">{milestone.description}</p>

        <div className="esc-milestone__meta">
          {milestone.requiredBy && milestone.requiredBy !== 'system' && (
            <span><FiClock size={12} /> Người xác nhận: {MILESTONE_ROLE_LABEL[milestone.requiredBy]}</span>
          )}
          {Number(milestone.releaseAmount) > 0 && (
            <span>Giải ngân: <strong>{fmtMoney(milestone.releaseAmount)}</strong> ({milestone.releasePercentage}%)</span>
          )}
        </div>

        <div className="esc-milestone__confirms">
          <span className={milestone.farmerConfirmed ? 'esc-confirm esc-confirm--done' : 'esc-confirm'}>
            {milestone.farmerConfirmed && <FiCheck size={11} />} Nông dân {milestone.farmerConfirmed ? 'đã xác nhận' : 'chưa xác nhận'}
          </span>
          <span className={milestone.enterpriseConfirmed ? 'esc-confirm esc-confirm--done' : 'esc-confirm'}>
            {milestone.enterpriseConfirmed && <FiCheck size={11} />} Doanh nghiệp {milestone.enterpriseConfirmed ? 'đã xác nhận' : 'chưa xác nhận'}
          </span>
        </div>

        {milestone.evidence && (
          <p className="esc-milestone__evidence">Minh chứng: {milestone.evidence}</p>
        )}

        {canConfirm && (
          <div className="esc-milestone__action">
            {EVIDENCE_STEPS.includes(milestone.step) && (
              <input
                type="text"
                className="esc-input"
                placeholder="Mã vận đơn / thông tin vận chuyển (tuỳ chọn)"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            )}
            <button
              type="button"
              className="esc-btn esc-btn--primary esc-btn--sm"
              onClick={() => onConfirm(milestone.step, evidence)}
              disabled={confirmingStep === milestone.step}
            >
              <FiCheck size={13} />
              {confirmingStep === milestone.step ? 'Đang xử lý...' : 'Xác nhận hoàn thành'}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Panel ky quy + moc thanh toan, gan vao trang chi tiet hop dong.
 * - Enterprise: nap ky quy khi hop dong active va chua co escrow.
 * - Farmer/Enterprise: xac nhan tung moc theo dung vai tro (requiredBy tu BE).
 */
function EscrowPanel({ contract, userRole }) {
  const toast = useToast();
  const [escrow, setEscrow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [confirmingStep, setConfirmingStep] = useState(null);

  const load = () => {
    setLoading(true);
    escrowService.getByContract(contract.id)
      .then((res) => setEscrow(res?.data?.escrow || null))
      .catch(() => setEscrow(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [contract.id]);

  const handleDeposit = async () => {
    setDepositing(true);
    try {
      await escrowService.deposit(contract.id);
      toast.success('Nạp ký quỹ thành công. Hợp đồng bắt đầu theo dõi các mốc thanh toán.');
      load();
    } catch (err) {
      toast.error(err?.message || 'Nạp ký quỹ thất bại, vui lòng thử lại.');
    } finally {
      setDepositing(false);
    }
  };

  const handleConfirm = async (step, evidence) => {
    setConfirmingStep(step);
    try {
      await escrowService.confirmMilestone(contract.id, step, evidence?.trim() || undefined);
      toast.success('Xác nhận mốc thanh toán thành công.');
      load();
    } catch (err) {
      toast.error(err?.message || 'Xác nhận mốc thanh toán thất bại.');
    } finally {
      setConfirmingStep(null);
    }
  };

  // Ky quy chi lien quan khi hop dong da active (ca 2 ben da ky)
  if (contract.status !== 'active' && !escrow) {
    if (loading) return null;
    return null;
  }

  return (
    <div className="esc-panel">
      <div className="esc-panel__header">
        <h3><FiShield size={16} /> Ký quỹ &amp; mốc thanh toán</h3>
        {escrow && (
          <span className={`esc-badge esc-badge--${escrow.status}`}>
            {ESCROW_STATUS_LABEL[escrow.status] || escrow.status}
          </span>
        )}
      </div>

      {loading && (
        <div className="esc-loading"><div className="spinner-border text-success" role="status" /></div>
      )}

      {!loading && !escrow && contract.status === 'active' && (
        <div className="esc-empty">
          <p>Hợp đồng đã có hiệu lực nhưng chưa được nạp ký quỹ.</p>
          {userRole === 'enterprise' ? (
            <button type="button" className="esc-btn esc-btn--primary" onClick={handleDeposit} disabled={depositing}>
              <FiShield size={14} /> {depositing ? 'Đang xử lý...' : `Nạp ký quỹ ${fmtMoney(contract.totalValue)}`}
            </button>
          ) : (
            <p className="esc-empty__hint">Đang chờ doanh nghiệp nạp ký quỹ để bắt đầu theo dõi tiến độ.</p>
          )}
        </div>
      )}

      {!loading && escrow && (
        <>
          <div className="esc-summary">
            <div className="esc-summary__item">
              <span>Tổng ký quỹ</span>
              <strong>{fmtMoney(escrow.totalAmount)}</strong>
            </div>
            <div className="esc-summary__item">
              <span>Đã giải ngân</span>
              <strong>{fmtMoney(escrow.releasedAmount)}</strong>
            </div>
            <div className="esc-summary__item">
              <span>Còn lại trong ký quỹ</span>
              <strong>{fmtMoney(Number(escrow.totalAmount) - Number(escrow.releasedAmount))}</strong>
            </div>
          </div>

          <div className="esc-progress-row">
            <div className="esc-progress">
              <span style={{ width: `${escrow.progress?.percentComplete || 0}%` }} />
            </div>
            <small>
              {escrow.progress?.completedMilestones || 0}/{escrow.progress?.totalMilestones || 5} mốc hoàn tất
              · Đã giải ngân {escrow.progress?.percentReleased || 0}%
            </small>
          </div>

          <ol className="esc-milestones">
            {escrow.milestones.map((m, idx) => (
              <MilestoneItem
                key={m.step}
                escrow={escrow}
                milestone={m}
                index={idx}
                userRole={userRole}
                onConfirm={handleConfirm}
                confirmingStep={confirmingStep}
              />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export default EscrowPanel;
