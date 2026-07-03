import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import productService from '../../../services/product.service';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { formatDate, formatMoney, getStoredProducts } from '../utils';



function FarmerCrops() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Tất cả');
  const [cropProducts, setCropProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getMyProducts()
      .then((data) => setCropProducts(data.products || data))
      .catch(() => setCropProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => [...getStoredProducts(), ...cropProducts], [cropProducts]);
  const categories = useMemo(() => ['Tất cả', ...new Set(products.map((item) => item.category))], [products]);
  const filtered = filter === 'Tất cả' ? products : products.filter((item) => item.category === filter);

  return (
    <div className="farmer-stack">
      <section className="farmer-card">
        <SectionHeader
          eyebrow="Mùa vụ của tôi"
          title="Quản lý nông sản đang canh tác và đang bán"
          desc="Trang này hiển thị sản lượng, chuẩn chất lượng, giá chào bán và tiến độ mùa vụ."
          action={
            <button className="farmer-button farmer-button--primary" type="button" onClick={() => navigate('/farmer/create-product')}>
              <FiPlus /> Đăng bán mới
            </button>
          }
        />

        <div className="farmer-filter-row">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={filter === category ? 'active' : ''}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="farmer-product-grid">
          {filtered.map((item) => (
            <article className="farmer-product-card" key={item.id}>
              <div className="farmer-product-card__top">
                <span>{item.category}</span>
                <StatusBadge status={item.status} />
              </div>
              <h3>{item.name}</h3>
              <p>{item.location} • {item.quantity} • {item.standard}</p>
              <div className="farmer-product-card__meta">
                <div>
                  <span>Giá chào bán</span>
                  <strong>{formatMoney(item.price)}</strong>
                </div>
                <div>
                  <span>Thu hoạch</span>
                  <strong>{formatDate(item.harvestDate)}</strong>
                </div>
              </div>
              <div className="farmer-product-card__progress">
                <span>Tiến độ mùa vụ: {item.progress}%</span>
                <ProgressBar value={item.progress} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FarmerCrops;
