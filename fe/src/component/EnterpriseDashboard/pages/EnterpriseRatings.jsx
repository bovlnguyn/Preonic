import React from 'react';
import { FiStar } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import { useState, useEffect } from 'react';

function EnterpriseRatings() {
  const [enterpriseRatings, setEnterpriseRatings] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Khi có API: ratingService.list().then(...)
  setLoading(false);
}, []);
  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Đánh giá đối tác"
          title="Uy tín nông dân cung ứng"
          desc="Xem điểm đánh giá và nhận xét từ các giao dịch thực tế để quyết định mở rộng hoặc gia hạn hợp đồng."
        />

        <div className="ent-rating-grid">
          {enterpriseRatings.map((r) => (
            <article className="ent-rating-card" key={r.id}>
              <div className="ent-rating-card__score">
                <FiStar /><strong>{r.score}</strong>
              </div>
              <h3>{r.partner}</h3>
              <span>{r.role}</span>
              <p>{r.comment}</p>
              <small>{r.contracts} hợp đồng đã giao dịch</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default EnterpriseRatings;