import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiCheckCircle,
  FiCloudRain,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiPackage,
  FiSearch,
  FiShield,
  FiStar,
  FiTruck,
  FiUsers,
} from "react-icons/fi";

import Header from "../Common/Header";
import Footer from "../Common/Footer";
import fieldImage from "../../assets/home/PD2.jpg";
import supplyImage from "../../assets/home/PD3.jpg";
import "./Solutions.css";

const roleContent = {
  farmer: {
    label: "Dành cho Farmer",
    eyebrow: "Quản lý mùa vụ và đầu ra",
    title: "Biến thông tin mùa vụ thành cơ hội hợp tác rõ ràng.",
    description:
      "PreOnic hỗ trợ nông dân chuẩn hóa sản phẩm, tiếp cận doanh nghiệp, theo dõi hợp đồng và nhận thanh toán trong một quy trình thống nhất.",
    image: fieldImage,
    imageAlt: "Nông sản và mùa vụ của farmer",
    features: [
      {
        icon: FiPackage,
        title: "Đăng mùa vụ chuyên nghiệp",
        description: "Công khai sản lượng, thời gian thu hoạch, vùng trồng, hình ảnh và chứng nhận liên quan.",
      },
      {
        icon: FiFileText,
        title: "Theo dõi hợp đồng",
        description: "Nắm điều khoản, tiến độ ký kết, lịch giao hàng và trạng thái thực hiện hợp đồng.",
      },
      {
        icon: FiCreditCard,
        title: "Ví và thanh toán",
        description: "Theo dõi khoản đặt cọc, dòng tiền và lịch sử giao dịch ngay trong tài khoản.",
      },
      {
        icon: FiCloudRain,
        title: "Thời tiết và bảo vệ mùa vụ",
        description: "Tham khảo cảnh báo thời tiết và thông tin bảo hiểm để chủ động quản lý rủi ro.",
      },
    ],
  },
  enterprise: {
    label: "Dành cho Enterprise",
    eyebrow: "Tìm nguồn cung và quản trị thu mua",
    title: "Tìm đúng nguồn cung, quản lý tốt toàn bộ giao dịch.",
    description:
      "Doanh nghiệp có thể khám phá nguồn hàng theo mùa vụ, đánh giá farmer, tạo hợp đồng và theo dõi thanh toán minh bạch trước khi ra quyết định thu mua.",
    image: supplyImage,
    imageAlt: "Nguồn cung nông sản dành cho doanh nghiệp",
    features: [
      {
        icon: FiSearch,
        title: "Tìm nguồn cung phù hợp",
        description: "Khám phá sản phẩm theo loại nông sản, khu vực, sản lượng và thời gian thu hoạch.",
      },
      {
        icon: FiUsers,
        title: "Đánh giá nhà cung cấp",
        description: "Xem hồ sơ, lịch sử hợp tác và điểm đánh giá trước khi gửi đề xuất thu mua.",
      },
      {
        icon: FiLayers,
        title: "Quản lý hợp đồng tập trung",
        description: "Theo dõi nhiều hợp đồng, đơn hàng và trạng thái giao nhận trên cùng một dashboard.",
      },
      {
        icon: FiBarChart2,
        title: "Dữ liệu hỗ trợ quyết định",
        description: "Tổng hợp giao dịch và hiệu suất nguồn cung để doanh nghiệp lập kế hoạch tốt hơn.",
      },
    ],
  },
};

const platformSolutions = [
  {
    icon: FiPackage,
    title: "Thị trường nông sản số",
    description: "Kết nối thông tin mùa vụ của farmer với nhu cầu tìm nguồn cung của doanh nghiệp.",
  },
  {
    icon: FiFileText,
    title: "Hợp đồng minh bạch",
    description: "Chuẩn hóa điều khoản, sản lượng, lịch giao và tiến độ xác nhận giữa hai bên.",
  },
  {
    icon: FiShield,
    title: "Thanh toán trung gian",
    description: "Theo dõi tiền đặt cọc và các mốc thanh toán nhằm giảm rủi ro trong giao dịch.",
  },
  {
    icon: FiTruck,
    title: "Theo dõi đơn hàng",
    description: "Cập nhật trạng thái thực hiện, giao nhận và hoàn tất giao dịch theo từng hợp đồng.",
  },
  {
    icon: FiStar,
    title: "Uy tín đối tác",
    description: "Đánh giá sau giao dịch để xây dựng cộng đồng cung ứng có trách nhiệm và đáng tin cậy.",
  },
  {
    icon: FiCloudRain,
    title: "Dữ liệu hỗ trợ nông nghiệp",
    description: "Kết hợp thời tiết, cảnh báo và AI để người dùng tham khảo trước khi hành động.",
  },
];

