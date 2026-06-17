import React from 'react';
import { FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import { partnerRatings } from '../data/farmerMockData';

function FarmerRatings() {
  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Đánh giá đối tác"
          title="Uy tín doanh nghiệp thu mua"
          desc="Farmer xem lịch sử hợp tác, điểm uy tín và nhận xét để giảm rủi ro trước khi ký hợp đồng."
        />

        <div className="farmer-rating-grid">
          {partnerRatings.map((item) => (
            <article className="farmer-rating-card" key={item.id}>
              <div className="farmer-rating-card__score">
                <FiStar />
                <strong>{item.score}</strong>
              </div>
              <h3>{item.partner}</h3>
              <span>{item.role}</span>
              <p>{item.comment}</p>
              <small>{item.contracts} hợp đồng đã giao dịch</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FarmerRatings;
