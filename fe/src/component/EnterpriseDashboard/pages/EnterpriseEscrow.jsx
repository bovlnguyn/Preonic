import React from 'react';
import { FiShield } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import ProgressBar   from '../components/ProgressBar';
import { enterpriseEscrows } from '../data/enterpriseMockData';
import { formatMoney } from '../utils';

function EnterpriseEscrow() {
  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Thanh toán trung gian"
          title="Quản lý ký quỹ và giải ngân theo mốc hợp đồng"
          desc="Escrow đảm bảo nông dân nhận tiền đúng mốc và doanh nghiệp nhận hàng đúng chất lượng. Kết nối payment gateway sau."
        />

        <div className="ent-escrow-grid">
          {enterpriseEscrows.map((e) => {
            const pct = e.amount > 0 ? Math.round((e.released / e.amount) * 100) : 0;
            return (
              <article className="ent-escrow-card" key={e.id}>
                <div className="ent-escrow-card__icon"><FiShield /></div>
                <div className="ent-escrow-card__top">
                  <div>
                    <span>{e.id} • {e.contractId}</span>
                    <h3>{e.farmer}</h3>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <p>{e.product} — {e.milestone}</p>
                <div className="ent-escrow-card__money">
                  <div>
                    <span>Tổng ký quỹ</span>
                    <strong>{formatMoney(e.amount)}</strong>
                  </div>
                  <div>
                    <span>Đã giải ngân</span>
                    <strong>{formatMoney(e.released)}</strong>
                  </div>
                </div>
                <ProgressBar value={pct} />
                <small>Đã giải ngân {pct}%</small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default EnterpriseEscrow;