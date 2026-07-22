import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import ProgressBar   from '../components/ProgressBar';
import EmptyState    from '../components/EmptyState';
import escrowService from '../../../services/escrow.service';
import { ESCROW_STATUS_LABEL } from '../../../constants/escrow';
import { formatMoney } from '../utils';

// Mốc tiếp theo chưa hoàn tất — hiển thị "đang chờ ở bước nào" trên thẻ tóm tắt.
const currentMilestoneLabel = (escrow) => {
  const next = (escrow.milestones || []).find((m) => m.status !== 'completed');
  return next ? next.name : 'Đã hoàn tất tất cả các mốc';
};

function EnterpriseEscrow() {
  const navigate = useNavigate();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    escrowService.list()
      .then((res) => setEscrows(res?.data?.escrows || []))
      .catch(() => setEscrows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Thanh toán trung gian"
          title="Quản lý ký quỹ và giải ngân theo mốc hợp đồng"
          desc="Escrow đảm bảo nông dân nhận tiền đúng mốc và doanh nghiệp nhận hàng đúng chất lượng."
        />

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : escrows.length === 0 ? (
          <EmptyState
            title="Chưa có ký quỹ nào"
            desc="Nạp ký quỹ từ trang chi tiết hợp đồng sau khi hợp đồng được ký đầy đủ hai bên."
          />
        ) : (
          <div className="ent-escrow-grid">
            {escrows.map((e) => (
              <article
                className="ent-escrow-card"
                key={e.id}
                onClick={() => navigate(`/enterprise/contracts/${e.contractId}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="ent-escrow-card__icon"><FiShield /></div>
                <div className="ent-escrow-card__top">
                  <div>
                    <span>{e.contractCode}</span>
                    <h3>{e.partnerName}</h3>
                  </div>
                  <span className={`ent-badge ent-badge--${e.status === 'completed' ? 'success' : e.status === 'active' ? 'info' : 'neutral'}`}>
                    {ESCROW_STATUS_LABEL[e.status] || e.status}
                  </span>
                </div>
                <p>{e.productName} — {currentMilestoneLabel(e)}</p>
                <div className="ent-escrow-card__money">
                  <div>
                    <span>Tổng ký quỹ</span>
                    <strong>{formatMoney(e.totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Đã giải ngân</span>
                    <strong>{formatMoney(e.releasedAmount)}</strong>
                  </div>
                </div>
                <ProgressBar value={e.progress?.percentReleased || 0} />
                <small>Đã giải ngân {e.progress?.percentReleased || 0}% · {e.progress?.completedMilestones || 0}/{e.progress?.totalMilestones || 5} mốc</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default EnterpriseEscrow;