const journey = [
  {
    step: "01",
    title: "Tạo tài khoản theo vai trò",
    description: "Đăng ký Farmer hoặc Enterprise để hệ thống mở đúng không gian làm việc.",
  },
  {
    step: "02",
    title: "Hoàn thiện hồ sơ",
    description: "Cập nhật thông tin vùng trồng, doanh nghiệp, liên hệ và năng lực giao dịch.",
  },
  {
    step: "03",
    title: "Kết nối và thương lượng",
    description: "Farmer đăng nguồn hàng; Enterprise tìm sản phẩm và gửi đề xuất hợp tác.",
  },
  {
    step: "04",
    title: "Thực hiện giao dịch",
    description: "Hai bên quản lý hợp đồng, đặt cọc, giao hàng, thanh toán và đánh giá.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function Solutions() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState("farmer");
  const activeContent = roleContent[activeRole];

  return (
    <div className="public-solutions-page">
      <Header />

      <main>
        <section className="ps-hero">
          <div className="ps-hero__pattern" />
          <div className="ps-container ps-hero__grid">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.span className="ps-eyebrow" variants={fadeUp}>
                <FiCheckCircle /> Hệ sinh thái giao dịch nông nghiệp số
              </motion.span>
              <motion.h1 variants={fadeUp}>
                Một nền tảng chung cho <span>mùa vụ, nguồn cung và hợp đồng.</span>
              </motion.h1>
              <motion.p variants={fadeUp}>
                PreOnic giúp khách truy cập hiểu toàn bộ quy trình trước khi tham gia. Khi cần đăng sản phẩm,
                tạo hợp đồng hoặc quản lý giao dịch thật, người dùng chỉ cần đăng ký và đăng nhập theo đúng vai trò.
              </motion.p>
              <motion.div className="ps-hero__actions" variants={fadeUp}>
                <button className="ps-btn ps-btn--primary" type="button" onClick={() => navigate("/register")}>
                  Bắt đầu với PreOnic <FiArrowRight />
                </button>
                <button className="ps-btn ps-btn--glass" type="button" onClick={() => navigate("/products")}>
                  Xem nguồn nông sản
                </button>
              </motion.div>
              <motion.div className="ps-hero__trust" variants={fadeUp}>
                <span><FiCheck /> Xem thông tin không cần tài khoản</span>
                <span><FiCheck /> Đăng nhập khi cần thao tác</span>
                <span><FiCheck /> Không gian riêng theo vai trò</span>
              </motion.div>
            </motion.div>

            <motion.div
              className="ps-hero__visual"
              initial={{ opacity: 0, x: 42, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.72, ease: "easeOut", delay: 0.12 }}
            >
              <div className="ps-network-card">
                <div className="ps-network-card__top">
                  <span>Nền tảng PreOnic</span>
                  <strong>Chuỗi giao dịch kết nối</strong>
                </div>
                <div className="ps-network-flow">
                  <div><FiUsers /><span>Farmer</span></div>
                  <i />
                  <div className="active"><FiLayers /><span>PreOnic</span></div>
                  <i />
                  <div><FiTruck /><span>Enterprise</span></div>
                </div>
                <div className="ps-network-metrics">
                  <article><strong>01</strong><span>Nguồn cung</span></article>
                  <article><strong>02</strong><span>Hợp đồng</span></article>
                  <article><strong>03</strong><span>Thanh toán</span></article>
                </div>
              </div>
              <motion.div
                className="ps-floating-note ps-floating-note--one"
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <FiShield /> Giao dịch rõ ràng
              </motion.div>
              <motion.div
                className="ps-floating-note ps-floating-note--two"
                animate={{ y: [0, 9, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <FiBarChart2 /> Dữ liệu tập trung
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="ps-section ps-platform">
          <div className="ps-container">
            <div className="ps-section__head">
              <span>Giải pháp trên nền tảng</span>
              <h2>Những thành phần tạo nên một giao dịch nông sản đáng tin cậy.</h2>
              <p>
                Mỗi module được thiết kế để hỗ trợ một bước trong quá trình từ công khai nguồn hàng đến hoàn tất hợp tác.
              </p>
            </div>

            <motion.div
              className="ps-solution-grid"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.14 }}
            >
              {platformSolutions.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="ps-solution-card" key={item.title} variants={fadeUp}>
                    <span className="ps-solution-card__icon"><Icon /></span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="ps-section ps-role-section">
          <div className="ps-container">
            <div className="ps-role-head">
              <div>
                <span>Khám phá theo vai trò</span>
                <h2>PreOnic thay đổi cách làm việc của từng nhóm người dùng.</h2>
              </div>
              <div className="ps-role-switch" role="tablist" aria-label="Chọn vai trò">
                {Object.entries(roleContent).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    className={activeRole === key ? "active" : ""}
                    onClick={() => setActiveRole(key)}
                    role="tab"
                    aria-selected={activeRole === key}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                className="ps-role-panel"
                key={activeRole}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.34 }}
              >
                <div className="ps-role-panel__visual">
                  <img src={activeContent.image} alt={activeContent.imageAlt} />
                  <div className="ps-role-panel__visual-copy">
                    <span>{activeContent.eyebrow}</span>
                    <strong>{activeRole === "farmer" ? "Chủ động đầu ra" : "Chủ động nguồn cung"}</strong>
                  </div>
                </div>

                <div className="ps-role-panel__content">
                  <span className="ps-kicker">{activeContent.label}</span>
                  <h3>{activeContent.title}</h3>
                  <p>{activeContent.description}</p>
                  <div className="ps-role-feature-grid">
                    {activeContent.features.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <article key={feature.title}>
                          <Icon />
                          <div>
                            <strong>{feature.title}</strong>
                            <span>{feature.description}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <button type="button" className="ps-inline-link" onClick={() => navigate("/register")}>
                    Tạo tài khoản {activeRole === "farmer" ? "Farmer" : "Enterprise"} <FiArrowRight />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section className="ps-section ps-journey-section">
          <div className="ps-container ps-journey-layout">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <motion.span className="ps-kicker" variants={fadeUp}>Bắt đầu như thế nào?</motion.span>
              <motion.h2 variants={fadeUp}>Từ khách truy cập đến một giao dịch hoàn chỉnh trong bốn bước.</motion.h2>
              <motion.p variants={fadeUp}>
                Các trang công khai giúp bạn tìm hiểu trước. Toàn bộ dữ liệu và chức năng thao tác sẽ chỉ xuất hiện sau khi đăng nhập.
              </motion.p>
              <motion.button className="ps-btn ps-btn--primary" type="button" onClick={() => navigate("/auth")} variants={fadeUp}>
                Đăng nhập để sử dụng <FiArrowRight />
              </motion.button>
            </motion.div>

            <motion.div className="ps-journey-list" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {journey.map((item) => (
                <motion.article key={item.step} variants={fadeUp}>
                  <span>{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="ps-final-cta">
          <div className="ps-container ps-final-cta__card">
            <div>
              <span><FiShield /> Xem trước, trải nghiệm sau khi đăng nhập</span>
              <h2>Sẵn sàng kết nối với hệ sinh thái nông nghiệp số PreOnic?</h2>
            </div>
            <div className="ps-final-cta__actions">
              <button type="button" className="ps-btn ps-btn--light" onClick={() => navigate("/register")}>Đăng ký miễn phí</button>
              <button type="button" className="ps-btn ps-btn--outline-light" onClick={() => navigate("/contact")}>Liên hệ tư vấn</button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Solutions;
