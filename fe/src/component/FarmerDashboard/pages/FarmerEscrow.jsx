import React from 'react';
import { FiShield } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { farmerEscrows } from '../data/farmerMockData';
import { formatMoney } from '../utils';

function FarmerEscrow() {
  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Thanh toán trung gian"
          title="Quản lý ký quỹ và giải ngân theo mốc hợp đồng"
          desc="Escrow giúp giảm rủi ro không thanh toán. Frontend hiện mô phỏng dữ liệu để sẵn sàng nối backend sau."
        />

        <div className="farmer-escrow-grid">
          {farmerEscrows.map((item) => {
            const percent = item.amount > 0 ? Math.round((item.released / item.amount) * 100) : 0;
            return (
              <article className="farmer-escrow-card" key={item.id}>
                <div className="farmer-escrow-card__icon"><FiShield /></div>
                <div className="farmer-escrow-card__top">
                  <div>
                    <span>{item.id} • {item.contractId}</span>
                    <h3>{item.buyer}</h3>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p>{item.milestone}</p>
                <div className="farmer-escrow-card__money">
                  <div>
                    <span>Tổng ký quỹ</span>
                    <strong>{formatMoney(item.amount)}</strong>
                  </div>
                  <div>
                    <span>Đã giải ngân</span>
                    <strong>{formatMoney(item.released)}</strong>
                  </div>
                </div>
                <ProgressBar value={percent} />
                <small>Đã giải ngân {percent}%</small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default FarmerEscrow;
