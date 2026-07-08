import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiCloudRain,
  FiCreditCard,
  FiFileText,
  FiPackage,
  FiShield,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";

import Header from "../Common/Header";
import { COMPANY } from "../../constants";
import "./FarmerSolutions.css";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const solutions = [
  {
    title: "Đăng mùa vụ chuyên nghiệp",
    desc: "Chuẩn hóa thông tin nông sản, sản lượng, ngày thu hoạch, chứng nhận và hình ảnh để doanh nghiệp đánh giá nhanh hơn.",
    icon: FiPackage,
    to: "/farmer/create-product",
  },
  {
    title: "Ký hợp đồng bao tiêu",
    desc: "Nhận đề xuất từ doanh nghiệp, theo dõi điều khoản, tiến độ hợp đồng và giảm rủi ro mua bán miệng.",
    icon: FiFileText,
    to: "/farmer/contracts",
  },
  {
    title: "Đặt cọc qua escrow",
    desc: "Tiền cọc được quản lý trung gian, giúp farmer yên tâm chuẩn bị hàng và doanh nghiệp yên tâm nguồn cung.",
    icon: FiShield,
    to: "/farmer/escrow",
  },
  {
    title: "Ví & thanh toán",
    desc: "Theo dõi số dư, thanh toán, lịch sử giao dịch và doanh thu từ các đơn hàng nông sản.",
    icon: FiCreditCard,
    to: "/farmer/wallet",
  },
  {
    title: "Đánh giá đối tác",
    desc: "Xây dựng uy tín sau giao dịch, nhận phản hồi và tăng khả năng được doanh nghiệp lựa chọn ở mùa vụ sau.",
    icon: FiStar,
    to: "/farmer/ratings",
  },
  {
    title: "Thời tiết & bảo hiểm",
    desc: "Theo dõi rủi ro thời tiết, chương trình bảo hiểm và thông tin hỗ trợ bảo vệ mùa vụ.",
    icon: FiCloudRain,
    to: "/farmer/weather-insurance",
  },
];

const roadmap = [
  { step: "01", title: "Chuẩn bị hồ sơ", desc: "Cập nhật thông tin tài khoản, vùng trồng và dữ liệu mùa vụ." },
  { step: "02", title: "Đăng nông sản", desc: "Đưa sản phẩm lên sàn với hình ảnh, sản lượng và thời gian thu hoạch." },
  { step: "03", title: "Nhận đề xuất", desc: "Doanh nghiệp tìm nguồn cung, gửi hợp đồng hoặc thương lượng điều khoản." },
  { step: "04", title: "Giao dịch an toàn", desc: "Escrow giữ cọc, farmer giao hàng và nhận thanh toán sau nghiệm thu." },
];

function FarmerSolutions() {
  const navigate = useNavigate();

  return (
    <div className="farmer-solutions-page">
      <Header />

      <main>
        <section className="fsol-hero">
          <div className="fsol-container fsol-hero-grid">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.span className="fsol-eyebrow" variants={fadeUp}>
                <FiCheckCircle /> Giải pháp dành riêng cho farmer
              </motion.span>
              <motion.h1 variants={fadeUp}>Từ mùa vụ ngoài đồng đến hợp đồng minh bạch trên PreOnic.</motion.h1>
              <motion.p variants={fadeUp}>
                Farmer không chỉ đăng bán nông sản, mà còn có một bộ công cụ để chuẩn hóa sản phẩm,
                quản lý hợp đồng, đặt cọc, ví thanh toán, đánh giá đối tác và bảo vệ mùa vụ.
              </motion.p>
              <motion.div className="fsol-actions" variants={fadeUp}>
                <button type="button" className="fsol-btn primary" onClick={() => navigate("/farmer")}>Vào dashboard <FiArrowRight /></button>
                <button type="button" className="fsol-btn ghost" onClick={() => navigate("/farmer/create-product")}>Bắt đầu đăng bán <FiPackage /></button>
              </motion.div>
            </motion.div>

            <motion.div
              className="fsol-panel"
              initial={{ opacity: 0, x: 34, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.12 }}
            >
              <span>Farmer Operating System</span>
              <h3>Một luồng làm việc thống nhất</h3>
              <div className="fsol-panel-graph">
                <i />
                <i />
                <i />
              </div>
              <p>{COMPANY.NAME} giúp farmer chuyển từ bán rời rạc sang quản lý giao dịch có dữ liệu, có hợp đồng và có bảo vệ thanh toán.</p>
            </motion.div>
          </div>
        </section>

        <section className="fsol-section">
          <div className="fsol-container">
            <div className="fsol-section-head">
              <span>Module chính</span>
              <h2>Bộ giải pháp farmer đang có trong hệ thống</h2>
            </div>

            <motion.div className="fsol-grid" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }} variants={stagger}>
              {solutions.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="fsol-card" key={item.title} variants={fadeUp}>
                    <div className="fsol-card-icon"><Icon /></div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <button type="button" onClick={() => navigate(item.to)}>Mở chức năng <FiArrowRight /></button>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="fsol-section fsol-roadmap-section">
          <div className="fsol-container fsol-roadmap-grid">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.span className="fsol-section-kicker" variants={fadeUp}>Quy trình đề xuất</motion.span>
              <motion.h2 variants={fadeUp}>Farmer nên đi theo 4 bước để giao dịch hiệu quả.</motion.h2>
              <motion.p variants={fadeUp}>
                Cách trình bày này giúp người dùng mới hiểu ngay PreOnic hoạt động thế nào,
                đồng thời vẫn có nút dẫn về dashboard để thao tác thật.
              </motion.p>
            </motion.div>

            <motion.div className="fsol-roadmap" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              {roadmap.map((item) => (
                <motion.div className="fsol-roadmap-item" key={item.step} variants={fadeUp}>
                  <span>{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="fsol-final-cta">
          <div className="fsol-container fsol-final-card">
            <div>
              <span><FiBarChart2 /> Sẵn sàng vận hành mùa vụ?</span>
              <h2>Quay lại dashboard để quản lý dữ liệu thật của bạn.</h2>
            </div>
            <button type="button" onClick={() => navigate("/farmer")}>Mở farmer dashboard <FiArrowRight /></button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FarmerSolutions;
