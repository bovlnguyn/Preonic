import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowRight, FiChevronLeft, FiChevronRight, FiGlobe, FiMapPin,
  FiSearch, FiShoppingBag, FiX,
} from 'react-icons/fi';
import { VN_DISTRICTS } from '../../../data/vn-locations';
import productService, { resolveImageUrl } from '../../../services/product.service';
import advertisementService from '../../../services/advertisement.service';
import AgricultureIcon from '../../Common/AgricultureIcon';
import sideBanner from '../../../assets/home/BG1.jpg';
import dragonFruitBanner from '../../../assets/home/banners/dragon-fruit-farmer.jpg';
import coffeeBanner from '../../../assets/home/banners/coffee-farmer.jpg';
import riceBanner from '../../../assets/home/banners/rice-farmer.jpg';
import './RegionalMarketplace.css';

const LOCATION_KEY = 'preonic_public_location_v1';
const PROVINCES = Object.keys(VN_DISTRICTS);
const CATEGORY_META = [
  ['all', 'Tất cả nông sản'],
  ['vegetable', 'Rau củ quả'],
  ['fruit', 'Trái cây'],
  ['rice', 'Lúa & gạo'],
  ['coffee', 'Cà phê'],
  ['tea', 'Trà'],
  ['spice', 'Gia vị'],
  ['grain', 'Ngũ cốc'],
];
const DEFAULT_CAMPAIGNS = [
  {
    id: 'preonic-demo-dragon-fruit',
    title: 'Thanh long chín tại vườn, sẵn sàng cho đơn hàng lớn',
    content: 'Nguồn thanh long tuyển chọn từ nông hộ Bình Thuận, minh bạch vùng trồng và lịch thu hoạch.',
    bannerUrl: dragonFruitBanner,
    targetUrl: '/products',
    province: 'Binh Thuan',
    farmer: { name: 'Nông trại Hải An' },
  },
  {
    id: 'preonic-demo-coffee',
    title: 'Cà phê Robusta vụ mới từ cao nguyên',
    content: 'Hạt chín chọn lọc, sơ chế tại nguồn và có kế hoạch giao theo nhu cầu doanh nghiệp.',
    bannerUrl: coffeeBanner,
    targetUrl: '/products/10000000-0000-4000-8000-000000000005',
    province: 'Dak Lak',
    farmer: { name: 'Rẫy cà phê Thuận Phát' },
  },
  {
    id: 'preonic-demo-rice',
    title: 'Gạo ST25 mới mùa, truy xuất rõ từng cánh đồng',
    content: 'Kết nối trực tiếp hợp tác xã Đồng Tháp với nguồn gạo đồng đều, ổn định và đúng lịch.',
    bannerUrl: riceBanner,
    targetUrl: '/products/10000000-0000-4000-8000-000000000002',
    province: 'Dong Thap',
    farmer: { name: 'Hợp tác xã Vườn An' },
  },
];
const isLocalDemo = (slide) => String(slide?.id || '').startsWith('preonic-demo-');

const NORTH = new Set(['Ha Noi', 'Hai Phong', 'Son La', 'Lai Chau', 'Ha Giang', 'Phu Tho', 'Thai Nguyen', 'Lang Son', 'Quang Ninh']);
const CENTRAL = new Set(['Da Nang', 'Thua Thien Hue', 'Nghe An', 'Thanh Hoa', 'Quang Nam', 'Binh Thuan', 'Khanh Hoa', 'Gia Lai', 'Kon Tum', 'Dak Lak']);
const provinceRegion = (province) => NORTH.has(province) ? 'north' : CENTRAL.has(province) ? 'central' : 'south';
const money = new Intl.NumberFormat('vi-VN');

