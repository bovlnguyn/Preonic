import React, { useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import StatusBadge   from '../components/StatusBadge';
import ProgressBar   from '../components/ProgressBar';
import { enterpriseProducts } from '../data/enterpriseMockData';
import { formatMoney } from '../utils';

function EnterpriseProducts() {
  const [filter, setFilter] = useState('Tất cả');
  const categories = useMemo(
    () => ['Tất cả', ...new Set(enterpriseProducts.map((p) => p.category))],
    [],
  );
  const filtered = filter === 'Tất cả'
    ? enterpriseProducts
    : enterpriseProducts.filter((p) => p.category === filter);

  return (
    <div className="ent-stack">
      <section className="ent-card">
        <SectionHeader
          eyebrow="Danh sách sản phẩm"
          title="Tìm nguồn cung nông sản cho hợp đồng"
          desc="Xem sản lượng, giá chào và tiến độ mùa vụ để đặt hợp đồng kịp thời."
          action={
            <button className="ent-button ent-button--primary" type="button">
              <FiPlus /> Tạo hợp đồng
            </button>
          }
        />

        <div className="ent-filter-row">
          {categories.map((c) => (
            <button key={c} type="button"
              className={filter === c ? 'active' : ''}
              onClick={() => setFilter(c)}
            >{c}</button>
          ))}
        </div>

        <div className="ent-product-grid">
          {filtered.map((item) => (
            <article className="ent-product-card" key={item.id}>
              <div className="ent-product-card__top">
                <span>{item.category}</span>
                <span className="ent-badge-tag">{item.badge}</span>
              </div>
              <h3>{item.name}</h3>
              <p>{item.location} • {item.quantity} • {item.region}</p>
              <div className="ent-product-card__meta">
                <div>
                  <span>Giá / tấn</span>
                  <strong>{formatMoney(item.pricePerTon)}</strong>
                </div>
                <div>
                  <span>Nông dân</span>
                  <strong>{item.farmer}</strong>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ent-muted)', fontWeight: 800 }}>
                  Tiến độ mùa vụ: {item.progress}%
                </span>
                <ProgressBar value={item.progress} />
              </div>
              <button className="ent-button ent-button--primary" type="button" style={{ width: '100%' }}>
                <FiPlus /> Tạo hợp đồng
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default EnterpriseProducts;