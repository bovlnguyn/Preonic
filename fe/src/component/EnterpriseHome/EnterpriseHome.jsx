import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiFileText,
  FiMapPin,
  FiPackage,
  FiShield,
  FiStar,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import Header from "../Common/Header";
import Footer from "../Common/Footer";
import { useAuth } from "../../contexts/AuthContext";
import productService from "../../services/product.service";
import contractService from "../../services/contract.service";
import supplierService from "../../services/supplier.service";
import { REGION_LABEL } from "../../constants/product";
import "./EnterpriseHome.css";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.11,
    },
  },
};

const workflow = [
  {
    icon: FiMapPin,
    title: "Tìm vùng cung ứng",
    desc: "Lọc nhanh sản phẩm theo mùa vụ, khu vực, chứng chỉ và năng lực giao hàng.",
  },
  {
    icon: FiFileText,
    title: "Gửi đề xuất hợp đồng",
    desc: "Tạo đề xuất thu mua, thống nhất sản lượng, giá, lịch giao và điều khoản đặt cọc.",
  },
  {
    icon: FiShield,
    title: "Giữ cọc minh bạch",
    desc: "Theo dõi trạng thái escrow để giảm rủi ro cho cả doanh nghiệp và nông dân.",
  },
  {
    icon: FiStar,
    title: "Đánh giá nhà cung cấp",
    desc: "Lưu lịch sử hợp tác, chấm điểm uy tín và ưu tiên đối tác tốt cho mùa vụ sau.",
  },
];

function getFirstName(fullName) {
  if (!fullName) return "doanh nghiệp";
  const parts = fullName.trim().split(" ");
  return parts.slice(-2).join(" ") || fullName;
}

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatSupplyPrice(item) {
  if (item.priceMin && item.priceMax) {
    return `${formatPrice(item.priceMin)} – ${formatPrice(item.priceMax)}đ/${item.priceUnit || item.unit}`;
  }
  if (item.priceMin) return `${formatPrice(item.priceMin)}đ/${item.priceUnit || item.unit}`;
  return "Liên hệ";
}

function onTimeDeliveryRate(contracts) {
  const completed = contracts.filter((c) => c.status === "completed" && c.deliveryDate && c.completedAt);
  if (completed.length === 0) return null;
  const onTime = completed.filter((c) => new Date(c.completedAt) <= new Date(c.deliveryDate));
  return Math.round((onTime.length / completed.length) * 100);
}

function getResponseList(response, nestedKey) {
  if (Array.isArray(response?.data)) return response.data;
  if (nestedKey && Array.isArray(response?.data?.[nestedKey])) return response.data[nestedKey];
  if (nestedKey && Array.isArray(response?.[nestedKey])) return response[nestedKey];
  return [];
}

function EnterpriseHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = getFirstName(user?.fullName || user?.name || user?.email);

  const [totalSupplies, setTotalSupplies] = useState(null);
  const [featuredSupplies, setFeaturedSupplies] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState("");
  const [contractCount, setContractCount] = useState(null);
  const [onTimeRate, setOnTimeRate] = useState(null);
  const [supplierCount, setSupplierCount] = useState(null);

  const loadFeaturedSupplies = useCallback(async () => {
    setFeaturedLoading(true);
    setFeaturedError("");

    try {
      const res = await productService.getProducts({ sort: "rating", page: 1, limit: 3 });
      const products = getResponseList(res, "products");

      setFeaturedSupplies(products);
      setTotalSupplies(Number(res?.pagination?.total ?? res?.total ?? products.length));
    } catch (error) {
      setFeaturedSupplies([]);
      setFeaturedError(
        error?.message || "Không thể tải nguồn cung nổi bật. Vui lòng thử lại."
      );
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedSupplies();

    contractService
      .list()
      .then((res) => {
        const contracts = getResponseList(res, "contracts");
        setContractCount(contracts.length);
        setOnTimeRate(onTimeDeliveryRate(contracts));
      })
      .catch(() => {
        setContractCount(0);
        setOnTimeRate(null);
      });

    supplierService
      .list()
      .then((res) => {
        const suppliers = getResponseList(res, "suppliers");
        setSupplierCount(suppliers.length);
      })
      .catch(() => setSupplierCount(0));
  }, [loadFeaturedSupplies]);

  const procurementStats = [
    { label: "Nguồn cung phù hợp", value: totalSupplies != null ? String(totalSupplies) : "--", icon: FiPackage, tone: "blue" },
    { label: "Đề xuất hợp đồng", value: contractCount != null ? String(contractCount) : "--", icon: FiFileText, tone: "green" },
    { label: "Tỷ lệ giao đúng hạn", value: onTimeRate != null ? `${onTimeRate}%` : "--", icon: FiTruck, tone: "gold" },
    { label: "Đối tác uy tín", value: supplierCount != null ? String(supplierCount) : "--", icon: FiUsers, tone: "cyan" },
  ];

  return (
    <div className="enterprise-home-page">
      <Header />

      <main>
        <section className="eh-hero">
          <div className="eh-hero__orb eh-hero__orb--one" />
          <div className="eh-hero__orb eh-hero__orb--two" />

          <div className="eh-container eh-hero__grid">
            <motion.div
              className="eh-hero__content"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.span className="eh-eyebrow" variants={fadeUp}>
                <FiBarChart2 /> Enterprise procurement workspace
              </motion.span>

              <motion.h1 variants={fadeUp}>
                Xin chào {displayName}, tối ưu nguồn cung nông sản an toàn hơn.
              </motion.h1>

              <motion.p variants={fadeUp}>
                Trang chủ doanh nghiệp giúp bạn nắm nhanh cơ hội thu mua trên PreOnic:
                tìm nông sản theo mùa vụ, kiểm tra nhà cung cấp, tạo hợp đồng và quản lý
                đặt cọc minh bạch qua dashboard.
              </motion.p>

              <motion.div className="eh-hero__actions" variants={fadeUp}>
                <button type="button" className="eh-btn eh-btn--primary" onClick={() => navigate("/enterprise")}>
                  Vào dashboard <FiArrowRight />
                </button>
                <button type="button" className="eh-btn eh-btn--ghost" onClick={() => navigate("/enterprise-products")}>
                  Xem nguồn cung <FiPackage />
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              className="eh-procurement-card"
              initial={{ opacity: 0, x: 46, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.72, ease: "easeOut" }}
            >
              <div className="eh-procurement-card__header">
                <span>PreOnic Enterprise</span>
                <strong>Bảng thu mua thông minh</strong>
              </div>

              <div className="eh-procurement-card__main">
                <div>
                  <span>Nguồn cung đang khớp</span>
                  <strong>{totalSupplies != null ? totalSupplies : "--"} sản phẩm</strong>
                </div>
                <div className="eh-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="eh-checklist">
                <span><FiCheckCircle /> Lọc sản phẩm theo vùng miền</span>
                <span><FiShield /> Đặt cọc và hợp đồng minh bạch</span>
                <span><FiStar /> Ưu tiên farmer có hồ sơ uy tín</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="eh-container eh-stats-section">
          <motion.div className="eh-stats-grid" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={stagger}>
            {procurementStats.map(({ label, value, icon: Icon, tone }) => (
              <motion.article className={`eh-stat-card eh-stat-card--${tone}`} key={label} variants={fadeUp}>
                <span className="eh-stat-card__icon"><Icon /></span>
                <div>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section className="eh-container eh-section-grid">
          <motion.div className="eh-section-heading" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.span className="eh-kicker" variants={fadeUp}>Nguồn cung nổi bật</motion.span>
            <motion.h2 variants={fadeUp}>Theo dõi nhanh các lô hàng có khả năng ký hợp đồng.</motion.h2>
            <motion.p variants={fadeUp}>
              Danh sách nguồn cung có rating cao nhất trên PreOnic, cập nhật trực tiếp từ hồ sơ nông dân.
            </motion.p>
          </motion.div>

          <div className="eh-supply-list" aria-live="polite">
            {featuredLoading ? (
              <div className="eh-supply-skeletons" aria-label="Đang tải nguồn cung nổi bật">
                {[0, 1, 2].map((item) => (
                  <div className="eh-supply-skeleton" key={item}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : featuredError ? (
              <div className="eh-supply-state eh-supply-state--error">
                <FiPackage />
                <h3>Chưa tải được nguồn cung</h3>
                <p>{featuredError}</p>
                <button type="button" onClick={loadFeaturedSupplies}>Thử tải lại</button>
              </div>
            ) : featuredSupplies.length === 0 ? (
              <div className="eh-supply-state">
                <FiPackage />
                <h3>Chưa có nguồn cung phù hợp</h3>
                <p>Các sản phẩm mới từ farmer sẽ được hiển thị tại đây ngay khi được đăng bán.</p>
                <button type="button" onClick={() => navigate("/enterprise-products")}>Xem toàn bộ nguồn cung</button>
              </div>
            ) : (
              featuredSupplies.map((item, index) => (
                <motion.article
                  className="eh-supply-card"
                  key={item.id || `${item.name}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: index * 0.08 }}
                >
                  <div className="eh-supply-card__top">
                    <div>
                      <h3>{item.name || "Nông sản chưa đặt tên"}</h3>
                      <span><FiMapPin /> {REGION_LABEL[item.region] || item.location || "Chưa cập nhật khu vực"}</span>
                    </div>
                    <strong>{formatSupplyPrice(item)}</strong>
                  </div>
                  <div className="eh-supply-card__meta">
                    <span>Sản lượng: <b>{item.totalQuantity ? `${formatPrice(item.totalQuantity)} ${item.unit || ""}` : "Chưa cập nhật"}</b></span>
                    <span>Nông dân: <b>{item.sellerName || item.farm || "Chưa cập nhật"}</b></span>
                    <span>Đánh giá: <b>{Number(item.rating) > 0 ? `${Number(item.rating).toFixed(1)}/5` : "Chưa có"}</b></span>
                  </div>
                  <div className="eh-progress" aria-label={`Mức đánh giá ${Number(item.rating) || 0} trên 5`}>
                    <span style={{ width: `${Number(item.rating) > 0 ? Math.min((Number(item.rating) / 5) * 100, 100) : 0}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(item.id ? `/enterprise-products/${item.id}` : "/enterprise-products")}
                  >
                    Kiểm tra nguồn cung <FiArrowRight />
                  </button>
                </motion.article>
              ))
            )}
          </div>
        </section>

        <section className="eh-workflow-section">
          <div className="eh-container">
            <motion.div className="eh-workflow-head" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.span className="eh-kicker" variants={fadeUp}>Quy trình dành cho doanh nghiệp</motion.span>
              <motion.h2 variants={fadeUp}>Từ tìm nguồn cung đến quản lý hợp đồng trong một luồng thống nhất.</motion.h2>
            </motion.div>

            <motion.div className="eh-workflow-grid" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={stagger}>
              {workflow.map(({ icon: Icon, title, desc }, index) => (
                <motion.article className="eh-workflow-card" key={title} variants={fadeUp}>
                  <span className="eh-workflow-card__number">0{index + 1}</span>
                  <span className="eh-workflow-card__icon"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="eh-container eh-cta">
          <div>
            <span className="eh-kicker">Sẵn sàng thu mua?</span>
            <h2>Mở dashboard để quản lý hợp đồng, ví và nhà cung cấp.</h2>
          </div>
          <button type="button" className="eh-btn eh-btn--primary" onClick={() => navigate("/enterprise")}>
            Đi đến dashboard <FiArrowRight />
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default EnterpriseHome;
