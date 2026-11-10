import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowUpRight, FiChevronLeft, FiChevronRight, FiMapPin, FiPackage, FiSearch, FiSliders, FiStar, FiUser, FiX } from 'react-icons/fi';
import { FaSeedling } from 'react-icons/fa';
import Header from '../component/Common/Header';
import Footer from '../component/Common/Footer';
import AgricultureIcon from '../component/Common/AgricultureIcon';
import productService, { resolveImageUrl } from '../services/product.service';
import { CATEGORY_LABEL, REGION_LABEL, TYPE_LABEL, CATEGORY_OPTIONS, REGION_OPTIONS, TYPE_OPTIONS } from '../constants/product';
import './Home.css';
import './ProductList.css';

const SEARCH_DEBOUNCE_MS = 350;
const CATEGORY_META = {
  rice: { short: 'Lúa gạo' }, vegetable: { short: 'Rau củ' },
  fruit: { short: 'Trái cây' }, coffee: { short: 'Cà phê' },
  spice: { short: 'Gia vị' }, tea: { short: 'Trà' },
  grain: { short: 'Ngũ cốc' }, other: { short: 'Khác' },
};
const SORT_OPTIONS = [
  { value: 'default', label: 'Mới cập nhật' }, { value: 'rating', label: 'Đánh giá tốt' },
  { value: 'price_asc', label: 'Giá thấp trước' }, { value: 'price_desc', label: 'Giá cao trước' },
  { value: 'name', label: 'Tên A – Z' },
];

const formatMoney = (value) => value !== null && value !== undefined && value !== ''
  ? `${Number(value).toLocaleString('vi-VN')} ₫` : '';

const getCardImage = (product) => {
  if (product.image) return resolveImageUrl(product.image);
  try {
    const images = product.images ? JSON.parse(product.images) : [];
    if (images.length > 0) return resolveImageUrl(images[0]);
  } catch { /* Bỏ qua JSON ảnh cũ không hợp lệ. */ }
  return null;
};

const getPriceText = (product) => {
  const unit = product.priceUnit || product.unit;
  if (product.priceMin && product.priceMax) return `${formatMoney(product.priceMin)} – ${formatMoney(product.priceMax)}${unit ? ` / ${unit}` : ''}`;
  if (product.priceMin) return `${formatMoney(product.priceMin)}${unit ? ` / ${unit}` : ''}`;
  return 'Liên hệ để biết giá';
};