const readLocation = () => {
  try { return JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null'); } catch { return null; }
};

function RegionalMarketplace() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(readLocation);
  const [locationDraft, setLocationDraft] = useState(() => readLocation() || { province: '', district: '' });
  const [showLocation, setShowLocation] = useState(() => !readLocation());
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const impressed = useRef(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      productService.getProducts({ limit: 24, sort: 'default' }),
      advertisementService.getPublic(location?.province),
    ]).then(([productResult, campaignResult]) => {
      if (!active) return;
      const productData = productResult.status === 'fulfilled' ? productResult.value?.data || [] : [];
      const preferredRegion = provinceRegion(location?.province);
      setProducts([...productData].sort((a, b) => Number(b.region === preferredRegion) - Number(a.region === preferredRegion)));
      setCampaigns(campaignResult.status === 'fulfilled' ? campaignResult.value?.data || [] : []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [location?.province]);

  const slides = useMemo(() => {
    const source = campaigns.length ? campaigns : DEFAULT_CAMPAIGNS;
    if (!location?.province) return source;
    const preferredRegion = provinceRegion(location.province);
    return [...source].sort((a, b) => Number(provinceRegion(b.province) === preferredRegion) - Number(provinceRegion(a.province) === preferredRegion));
  }, [campaigns, location?.province]);

  useEffect(() => {
    if (slides.length <= 1 || carouselPaused) return undefined;
    const timer = window.setInterval(() => setActiveSlide((value) => (value + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [carouselPaused, slides.length]);

  useEffect(() => {
    if (activeSlide >= slides.length) setActiveSlide(0);
    const slide = slides[activeSlide];
    if (!slide || isLocalDemo(slide) || impressed.current.has(slide.id)) return;
    impressed.current.add(slide.id);
    void advertisementService.trackImpression(slide.id).catch(() => {});
  }, [activeSlide, slides]);

  const visibleProducts = useMemo(() => products
    .filter((item) => category === 'all' || item.category === category)
    .filter((item) => !search.trim() || item.name?.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 8), [products, category, search]);

  const saveLocation = () => {
    if (!locationDraft.province) return;
    localStorage.setItem(LOCATION_KEY, JSON.stringify(locationDraft));
    setLocation(locationDraft);
    setShowLocation(false);
    setActiveSlide(0);
  };

  const openSlide = (slide) => {
    if (!isLocalDemo(slide)) void advertisementService.trackClick(slide.id).catch(() => {});
    navigate(slide.targetUrl || '/products');
  };

  const current = slides[activeSlide] || slides[0];

  return (
    <section className="regional-market" aria-label="Chợ nông sản Farmora">
      <div className="home-container regional-market__shell">
        <div className="regional-market__search-row">
          <div className="regional-market__title">
            <button
              className="regional-market__location-trigger"
              type="button"
              onClick={() => setShowLocation(true)}
              title="Thay đổi khu vực ưu tiên"
            >
              <span className="regional-market__location-icon"><FiMapPin /></span>
              <span className="regional-market__location-copy">
                <small>{location?.province ? 'Khu vực đang ưu tiên' : 'Cá nhân hóa nguồn cung'}</small>
                <b>{location?.district ? `${location.district}, ` : ''}{location?.province || 'Chọn khu vực'}</b>
              </span>
              <FiChevronRight className="regional-market__location-arrow" />
            </button>
            <strong>Nông sản theo vùng</strong>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); }} className="regional-market__search">
            <FiSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nông sản, vùng trồng..." />
            <button type="submit" aria-label="Tìm kiếm"><FiArrowRight /></button>
          </form>
          <Link to="/products" className="regional-market__orders"><FiShoppingBag /> Xem nguồn cung</Link>
        </div>

        <div className="regional-market__hero-grid">
          <article className="regional-market__banner" onClick={() => openSlide(current)} onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)} role="button" tabIndex="0" aria-label={`${current.title}. Mở quảng cáo`} onKeyDown={(e) => e.key === 'Enter' && openSlide(current)}>
            <img key={`image-${current.id}`} src={isLocalDemo(current) ? current.bannerUrl : resolveImageUrl(current.bannerUrl)} alt={current.title} />
            <div className="regional-market__banner-shade" />
            <div className="regional-market__banner-copy" key={`copy-${current.id}`}>
              <span>ĐƯỢC TÀI TRỢ · {current.province || 'TOÀN QUỐC'}</span>
              <h1>{current.title}</h1>
              <p>{current.content}</p>
              <button type="button">Khám phá ngay <FiArrowRight /></button>
              <small>{current.farmer?.name}</small>
            </div>
            {slides.length > 1 && <>
              <button className="regional-market__slide-prev" type="button" aria-label="Banner trước" onClick={(e) => { e.stopPropagation(); setActiveSlide((activeSlide - 1 + slides.length) % slides.length); }}><FiChevronLeft /></button>
              <button className="regional-market__slide-next" type="button" aria-label="Banner sau" onClick={(e) => { e.stopPropagation(); setActiveSlide((activeSlide + 1) % slides.length); }}><FiChevronRight /></button>
              <div className="regional-market__carousel-footer">
                <div className="regional-market__dots">{slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Banner ${index + 1}`} className={index === activeSlide ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setActiveSlide(index); }} />)}</div>
                <div className={`regional-market__autoplay ${carouselPaused ? 'paused' : ''}`} aria-hidden="true"><span key={`progress-${current.id}`} /></div>
              </div>
            </>}
          </article>

          <aside className="regional-market__side-banners">
            <div className="regional-market__side-card regional-market__side-card--photo" style={{ backgroundImage: `url(${sideBanner})` }}>
              <span>MUA GẦN VÙNG</span><strong>Giảm quãng đường<br />Tăng độ tươi</strong><Link to="/products">Xem nông sản <FiArrowRight /></Link>
            </div>
            <div className="regional-market__side-card regional-market__side-card--farmer">
              <span>DÀNH CHO FARMER</span><strong>Đưa nông sản của bạn lên trang chủ</strong><Link to="/register">Bắt đầu quảng bá <FiArrowRight /></Link>
            </div>
          </aside>
        </div>

        <nav className="regional-market__categories" aria-label="Danh mục nông sản">
          <div className="regional-market__categories-title">
            <span>Khám phá theo mùa</span>
            <strong>Nhóm nông sản</strong>
            <small>{location?.province ? `Đang ưu tiên ${location.province}` : 'Nguồn cung toàn quốc'}</small>
          </div>
          <div className="regional-market__category-dock">
            {CATEGORY_META.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                title={label}
                className={category === value ? 'active' : ''}
                onClick={() => setCategory(value)}
              >
                <span><AgricultureIcon type={value} title={label} /></span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </nav>

        <div className="regional-market__supply-panel">
          <div className="regional-market__products-head">
            <div><span>Nguồn cung nổi bật</span><h2>{location?.province ? `Đề xuất gần ${location.province}` : 'Nông sản mới trên Farmora'}</h2></div>
            <Link to="/products">Xem tất cả <FiArrowRight /></Link>
          </div>
          <div className="regional-market__products">
            {loading ? Array.from({ length: 4 }, (_, index) => <div className="regional-product regional-product--loading" key={index} />) : visibleProducts.map((product) => (
              <Link className="regional-product" to={`/products/${product.id}`} key={product.id}>
                <div className="regional-product__image"><img src={resolveImageUrl(product.image) || sideBanner} alt={product.name} /><span>{product.region === provinceRegion(location?.province) ? 'Gần khu vực' : product.badge || 'Nguồn cung mới'}</span></div>
                <div className="regional-product__body"><small>{product.location || product.farm || 'Việt Nam'}</small><h3>{product.name}</h3><p>{product.priceMin ? `${money.format(product.priceMin)}đ` : 'Liên hệ'} <span>/ {product.priceUnit || product.unit || 'kg'}</span></p></div>
              </Link>
            ))}
            {!loading && visibleProducts.length === 0 && <div className="regional-market__empty">Chưa có nông sản phù hợp. Hãy thử danh mục khác.</div>}
          </div>
        </div>
      </div>

      {showLocation && <div className="location-welcome" role="dialog" aria-modal="true" aria-labelledby="location-title">
        <div className="location-welcome__backdrop" />
        <div className="location-welcome__modal">
          {location && <button className="location-welcome__close" type="button" onClick={() => setShowLocation(false)} aria-label="Đóng"><FiX /></button>}
          <div className="location-welcome__visual"><span>🌾</span><strong>Mỗi vùng một mùa ngon</strong><p>Farmora đưa nguồn cung địa phương đến gần bạn hơn.</p></div>
          <div className="location-welcome__content">
            <span className="location-welcome__eyebrow"><FiMapPin /> CÁ NHÂN HÓA THEO KHU VỰC</span>
            <h2 id="location-title">Bạn đang quan tâm nông sản ở đâu?</h2>
            <p>Chọn khu vực để ưu tiên nông sản và banner của Farmer trong vùng. Bạn có thể đổi lại bất cứ lúc nào.</p>
            <label>Tỉnh / Thành phố<select value={locationDraft.province} onChange={(e) => setLocationDraft({ province: e.target.value, district: '' })}><option value="">Chọn tỉnh / thành phố</option>{PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
            <label>Quận / Huyện<select value={locationDraft.district} disabled={!locationDraft.province} onChange={(e) => setLocationDraft((value) => ({ ...value, district: e.target.value }))}><option value="">{locationDraft.province ? 'Toàn tỉnh / thành phố' : 'Chọn tỉnh trước'}</option>{(VN_DISTRICTS[locationDraft.province] || []).map((district) => <option key={district} value={district}>{district}</option>)}</select></label>
            <div className="location-welcome__actions">
              <button className="location-welcome__submit" type="button" disabled={!locationDraft.province} onClick={saveLocation}>Xem đề xuất phù hợp <FiArrowRight /></button>
              <button className="location-welcome__skip" type="button" onClick={() => { localStorage.setItem(LOCATION_KEY, JSON.stringify({ province: '', district: '' })); setLocation({ province: '', district: '' }); setShowLocation(false); }}><FiGlobe /> Xem toàn quốc</button>
            </div>
          </div>
        </div>
      </div>}
    </section>
  );
}

export default RegionalMarketplace;
