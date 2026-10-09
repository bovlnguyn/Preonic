import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiBox,
  FiBriefcase,
  FiCloud,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiSearch,
  FiStar,
  FiTruck,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import contractService from '../../services/contract.service';
import productService from '../../services/product.service';
import supplierService from '../../services/supplier.service';
import './DashboardGlobalSearch.css';

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ROUTES = {
  farmer: [
    { id: 'farmer-overview', title: 'Tổng quan', subtitle: 'Trang tổng quan Farmer', path: '/farmer', keywords: 'dashboard trang chủ thống kê', icon: FiGrid },
    { id: 'farmer-crops', title: 'Mùa vụ của tôi', subtitle: 'Quản lý nông sản và mùa vụ', path: '/farmer/crops', keywords: 'sản phẩm nông sản trái cây rau củ', icon: FiBox },
    { id: 'farmer-create', title: 'Đăng bán nông sản', subtitle: 'Tạo sản phẩm hoặc mùa vụ mới', path: '/farmer/create-product', keywords: 'tạo đăng bán thêm sản phẩm', icon: FiBox },
    { id: 'farmer-contracts', title: 'Hợp đồng', subtitle: 'Hợp đồng bao tiêu và mua bán', path: '/farmer/contracts', keywords: 'ký hợp đồng đề xuất', icon: FiFileText },
    { id: 'farmer-orders', title: 'Đơn hàng', subtitle: 'Theo dõi giao nhận và đơn hàng', path: '/farmer/orders', keywords: 'giao hàng vận chuyển', icon: FiTruck },
    { id: 'farmer-billing', title: 'Thanh toán & Phí', subtitle: 'Tài khoản nhận tiền, phí dịch vụ và bảng kê', path: '/farmer/billing', keywords: 'thanh toán phí tài khoản ngân hàng bảng kê', icon: FiCreditCard },
    { id: 'farmer-ratings', title: 'Đánh giá đối tác', subtitle: 'Xem và gửi đánh giá đối tác', path: '/farmer/ratings', keywords: 'uy tín sao nhận xét', icon: FiStar },
    { id: 'farmer-weather', title: 'Thời tiết & Bảo hiểm', subtitle: 'Dự báo, cảnh báo và bảo hiểm', path: '/farmer/weather-insurance', keywords: 'thời tiết mưa nắng gió bão bảo hiểm', icon: FiCloud },
    { id: 'farmer-profile', title: 'Hồ sơ cá nhân', subtitle: 'Cập nhật thông tin và ảnh đại diện', path: '/profile', keywords: 'tài khoản avatar thông tin', icon: FiUser },
  ],
  enterprise: [
    { id: 'ent-overview', title: 'Tổng quan', subtitle: 'Trang tổng quan Enterprise', path: '/enterprise', keywords: 'dashboard trang chủ thống kê', icon: FiGrid },
    { id: 'ent-contracts', title: 'Hợp đồng', subtitle: 'Quản lý hợp đồng thu mua', path: '/enterprise/contracts', keywords: 'ký đề xuất hợp đồng mua bán', icon: FiFileText },
    { id: 'ent-products', title: 'Danh sách sản phẩm', subtitle: 'Tìm và kiểm tra nguồn cung', path: '/enterprise/products', keywords: 'nông sản trái cây rau củ nguồn cung', icon: FiBox },
    { id: 'ent-orders', title: 'Theo dõi đơn hàng', subtitle: 'Theo dõi giao nhận và vận chuyển', path: '/enterprise/orders', keywords: 'đơn hàng giao hàng vận chuyển', icon: FiTruck },
    { id: 'ent-billing', title: 'Thanh toán & Phí', subtitle: 'Theo dõi phí dịch vụ và bảng kê', path: '/enterprise/billing', keywords: 'thanh toán phí bảng kê công nợ', icon: FiCreditCard },
    { id: 'ent-suppliers', title: 'Nhà cung cấp', subtitle: 'Nông dân đang và đã hợp tác', path: '/enterprise/suppliers', keywords: 'nông dân đối tác nguồn cung', icon: FiUsers },
    { id: 'ent-transactions', title: 'Lịch sử giao dịch', subtitle: 'Tra cứu giao dịch và thanh toán', path: '/enterprise/transactions', keywords: 'lịch sử giao dịch tiền', icon: FiBriefcase },
    { id: 'ent-ratings', title: 'Đánh giá đối tác', subtitle: 'Xem và gửi đánh giá đối tác', path: '/enterprise/ratings', keywords: 'uy tín sao nhận xét', icon: FiStar },
    { id: 'ent-weather', title: 'Thời tiết & Bảo hiểm', subtitle: 'Dự báo, cảnh báo và bảo hiểm', path: '/enterprise/weather-insurance', keywords: 'thời tiết mưa nắng gió bão bảo hiểm', icon: FiCloud },
    { id: 'ent-profile', title: 'Hồ sơ doanh nghiệp', subtitle: 'Cập nhật thông tin tài khoản', path: '/profile', keywords: 'tài khoản avatar công ty', icon: FiUser },
  ],
};

const getList = (response, keys) => {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], response);
    if (Array.isArray(value)) return value;
  }
  return [];
};

const scoreItem = (item, query) => {
  const title = normalize(item.title);
  const subtitle = normalize(item.subtitle);
  const keywords = normalize(item.keywords);
  if (title === query) return 120;
  if (title.startsWith(query)) return 100;
  if (title.includes(query)) return 80;
  if (subtitle.includes(query)) return 55;
  if (keywords.includes(query)) return 40;
  return 0;
};

