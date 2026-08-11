import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import farmerService from '../../../services/farmer.service';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { formatDate, formatMoney } from '../utils';

const PRODUCTS_PER_PAGE = 9;

function FarmerCrops() {
  const navigate = useNavigate();
  const [filter,       setFilter]       = useState('Tất cả');
  const [cropProducts, setCropProducts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [currentPage,  setCurrentPage]  = useState(1);

  useEffect(() => {
    farmerService.getMyCrops()
      .then(setCropProducts)
      .catch(() => setCropProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => [
    'Tất cả',
    ...new Set(cropProducts.map(item => item.category)),
  ], [cropProducts]);

  const filtered = filter === 'Tất cả'
    ? cropProducts
    : cropProducts.filter(item => item.category === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = filtered.slice(pageStart, pageStart + PRODUCTS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="farmer-stack">
      <section className="farmer-card fc-crops-shell">
        <SectionHeader
          breadcrumb="Mùa vụ của tôi"
          eyebrow="Mùa vụ của tôi"
          title="Quản lý nông sản đang canh tác và đang bán"
          desc="Trang này hiển thị sản lượng, chuẩn chất lượng, giá chào bán và tiến độ mùa vụ."
          action={
            <button
              className="farmer-button farmer-button--primary"
              type="button"
              onClick={() => navigate('/farmer/create-product')}
            >
              <FiPlus /> Đăng bán mới
            </button>
          }
        />

        {loading ? (
          <div className="farmer-loading">Đang tải...</div>
        ) : (
          <>
            <div className="farmer-filter-row fc-crops-filters">
              {categories.map(category => (
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

            {filtered.length === 0 ? (
              <div className="farmer-empty">
                <p>Bạn chưa có sản phẩm nào. Hãy đăng bán nông sản đầu tiên!</p>
                <button
                  className="farmer-button farmer-button--primary"
                  type="button"
                  onClick={() => navigate('/farmer/create-product')}
                >
                  <FiPlus /> Đăng bán ngay
                </button>
              </div>
            ) : (
              <div className="farmer-product-grid fc-crops-grid">
                {paginatedProducts.map(item => (
                  <article
                    className="farmer-product-card fc-product-card"
                    key={item.id}
                    onClick={() => navigate('/farmer/crops/' + item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="farmer-product-card__top fc-product-card__top">
                      <span>{item.category}</span>
                      <StatusBadge status={item.isActive ? 'active' : 'inactive'} />
                    </div>
                    <h3 className="fc-product-card__title">{item.name}</h3>
                    <p className="fc-product-card__location">
                      {item.location || 'Chưa cập nhật'} •{' '}
                      {item.totalQuantity ? `${item.totalQuantity} ${item.unit}` : 'Chưa cập nhật'}
                    </p>
                    <div className="farmer-product-card__meta fc-product-card__meta">
                      <div>
                        <span>Giá chào bán</span>
                        <strong>
                          {item.priceMin && item.priceMax
                            ? `${formatMoney(item.priceMin)} – ${formatMoney(item.priceMax)}`
                            : item.priceMin
                            ? formatMoney(item.priceMin)
                            : 'Chưa cập nhật'}
                        </strong>
                      </div>
                      <div>
                        <span>Thu hoạch</span>
                        <strong>
                          {item.expectedDate ? formatDate(item.expectedDate) : 'Chưa cập nhật'}
                        </strong>
                      </div>
                    </div>
                    <div className="farmer-product-card__progress fc-product-card__progress">
                      <span>Tiến độ mùa vụ: {item.progress || 0}%</span>
                      <ProgressBar value={item.progress || 0} />
                    </div>
                  </article>
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="farmer-pagination" aria-label="Phân trang sản phẩm">
                <span>
                  Trang {safePage} / {totalPages} — {filtered.length} sản phẩm
                </span>

                <div className="farmer-pagination__buttons">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  >
                    <FiChevronLeft />
                    Trước
                  </button>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  >
                    Sau
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default FarmerCrops;