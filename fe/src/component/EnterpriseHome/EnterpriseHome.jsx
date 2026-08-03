import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiCreditCard,
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

function EnterpriseHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = getFirstName(user?.fullName || user?.name || user?.email);

  const [totalSupplies, setTotalSupplies] = useState(null);
  const [featuredSupplies, setFeaturedSupplies] = useState([]);
  const [contractCount, setContractCount] = useState(null);
  const [onTimeRate, setOnTimeRate] = useState(null);
  const [supplierCount, setSupplierCount] = useState(null);

  useEffect(() => {
    productService
      .getProducts({ sort: "rating", limit: 3 })
      .then((res) => {
        setFeaturedSupplies(res?.data || []);
        setTotalSupplies(res?.pagination?.total ?? 0);
      })
      .catch(() => {});

    contractService
      .list()
      .then((res) => {
        const list = res?.data?.contracts;
        const contracts = Array.isArray(list) ? list : [];
        setContractCount(contracts.length);
        setOnTimeRate(onTimeDeliveryRate(contracts));
      })
      .catch(() => {});

    supplierService
      .list()
      .then((res) => {
        const list = res?.data?.suppliers;
        setSupplierCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {});
  }, []);

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

          <motion.div className="eh-supply-list" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            {featuredSupplies.length === 0 ? (
              <motion.p variants={fadeUp} className="eh-supply-empty">Chưa có nguồn cung nào phù hợp.</motion.p>
            ) : (
              featuredSupplies.map((item) => (
                <motion.article className="eh-supply-card" key={item.id} variants={fadeUp}>
                  <div className="eh-supply-card__top">
                    <div>
                      <h3>{item.name}</h3>
                      <span><FiMapPin /> {REGION_LABEL[item.region] || item.region}</span>
                    </div>
                    <strong>{formatSupplyPrice(item)}</strong>
                  </div>
                  <div className="eh-supply-card__meta">
                    <span>Sản lượng: <b>{item.totalQuantity ? `${formatPrice(item.totalQuantity)} ${item.unit || ""}` : "Chưa cập nhật"}</b></span>
                    <span>Nông dân: <b>{item.sellerName || "Chưa cập nhật"}</b></span>
                  </div>
                  <div className="eh-progress">
                    <span style={{ width: `${item.rating > 0 ? (item.rating / 5) * 100 : 0}%` }} />
                  </div>
                  <button type="button" onClick={() => navigate("/enterprise-products")}>
                    Kiểm tra nguồn cung <FiArrowRight />
                  </button>
                </motion.article>
              ))
            )}
          </motion.div>
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
