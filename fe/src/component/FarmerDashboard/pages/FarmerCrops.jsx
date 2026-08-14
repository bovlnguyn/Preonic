import React, { useEffect, useState } from 'react';
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
  const [categories, setCategories] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    let alive = true;
    setLoading(true);

    farmerService.getMyCropsPage({
      page: currentPage,
      limit: PRODUCTS_PER_PAGE,
      includeSummary: true,
      ...(filter !== 'Tất cả' ? { category: filter } : {}),
    })
      .then((result) => {
        if (!alive) return;
        setCropProducts(result.products);
        setCategories(result.categories || []);
        setPagination({
          total: Number(result.pagination?.total || 0),
          totalPages: Number(result.pagination?.totalPages || 0),
        });
      })
      .catch(() => {
        if (!alive) return;
        setCropProducts([]);
        setPagination({ total: 0, totalPages: 0 });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [currentPage, filter]);

  const filterOptions = ['Tất cả', ...categories];
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
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
              {filterOptions.map(category => (
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

            {cropProducts.length === 0 ? (
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
                {cropProducts.map(item => (
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

            {cropProducts.length > 0 && (
              <div className="farmer-pagination" aria-label="Phân trang sản phẩm">
                <span>
                  Trang {safePage} / {totalPages} — {pagination.total} sản phẩm
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