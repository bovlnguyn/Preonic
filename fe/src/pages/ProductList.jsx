import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiMapPin, FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaSeedling } from 'react-icons/fa';
import Header from '../component/Common/Header';
import productService from '../services/product.service';
import { CATEGORY_LABEL, REGION_LABEL, TYPE_LABEL, CATEGORY_OPTIONS, REGION_OPTIONS, TYPE_OPTIONS } from '../constants/product';
import './Home.css';
import '../component/HomeSections/HomeProductsPreview/HomeProductsPreview.css';
import './ProductList.css';

const IMAGE_BASE_URL = 'http://localhost:8080';
const SEARCH_DEBOUNCE_MS = 350;

const formatMoney = (value) => (value ? Number(value).toLocaleString('vi-VN') + ' ₫' : '');

const getCardImage = (product) => {
  if (product.image) return IMAGE_BASE_URL + product.image;
  try {
    const images = product.images ? JSON.parse(product.images) : [];
    if (images.length > 0) return IMAGE_BASE_URL + images[0];
  } catch {
    // ignore malformed images JSON
  }
  return null;
};

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const region = searchParams.get('region') || '';
  const type = searchParams.get('type') || '';
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;

  const [searchInput, setSearchInput] = useState(search);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const updateParams = (next) => {
    const merged = { category, region, type, search, page: String(page), ...next };
    const params = {};
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params[key] = String(value);
    });
    setSearchParams(params);
  };

  // Debounce việc gõ tìm kiếm trước khi đẩy vào query params
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput, page: '1' });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError('');
    productService
      .getProducts({ category, region, type, search, page, limit: 12 })
      .then((res) => {
        setProducts(res?.data || []);
        setPagination(res?.pagination || { page: 1, total: 0, totalPages: 1 });
      })
      .catch(() => setError('Không thể tải danh sách sản phẩm.'))
      .finally(() => setLoading(false));
  }, [category, region, type, search, page]);

  const hasActiveFilters = useMemo(
    () => Boolean(category || region || type || search),
    [category, region, type, search]
  );

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  return (
    <div className="preonic-home">
      <Header />

      <main className="product-list-page">
        <div className="home-container">
          <div className="home-section__heading" style={{ marginTop: 40 }}>
            <span className="home-section__eyebrow">
              <FaSeedling /> Sản phẩm nông sản
            </span>
            <h1 className="home-title">Khám phá nông sản từ khắp Việt Nam</h1>
            <p className="home-desc">
              Tìm kiếm và lọc theo danh mục, vùng miền, loại sản phẩm để tìm nguồn cung phù hợp.
            </p>
          </div>

          <div className="product-filters">
            <div className="product-filters__search">
              <FiSearch />
              <input
                type="text"
                placeholder="Tìm theo tên sản phẩm..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <select
              value={category}
              onChange={(e) => updateParams({ category: e.target.value, page: '1' })}
            >
              <option value="">Tất cả danh mục</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={region}
              onChange={(e) => updateParams({ region: e.target.value, page: '1' })}
            >
              <option value="">Tất cả vùng miền</option>
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={(e) => updateParams({ type: e.target.value, page: '1' })}
            >
              <option value="">Tất cả loại</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button type="button" className="product-filters__clear" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>

          {loading ? (
            <div className="product-list-status">
              <div className="spinner-border text-success" role="status" />
            </div>
          ) : error ? (
            <div className="product-list-status">{error}</div>
          ) : products.length === 0 ? (
            <div className="product-list-status">Không tìm thấy sản phẩm phù hợp.</div>
          ) : (
            <>
              <p className="product-list-count">{pagination.total} sản phẩm được tìm thấy</p>

              <div className="product-list-grid">
                {products.map((product) => (
                  <Link
                    to={`/products/${product.id}`}
                    className="home-product-card product-list-card"
                    key={product.id}
                  >
                    <div className="home-product-card__image">
                      {getCardImage(product) ? (
                        <img src={getCardImage(product)} alt={product.name} />
                      ) : (
                        <div className="product-list-card__no-image">Chưa có ảnh</div>
                      )}
                    </div>

                    <div className="home-product-card__body">
                      <span><FaSeedling /> {CATEGORY_LABEL[product.category] || product.category}</span>
                      <h3>{product.name}</h3>

                      <div className="product-list-card__tags">
                        <span className="product-list-card__tag">{REGION_LABEL[product.region] || product.region}</span>
                        <span className="product-list-card__tag">{TYPE_LABEL[product.type] || product.type}</span>
                      </div>

                      <div className="product-list-card__meta">
                        <span>
                          <FiMapPin /> {product.location || 'Chưa cập nhật'}
                        </span>
                        {product.rating > 0 && (
                          <span><FiStar /> {product.rating}</span>
                        )}
                      </div>

                      <p className="product-list-card__price">
                        {product.priceMin && product.priceMax
                          ? `${formatMoney(product.priceMin)} – ${formatMoney(product.priceMax)} / ${product.unit}`
                          : product.priceMin
                          ? `${formatMoney(product.priceMin)} / ${product.unit}`
                          : 'Liên hệ để biết giá'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="product-list-pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: String(page - 1) })}
                  >
                    <FiChevronLeft />
                  </button>

                  <span>Trang {page} / {pagination.totalPages}</span>

                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => updateParams({ page: String(page + 1) })}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
