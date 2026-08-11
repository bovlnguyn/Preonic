import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiChevronLeft, FiChevronRight, FiStar, FiMapPin } from 'react-icons/fi';
import SectionHeader from '../components/SectionHeader';
import productService from '../../../services/product.service';
import { CATEGORY_LABEL, REGION_LABEL, CATEGORY_OPTIONS, REGION_OPTIONS, TYPE_OPTIONS } from '../../../constants/product';
import { formatMoney } from '../utils';

const SORT_OPTIONS = [
  { value: 'default',    label: 'Mới nhất' },
  { value: 'price_asc',  label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating',     label: 'Đánh giá cao nhất' },
  { value: 'name',       label: 'Tên A-Z' },
];

const SEARCH_DEBOUNCE_MS = 350;

function EnterpriseProducts() {
  const navigate = useNavigate();

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [region,   setRegion]   = useState('');
  const [type,     setType]     = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort,     setSort]     = useState('default');
  const [page,     setPage]     = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [products,    setProducts]    = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError('');
    productService
      .getProducts({
        category, region, type, search, sort, page, limit: 9,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
      })
      .then((res) => {
        setProducts(res?.data || []);
        setPagination(res?.pagination || { page: 1, total: 0, totalPages: 1 });
      })
      .catch(() => setError('Không thể tải danh sách sản phẩm.'))
      .finally(() => setLoading(false));
  }, [category, region, type, search, sort, page, minPrice, maxPrice]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="ent-stack">
      <section className="ent-card ent-page-shell">
        <SectionHeader
          breadcrumb="Danh sách sản phẩm"
          eyebrow="Nguồn cung"
          title="Tìm nguồn cung nông sản cho hợp đồng"
          desc="Lọc theo giá, vùng miền, loại nông sản và sắp xếp để tìm nguồn cung phù hợp nhu cầu."
        />

        <div className="ent-product-filters">
          <div className="ent-product-filters__search">
            <FiSearch />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <select value={category} onChange={handleFilterChange(setCategory)}>
            <option value="">Tất cả danh mục</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select value={region} onChange={handleFilterChange(setRegion)}>
            <option value="">Tất cả vùng miền</option>
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select value={type} onChange={handleFilterChange(setType)}>
            <option value="">Tất cả loại</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="number" min="0"
            className="ent-product-filters__price"
            placeholder="Giá từ"
            value={minPrice}
            onChange={handleFilterChange(setMinPrice)}
          />
          <input
            type="number" min="0"
            className="ent-product-filters__price"
            placeholder="Giá đến"
            value={maxPrice}
            onChange={handleFilterChange(setMaxPrice)}
          />

          <select value={sort} onChange={handleFilterChange(setSort)}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="ent-empty">Đang tải...</div>
        ) : error ? (
          <div className="ent-empty">{error}</div>
        ) : products.length === 0 ? (
          <div className="ent-empty">Không tìm thấy sản phẩm phù hợp.</div>
        ) : (
          <>
            <p className="ent-product-count">{pagination.total} sản phẩm được tìm thấy</p>

            <div className="ent-product-grid">
              {products.map((item) => (
                <article
                  className="ent-product-card"
                  key={item.id}
                  onClick={() => navigate(`/enterprise/products/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ent-product-card__top">
                    <span>{CATEGORY_LABEL[item.category] || item.category}</span>
                    {item.badge && <span className="ent-badge-tag">{item.badge}</span>}
                  </div>
                  <h3>{item.name}</h3>
                  <p>
                    <FiMapPin size={13} /> {item.location || 'Chưa cập nhật'} • {REGION_LABEL[item.region] || item.region}
                  </p>
                  <div className="ent-product-card__meta">
                    <div>
                      <span>Giá chào bán</span>
                      <strong>
                        {item.priceMin && item.priceMax
                          ? `${formatMoney(item.priceMin)} – ${formatMoney(item.priceMax)}`
                          : item.priceMin
                          ? formatMoney(item.priceMin)
                          : 'Liên hệ'}
                        {(item.priceUnit || item.unit) ? ` / ${item.priceUnit || item.unit}` : ''}
                      </strong>
                    </div>
                    <div>
                      <span>Nông dân</span>
                      <strong>{item.sellerName || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>
                  <div className="ent-product-card__footer">
                    <span>
                      {item.totalQuantity ? `${Number(item.totalQuantity).toLocaleString('vi-VN')} ${item.unit}` : 'Chưa cập nhật số lượng'}
                    </span>
                    {item.rating > 0 && (
                      <span className="ent-product-card__rating"><FiStar /> {item.rating}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {pagination.total > 0 && (
              <div className="et-pagination">
                <span>
                  Trang {pagination.page || page} / {pagination.totalPages || 1} — {Number(pagination.total || 0).toLocaleString('vi-VN')} sản phẩm
                </span>
                <div className="et-pagination-btns">
                  <button
                    type="button"
                    disabled={(pagination.page || page) <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <FiChevronLeft size={14} /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={(pagination.page || page) >= (pagination.totalPages || 1)}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
                  >
                    Sau <FiChevronRight size={14} />
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

export default EnterpriseProducts;