function DashboardGlobalSearch({ role = 'farmer', placeholder }) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(0);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteItems, setRemoteItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const resolvedRole = role === 'enterprise' ? 'enterprise' : 'farmer';
  const routeItems = ROUTES[resolvedRole];

  const loadData = useCallback(async () => {
    if (loaded || loading) return;
    const requestId = ++requestRef.current;
    setLoading(true);

    try {
      const tasks = [contractService.list().catch(() => null)];
      if (resolvedRole === 'farmer') {
        tasks.push(productService.getMyProducts().catch(() => null));
      } else {
        tasks.push(productService.getProducts({ page: 1, limit: 30 }).catch(() => null));
        tasks.push(supplierService.list().catch(() => null));
      }

      const [contractsRes, productsRes, suppliersRes] = await Promise.all(tasks);
      if (requestId !== requestRef.current) return;

      const contracts = getList(contractsRes, ['data.contracts', 'contracts', 'data']);
      const products = getList(productsRes, ['data.products', 'data.items', 'products', 'items', 'data']);
      const suppliers = getList(suppliersRes, ['data.suppliers', 'suppliers', 'data']);

      const contractItems = contracts.map((contract) => {
        const partner = resolvedRole === 'enterprise' ? contract?.farmer?.name : contract?.enterprise?.name;
        const product = contract?.product?.name;
        return {
          id: `contract-${contract.id}`,
          type: 'Hợp đồng',
          title: contract.contractCode || `Hợp đồng ${contract.id}`,
          subtitle: [product, partner].filter(Boolean).join(' · ') || 'Xem chi tiết hợp đồng',
          keywords: `${contract.contractCode || ''} ${product || ''} ${partner || ''} ${contract.status || ''}`,
          path: `/${resolvedRole}/contracts/${contract.id}`,
          icon: FiFileText,
        };
      });

      const productItems = products.map((product) => ({
        id: `product-${product.id}`,
        type: resolvedRole === 'farmer' ? 'Mùa vụ' : 'Sản phẩm',
        title: product.name || product.productName || `Sản phẩm ${product.id}`,
        subtitle: [product.region, product.location, product.category].filter(Boolean).join(' · ') || 'Xem chi tiết sản phẩm',
        keywords: `${product.name || ''} ${product.productName || ''} ${product.region || ''} ${product.location || ''} ${product.category || ''}`,
        path: resolvedRole === 'farmer' ? `/farmer/crops/${product.id}` : `/enterprise/products/${product.id}`,
        icon: FiBox,
      }));

      const supplierItems = suppliers.map((supplier) => ({
        id: `supplier-${supplier.id}`,
        type: 'Nhà cung cấp',
        title: supplier.name || 'Nông dân',
        subtitle: [supplier.location, ...(supplier.products || []).slice(0, 2)].filter(Boolean).join(' · ') || 'Xem danh sách nhà cung cấp',
        keywords: `${supplier.name || ''} ${supplier.location || ''} ${(supplier.products || []).join(' ')}`,
        path: '/enterprise/suppliers',
        icon: FiUsers,
      }));

      setRemoteItems([...contractItems, ...productItems, ...supplierItems]);
      setLoaded(true);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [loaded, loading, resolvedRole]);

  useEffect(() => {
    setQuery('');
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (normalize(query).length >= 2) {
      const timer = window.setTimeout(loadData, 220);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [query, loadData]);

  const suggestions = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return routeItems.slice(0, 3);

    return [...routeItems, ...remoteItems]
      .map((item) => ({ ...item, score: scoreItem(item, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi'))
      .slice(0, 3);
  }, [query, remoteItems, routeItems]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  const choose = (item) => {
    if (!item) return;
    setOpen(false);
    setQuery('');
    navigate(item.path);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className={`dashboard-search dashboard-search--${resolvedRole}`}>
      <div className={`dashboard-search__control ${open ? 'is-open' : ''}`}>
        <FiSearch className="dashboard-search__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Tìm kiếm trong dashboard"
          aria-controls={`${resolvedRole}-dashboard-search-results`}
          onFocus={() => {
            setOpen(true);
            loadData();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="dashboard-search__clear"
            aria-label="Xóa nội dung tìm kiếm"
            onClick={() => {
              setQuery('');
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <FiX />
          </button>
        ) : null}
      </div>

      {open ? (
        <div id={`${resolvedRole}-dashboard-search-results`} className="dashboard-search__panel" role="listbox">
          <div className="dashboard-search__panel-head">
            <span>{query ? 'Kết quả phù hợp' : 'Truy cập nhanh'}</span>
            {loading ? <small>Đang cập nhật…</small> : <small>Tối đa 3 gợi ý</small>}
          </div>

          {suggestions.length ? (
            <div className="dashboard-search__list">
              {suggestions.map((item, index) => {
                const Icon = item.icon || FiSearch;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`dashboard-search__item ${activeIndex === index ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(item)}
                  >
                    <span className="dashboard-search__item-icon"><Icon /></span>
                    <span className="dashboard-search__item-copy">
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                    <span className="dashboard-search__item-type">{item.type || 'Chức năng'}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-search__empty">
              <FiSearch />
              <strong>Không tìm thấy kết quả</strong>
              <span>Thử tên hợp đồng, sản phẩm, đối tác hoặc chức năng khác.</span>
            </div>
          )}

          <div className="dashboard-search__hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> chọn</span>
            <span><kbd>Enter</kbd> mở</span>
            <span><kbd>Esc</kbd> đóng</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardGlobalSearch;
