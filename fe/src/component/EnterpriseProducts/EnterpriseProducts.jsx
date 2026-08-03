import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiMapPin,
  FiPackage,
  FiSearch,
  FiShield,
  FiStar,
  FiTruck,
} from "react-icons/fi";
import Header from "../Common/Header";
import Footer from "../Common/Footer";
import productService, { resolveImageUrl } from "../../services/product.service";
import {
  CATEGORY_LABEL,
  REGION_LABEL,
  TYPE_LABEL,
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
} from "../../constants/product";
import "./EnterpriseProducts.css";

const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 350;

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatPriceRange(item) {
  if (item.priceMin && item.priceMax) {
    return `${formatPrice(item.priceMin)} – ${formatPrice(item.priceMax)}đ/${item.priceUnit || item.unit}`;
  }
  if (item.priceMin) {
    return `${formatPrice(item.priceMin)}đ/${item.priceUnit || item.unit}`;
  }
  return "Liên hệ để biết giá";
}

function formatHarvest(item) {
  if (item.expectedDate) {
    return new Date(item.expectedDate).toLocaleDateString("vi-VN");
  }
  return "Chưa cập nhật";
}

function EnterpriseProducts() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(keyword);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [keyword]);

  useEffect(() => {
    setLoading(true);
    setError("");
    productService
      .getProducts({ category, region, search, page, limit: PAGE_SIZE })
      .then((res) => {
        setProducts(res?.data || []);
        setPagination(res?.pagination || { page: 1, total: 0, totalPages: 1 });
      })
      .catch(() => setError("Không thể tải danh sách nguồn cung."))
      .finally(() => setLoading(false));
  }, [category, region, search, page]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="enterprise-products-page">
      <Header />

      <main>
        <section className="ep-hero">
          <div className="ep-container ep-hero__grid">
            <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="ep-eyebrow"><FiPackage /> Enterprise supply marketplace</span>
              <h1>Tìm nguồn cung nông sản phù hợp để thu mua và ký hợp đồng.</h1>
              <p>
                Danh sách nguồn cung thực tế từ nông dân trên PreOnic. Lọc theo danh mục, vùng miền và từ khóa để tìm nhà cung cấp phù hợp nhu cầu thu mua của doanh nghiệp bạn.
              </p>
            </motion.div>

            <motion.div className="ep-hero__panel" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.12 }}>
              <strong>{pagination.total}</strong>
              <span>nguồn cung đang khớp bộ lọc</span>
              <div className="ep-hero__badges">
                <em><FiShield /> Escrow ready</em>
                <em><FiCheckCircle /> Verified profile</em>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="ep-container ep-filter-card">
          <div className="ep-search-box">
            <FiSearch />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên nông sản, farmer hoặc khu vực..."
            />
          </div>

          <div className="ep-select-group">
            <label>
              <FiFilter /> Danh mục
              <select value={category} onChange={handleFilterChange(setCategory)}>
                <option value="">Tất cả</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label>
              <FiMapPin /> Khu vực
              <select value={region} onChange={handleFilterChange(setRegion)}>
                <option value="">Tất cả</option>
                {REGION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="ep-container ep-content-grid">
          <div className="ep-list">
            {loading ? (
              <div className="ep-empty">Đang tải danh sách nguồn cung...</div>
            ) : error ? (
              <div className="ep-empty">{error}</div>
            ) : products.length === 0 ? (
              <div className="ep-empty">Không tìm thấy nguồn cung phù hợp.</div>
            ) : (
              products.map((item, index) => {
                const image = resolveImageUrl(item.image);
                return (
                  <motion.article
                    className="ep-product-card"
                    key={item.id}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: index * 0.04 }}
                  >
                    <div className="ep-product-card__image">
                      {image ? (
                        <img src={image} alt={item.name} />
                      ) : (
                        <>
                          <FiPackage />
                          <span>{CATEGORY_LABEL[item.category] || item.category}</span>
                        </>
                      )}
                    </div>

                    <div className="ep-product-card__body">
                      <div className="ep-product-card__top">
                        <div>
                          <h3>{item.name}</h3>
                          <p><FiMapPin /> {REGION_LABEL[item.region] || item.region} · {item.sellerName || item.farm || "Chưa cập nhật"}</p>
                        </div>
                        <strong>{formatPriceRange(item)}</strong>
                      </div>

                      <div className="ep-meta-grid">
                        <span>Sản lượng <b>{item.totalQuantity ? `${formatPrice(item.totalQuantity)} ${item.unit || ""}` : "Chưa cập nhật"}</b></span>
                        <span>Thu hoạch dự kiến <b>{formatHarvest(item)}</b></span>
                        <span>Loại <b>{TYPE_LABEL[item.type] || item.type}</b></span>
                        <span>Danh mục <b>{CATEGORY_LABEL[item.category] || item.category}</b></span>
                      </div>

                      <div className="ep-product-card__bottom">
                        <div className="ep-rating"><FiStar /> {item.rating > 0 ? item.rating : "Chưa có đánh giá"} · {item.badge || "Đang chào bán"}</div>
                        {item.rating > 0 && (
                          <div className="ep-match">
                            <span>Đánh giá chất lượng {Math.round((item.rating / 5) * 100)}%</span>
                            <div><i style={{ width: `${(item.rating / 5) * 100}%` }} /></div>
                          </div>
                        )}
                      </div>

                      <div className="ep-actions">
                        <button type="button" onClick={() => navigate(`/enterprise/contracts/create?product=${item.id}`)}>Gửi đề xuất hợp đồng</button>
                        <button type="button" className="ghost" onClick={() => navigate(`/enterprise-products/${item.id}`)}>Xem nhà cung cấp <FiArrowRight /></button>
                      </div>
                    </div>
                  </motion.article>
                );
              })
            )}

            {pagination.totalPages > 1 && (
              <div className="ep-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <FiChevronLeft />
                </button>
                <span>Trang {page} / {pagination.totalPages}</span>
                <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>

          <aside className="ep-side-panel">
            <h2>Gợi ý thu mua</h2>
            <div className="ep-insight">
              <FiTruck />
              <div>
                <strong>Ưu tiên nguồn gần kho</strong>
                <span>Giảm chi phí vận chuyển và rủi ro giao trễ.</span>
              </div>
            </div>
            <div className="ep-insight">
              <FiShield />
              <div>
                <strong>Chọn hợp đồng có escrow</strong>
                <span>Tăng minh bạch khi đặt cọc mùa vụ.</span>
              </div>
            </div>
            <div className="ep-insight">
              <FiStar />
              <div>
                <strong>Kiểm tra rating farmer</strong>
                <span>Ưu tiên đối tác có lịch sử giao hàng ổn định.</span>
              </div>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default EnterpriseProducts;
