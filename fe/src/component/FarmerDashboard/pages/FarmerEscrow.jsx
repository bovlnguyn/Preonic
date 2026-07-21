import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import escrowService from '../../../services/escrow.service';
import { ESCROW_STATUS_LABEL } from '../../../constants/escrow';
import { formatMoney } from '../utils';

// Mốc tiếp theo chưa hoàn tất — hiển thị "đang chờ ở bước nào" trên thẻ tóm tắt.
const currentMilestoneLabel = (escrow) => {
  const next = (escrow.milestones || []).find((m) => m.status !== 'completed');
  return next ? next.name : 'Đã hoàn tất tất cả các mốc';
};

function FarmerEscrow() {
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
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Thanh toán trung gian"
          title="Quản lý ký quỹ và giải ngân theo mốc hợp đồng"
          desc="Escrow giúp giảm rủi ro không thanh toán — tiền được doanh nghiệp ký quỹ trước và giải ngân dần theo tiến độ."
        />

        {loading ? (
          <div className="spinner-border text-success" role="status" />
        ) : escrows.length === 0 ? (
          <EmptyState
            title="Chưa có ký quỹ nào"
            desc="Ký quỹ sẽ xuất hiện tại đây sau khi doanh nghiệp nạp tiền cho hợp đồng đã ký."
          />
        ) : (
          <div className="farmer-escrow-grid">
            {escrows.map((item) => (
              <article
                className="farmer-escrow-card"
                key={item.id}
                onClick={() => navigate(`/farmer/contracts/${item.contractId}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="farmer-escrow-card__icon"><FiShield /></div>
                <div className="farmer-escrow-card__top">
                  <div>
                    <span>{item.contractCode}</span>
                    <h3>{item.partnerName}</h3>
                  </div>
                  <span className={`farmer-badge farmer-badge--${item.status === 'completed' ? 'success' : item.status === 'active' ? 'info' : 'neutral'}`}>
                    {ESCROW_STATUS_LABEL[item.status] || item.status}
                  </span>
                </div>
                <p>{item.productName} — {currentMilestoneLabel(item)}</p>
                <div className="farmer-escrow-card__money">
                  <div>
                    <span>Tổng ký quỹ</span>
                    <strong>{formatMoney(item.totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Đã giải ngân</span>
                    <strong>{formatMoney(item.releasedAmount)}</strong>
                  </div>
                </div>
                <ProgressBar value={item.progress?.percentReleased || 0} />
                <small>Đã giải ngân {item.progress?.percentReleased || 0}% · {item.progress?.completedMilestones || 0}/{item.progress?.totalMilestones || 5} mốc</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default FarmerEscrow;
