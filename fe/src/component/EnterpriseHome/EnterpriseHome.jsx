import React from "react";
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
import { useAuth } from "../../contexts/AuthContext";
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

const procurementStats = [
  { label: "Nguồn cung phù hợp", value: "24", icon: FiPackage, tone: "blue" },
  { label: "Đề xuất hợp đồng", value: "08", icon: FiFileText, tone: "green" },
  { label: "Tỷ lệ giao đúng hạn", value: "96%", icon: FiTruck, tone: "gold" },
  { label: "Đối tác uy tín", value: "18", icon: FiUsers, tone: "cyan" },
];

const featuredSupplies = [
  {
    crop: "Sầu riêng Ri6",
    region: "Đắk Lắk",
    volume: "35 tấn",
    price: "72.000đ/kg",
    quality: "VietGAP",
    progress: 82,
  },
  {
    crop: "Xoài cát Hòa Lộc",
    region: "Đồng Tháp",
    volume: "18 tấn",
    price: "38.000đ/kg",
    quality: "GlobalG.A.P",
    progress: 68,
  },
  {
    crop: "Cà phê Robusta",
    region: "Lâm Đồng",
    volume: "50 tấn",
    price: "62.500đ/kg",
    quality: "Organic",
    progress: 91,
  },
];

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

function EnterpriseHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = getFirstName(user?.fullName || user?.name || user?.email);

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
                  <strong>24 sản phẩm</strong>
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
              Dữ liệu dưới đây đang là mock data để hiển thị giao diện. Khi backend hoàn thiện,
              phần này có thể lấy từ API danh sách sản phẩm, hợp đồng và hồ sơ farmer.
            </motion.p>
          </motion.div>

          <motion.div className="eh-supply-list" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            {featuredSupplies.map((item) => (
              <motion.article className="eh-supply-card" key={item.crop} variants={fadeUp}>
                <div className="eh-supply-card__top">
                  <div>
                    <h3>{item.crop}</h3>
                    <span><FiMapPin /> {item.region}</span>
                  </div>
                  <strong>{item.price}</strong>
                </div>
                <div className="eh-supply-card__meta">
                  <span>Sản lượng: <b>{item.volume}</b></span>
                  <span>Chứng chỉ: <b>{item.quality}</b></span>
                </div>
                <div className="eh-progress">
                  <span style={{ width: `${item.progress}%` }} />
                </div>
                <button type="button" onClick={() => navigate("/enterprise-products")}>
                  Kiểm tra nguồn cung <FiArrowRight />
                </button>
              </motion.article>
            ))}
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
    </div>
  );
}

export default EnterpriseHome;
