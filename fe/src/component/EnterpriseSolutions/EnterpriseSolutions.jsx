import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiRefreshCw,
  FiShield,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import Header from "../Common/Header";
import "./EnterpriseSolutions.css";

const solutions = [
  {
    icon: FiLayers,
    title: "Sourcing theo mùa vụ",
    desc: "Tập trung nguồn cung theo mùa, khu vực, chứng chỉ và khả năng giao hàng để doanh nghiệp không phải tìm rời rạc.",
  },
  {
    icon: FiFileText,
    title: "Hợp đồng thu mua số",
    desc: "Chuẩn hóa đề xuất hợp đồng, sản lượng, lịch giao, giá dự kiến và điều khoản đặt cọc trong một luồng rõ ràng.",
  },
  {
    icon: FiShield,
    title: "Escrow giảm rủi ro",
    desc: "Tiền đặt cọc được theo dõi minh bạch, giúp doanh nghiệp và farmer tin tưởng hơn trước khi giao dịch lớn.",
  },
  {
    icon: FiBarChart2,
    title: "Theo dõi hiệu suất cung ứng",
    desc: "Nắm tỷ lệ giao đúng hạn, chất lượng, đánh giá farmer và lịch sử giao dịch để ra quyết định tốt hơn.",
  },
];

const process = [
  "Xác định nhu cầu thu mua theo sản phẩm, khu vực và thời gian.",
  "Hệ thống gợi ý nguồn cung phù hợp từ farmer đã đăng sản phẩm/mùa vụ.",
  "Doanh nghiệp gửi đề xuất hợp đồng và đặt cọc qua escrow.",
  "Hai bên theo dõi giao hàng, thanh toán và đánh giá sau giao dịch.",
];

const enterpriseBenefits = [
  { icon: FiTruck, value: "-28%", label: "thời gian tìm nguồn cung" },
  { icon: FiRefreshCw, value: "2.4x", label: "tốc độ xử lý hợp đồng" },
  { icon: FiUsers, value: "18+", label: "nhà cung cấp tiềm năng" },
  { icon: FiCreditCard, value: "100%", label: "theo dõi đặt cọc minh bạch" },
];

function EnterpriseSolutions() {
  const navigate = useNavigate();

  return (
    <div className="enterprise-solutions-page">
      <Header />

      <main>
        <section className="es-hero">
          <div className="es-container es-hero__grid">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="es-eyebrow"><FiShield /> Enterprise supply solutions</span>
              <h1>Giải pháp thu mua nông sản số dành cho doanh nghiệp.</h1>
              <p>
                Thay vì chỉ xem danh sách sản phẩm, doanh nghiệp có một quy trình đầy đủ: tìm nguồn cung, đánh giá farmer, tạo hợp đồng, đặt cọc và quản trị rủi ro trong dashboard.
              </p>
              <div className="es-hero__actions">
                <button type="button" onClick={() => navigate("/enterprise-products")}>Tìm nguồn cung <FiArrowRight /></button>
                <button type="button" className="ghost" onClick={() => navigate("/enterprise")}>Mở dashboard</button>
              </div>
            </motion.div>

            <motion.div className="es-orbit-card" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }}>
              <div className="es-orbit-card__center"><FiLayers /><strong>PreOnic</strong></div>
              <span className="point point-1">Nguồn cung</span>
              <span className="point point-2">Hợp đồng</span>
              <span className="point point-3">Escrow</span>
              <span className="point point-4">Đánh giá</span>
            </motion.div>
          </div>
        </section>

        <section className="es-container es-benefits">
          {enterpriseBenefits.map(({ icon: Icon, value, label }) => (
            <motion.article key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Icon />
              <strong>{value}</strong>
              <span>{label}</span>
            </motion.article>
          ))}
        </section>

        <section className="es-container es-solutions-grid">
          {solutions.map(({ icon: Icon, title, desc }, index) => (
            <motion.article
              className="es-solution-card"
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.06 }}
            >
              <span><Icon /></span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.article>
          ))}
        </section>

        <section className="es-process-section">
          <div className="es-container es-process-grid">
            <motion.div className="es-process-copy" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="es-eyebrow es-eyebrow--light"><FiCheckCircle /> Quy trình đề xuất</span>
              <h2>Luồng nghiệp vụ rõ ràng để backend dễ nối dữ liệu sau này.</h2>
              <p>
                Phần frontend hiện dùng mock data để trình bày giao diện. Khi backend hoàn thiện,
                mỗi bước có thể lấy dữ liệu từ products, contracts, escrow, transactions và reviews.
              </p>
            </motion.div>

            <div className="es-process-list">
              {process.map((item, index) => (
                <motion.div
                  key={item}
                  className="es-process-item"
                  initial={{ opacity: 0, x: 26 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <strong>0{index + 1}</strong>
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="es-container es-cta">
          <div>
            <h2>Muốn kiểm tra chi tiết hợp đồng và nhà cung cấp?</h2>
            <p>Vào dashboard enterprise để quản lý quy trình thu mua chuyên sâu hơn.</p>
          </div>
          <button type="button" onClick={() => navigate("/enterprise")}>Vào dashboard <FiArrowRight /></button>
        </section>
      </main>
    </div>
  );
}

export default EnterpriseSolutions;