const getSupplyText = (product) => {
  if (product.remaining === null || product.remaining === undefined) return 'Nguồn cung đang mở';
  return `Còn ${Number(product.remaining).toLocaleString('vi-VN')} ${product.unit || ''}`.trim();
};

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const region = searchParams.get('region') || '';
  const type = searchParams.get('type') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'default';
  const page = Number(searchParams.get('page')) || 1;

  const [searchInput, setSearchInput] = useState(search);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const updateParams = (next) => {
    const merged = { category, region, type, search, sort, page: String(page), ...next };
    const params = {};
    Object.entries(merged).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'default')) params[key] = String(value);
    });
    setSearchParams(params);
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) updateParams({ search: searchInput, page: '1' });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError('');
    productService.getProducts({ category, region, type, search, sort, page, limit: 12 })
      .then((res) => {
        setProducts(res?.data || []);
        setPagination(res?.pagination || { page: 1, total: 0, totalPages: 1 });
      })
      .catch(() => setError('Không thể tải nguồn cung lúc này. Vui lòng thử lại sau.'))
      .finally(() => setLoading(false));
  }, [category, region, type, search, sort, page]);

  const activeFilterCount = useMemo(() => [category, region, type, search].filter(Boolean).length, [category, region, type, search]);
  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(sort !== 'default' ? { sort } : {});
  };

  return (
    <div className="preonic-home product-catalog">
      <Header />
      <main className="product-list-page">
        <section className="product-catalog-hero" aria-labelledby="product-catalog-title">
          <div className="product-catalog-hero__grain" aria-hidden="true" />
          <div className="home-container product-catalog-hero__inner">
            <div className="product-catalog-hero__copy">
              <span className="product-catalog-kicker"><FaSeedling /> Chợ nguồn cung Farmora</span>
              <h1 id="product-catalog-title">Nông sản thật,<span> vùng trồng rõ ràng.</span></h1>
              <p>Khám phá nguồn cung trực tiếp từ nông hộ Việt Nam, theo dõi mùa vụ và kết nối giao dịch minh bạch trên cùng một nền tảng.</p>
              <div className="product-catalog-hero__facts" aria-label="Tổng quan nguồn cung">
                <div><strong>{loading ? '—' : pagination.total}</strong><span>Nguồn cung</span></div>
                <div><strong>3</strong><span>Vùng miền</span></div>
                <div><strong>8</strong><span>Nhóm nông sản</span></div>
              </div>
            </div>
            <div className="product-catalog-radar" aria-label="Kết nối nguồn cung ba miền">
              <div className="product-catalog-radar__ring product-catalog-radar__ring--one" />
              <div className="product-catalog-radar__ring product-catalog-radar__ring--two" />
              <div className="product-catalog-radar__center"><span><FaSeedling /></span><strong>Farmora</strong><small>Kết nối mùa vụ</small></div>
              <button type="button" onClick={() => updateParams({ region: 'north', page: '1' })} className="product-catalog-radar__node product-catalog-radar__node--north"><span>Miền Bắc</span><small>Nông sản theo mùa</small></button>
              <button type="button" onClick={() => updateParams({ region: 'central', page: '1' })} className="product-catalog-radar__node product-catalog-radar__node--central"><span>Miền Trung</span><small>Đặc sản bản địa</small></button>
              <button type="button" onClick={() => updateParams({ region: 'south', page: '1' })} className="product-catalog-radar__node product-catalog-radar__node--south"><span>Miền Nam</span><small>Vựa nông sản lớn</small></button>
            </div>
          </div>
        </section>

        <div className="home-container product-catalog-content">
          <section className="product-category-rail" aria-label="Danh mục nông sản">
            <div className="product-category-rail__intro"><span>Khám phá nhanh</span><strong>Theo nhóm nông sản</strong></div>
            <div className="product-category-rail__items">
              <button type="button" title="Tất cả nông sản" className={!category ? 'is-active' : ''} onClick={() => updateParams({ category: '', page: '1' })}>
                <span className="product-category-rail__icon"><AgricultureIcon type="all" title="Tất cả nông sản" /></span><small>Tất cả</small>
              </button>
              {CATEGORY_OPTIONS.map((option) => (
                <button type="button" title={option.label} key={option.value} className={category === option.value ? 'is-active' : ''} onClick={() => updateParams({ category: option.value, page: '1' })}>
                  <span className="product-category-rail__icon"><AgricultureIcon type={option.value} title={option.label} /></span>
                  <small>{CATEGORY_META[option.value]?.short || option.label}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="product-discovery" aria-label="Tìm kiếm và lọc nguồn cung">
            <div className="product-discovery__header">
              <div><span><FiSliders /> Bộ lọc nguồn cung</span><p>Chọn đúng nhu cầu để rút ngắn thời gian tìm đối tác.</p></div>
              {activeFilterCount > 0 && <button type="button" className="product-discovery__clear" onClick={clearFilters}><FiX /> Xóa {activeFilterCount} bộ lọc</button>}
            </div>
            <div className="product-filters">
              <label className="product-filters__search">
                <FiSearch />
                <input type="search" aria-label="Tìm theo tên nông sản, nông trại hoặc địa phương" placeholder="Tìm nông sản, nông trại hoặc địa phương..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
                {searchInput && <button type="button" aria-label="Xóa từ khóa" onClick={() => setSearchInput('')}><FiX /></button>}
              </label>
              <label className="product-filter-field"><span>Vùng miền</span><select value={region} onChange={(event) => updateParams({ region: event.target.value, page: '1' })}><option value="">Toàn quốc</option>{REGION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="product-filter-field"><span>Hình thức</span><select value={type} onChange={(event) => updateParams({ type: event.target.value, page: '1' })}><option value="">Tất cả loại</option>{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
          </section>

          <section className="product-results" aria-live="polite">
            <div className="product-results__toolbar">
              <div><span className="product-results__eyebrow">Nguồn cung hiện có</span><h2>{loading ? 'Đang cập nhật mùa vụ…' : `${pagination.total} sản phẩm phù hợp`}</h2></div>
              <label className="product-sort"><span>Sắp xếp</span><select value={sort} onChange={(event) => updateParams({ sort: event.target.value, page: '1' })}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>

            {loading ? (
              <div className="product-list-grid product-list-grid--loading" aria-label="Đang tải sản phẩm">{[1, 2, 3, 4, 5, 6].map((item) => <div className="product-card-skeleton" key={item} />)}</div>
            ) : error ? (
              <div className="product-list-status product-list-status--error"><FiPackage /><h3>Chưa thể mở kho nguồn cung</h3><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Tải lại trang</button></div>
            ) : products.length === 0 ? (
              <div className="product-list-status"><FiSearch /><h3>Chưa tìm thấy nguồn cung phù hợp</h3><p>Thử đổi từ khóa hoặc bỏ bớt điều kiện lọc.</p><button type="button" onClick={clearFilters}>Xem toàn bộ nông sản</button></div>
            ) : (
              <>
                <div className="product-list-grid">
                  {products.map((product) => {
                    const cardImage = getCardImage(product);
                    const progress = Math.max(0, Math.min(100, Number(product.progress) || 0));
                    return (
                      <Link to={`/products/${product.id}`} className="product-supply-card" key={product.id}>
                        <div className="product-supply-card__media">
                          {cardImage ? <img src={cardImage} alt={product.name} loading="lazy" /> : <div className="product-supply-card__no-image"><FaSeedling /><span>Ảnh mùa vụ đang cập nhật</span></div>}
                          <span className="product-supply-card__category"><AgricultureIcon type={product.category} /> {CATEGORY_LABEL[product.category] || product.category}</span>
                          {product.badge && <span className="product-supply-card__badge">{product.badge}</span>}
                          <span className="product-supply-card__open"><FiArrowUpRight /></span>
                        </div>
                        <div className="product-supply-card__body">
                          <div className="product-supply-card__topline">
                            <span>{REGION_LABEL[product.region] || product.region}</span><span>{TYPE_LABEL[product.type] || product.type}</span>
                            {Number(product.rating) > 0 && <span className="product-supply-card__rating"><FiStar /> {Number(product.rating).toFixed(1)}</span>}
                          </div>
                          <h3>{product.name}</h3>
                          <div className="product-supply-card__farmer"><FiUser /> {product.farm || product.sellerName || 'Nông hộ Farmora'}</div>
                          <div className="product-supply-card__location"><FiMapPin /> {product.location || 'Đang cập nhật vùng trồng'}</div>
                          <div className="product-supply-card__supply"><div><span>{getSupplyText(product)}</span><strong>{getPriceText(product)}</strong></div>{progress > 0 && <div className="product-supply-card__progress" title={`Tiến độ mùa vụ ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {pagination.totalPages > 1 && <nav className="product-list-pagination" aria-label="Phân trang sản phẩm"><button type="button" disabled={page <= 1} aria-label="Trang trước" onClick={() => updateParams({ page: String(page - 1) })}><FiChevronLeft /></button><span><strong>{page}</strong> / {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} aria-label="Trang sau" onClick={() => updateParams({ page: String(page + 1) })}><FiChevronRight /></button></nav>}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
