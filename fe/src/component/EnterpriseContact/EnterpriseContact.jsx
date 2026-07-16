import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSend,
  FiUsers,
} from "react-icons/fi";
import Header from "../Common/Header";
import "./EnterpriseContact.css";

const contactCards = [
  { icon: FiPhone, title: "Hotline thu mua", value: "1900 8899", desc: "Tư vấn quy trình hợp đồng và đặt cọc." },
  { icon: FiMail, title: "Email hỗ trợ", value: "enterprise@preonic.vn", desc: "Phản hồi trong vòng 24 giờ làm việc." },
  { icon: FiMapPin, title: "Văn phòng điều phối", value: "Đà Nẵng, Việt Nam", desc: "Kết nối vùng cung ứng miền Trung - Tây Nguyên." },
];

const faqs = [
  "Doanh nghiệp có thể lọc nguồn cung theo chứng chỉ và vùng miền không?",
  "Quy trình đặt cọc/escrow hoạt động như thế nào?",
  "Khi farmer chưa giao đủ sản lượng thì xử lý ra sao?",
  "Backend sau này cần API nào để nối phần liên hệ?",
];

function EnterpriseContact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="enterprise-contact-page">
      <Header />

      <main>
        <section className="ec-hero">
          <div className="ec-container ec-hero__grid">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="ec-eyebrow"><FiMessageCircle /> Enterprise support center</span>
              <h1>Kết nối với PreOnic để triển khai quy trình thu mua hiệu quả hơn.</h1>
              <p>
                Trang liên hệ dành riêng cho doanh nghiệp, tập trung vào nhu cầu tìm nguồn cung, hợp đồng, đặt cọc, thanh toán và quản lý đối tác farmer.
              </p>
            </motion.div>

            <motion.div className="ec-response-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.1 }}>
              <FiClock />
              <strong>Phản hồi ưu tiên</strong>
              <span>Đội ngũ PreOnic sẽ hỗ trợ doanh nghiệp trong ngày làm việc.</span>
            </motion.div>
          </div>
        </section>

        <section className="ec-container ec-card-grid">
          {contactCards.map(({ icon: Icon, title, value, desc }, index) => (
            <motion.article key={title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }}>
              <Icon />
              <h3>{title}</h3>
              <strong>{value}</strong>
              <p>{desc}</p>
            </motion.article>
          ))}
        </section>

        <section className="ec-container ec-contact-grid">
          <motion.form className="ec-form" onSubmit={handleSubmit} initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="ec-eyebrow ec-eyebrow--blue"><FiSend /> Gửi yêu cầu tư vấn</span>
            <h2>Cho PreOnic biết nhu cầu thu mua của bạn.</h2>

            <div className="ec-field-row">
              <label>
                Tên doanh nghiệp
                <input placeholder="Ví dụ: Công ty TNHH Green Export" required />
              </label>
              <label>
                Người phụ trách
                <input placeholder="Họ và tên" required />
              </label>
            </div>

            <div className="ec-field-row">
              <label>
                Email
                <input type="email" placeholder="name@company.com" required />
              </label>
              <label>
                Số điện thoại
                <input placeholder="09xx xxx xxx" required />
              </label>
            </div>

            <label>
              Nhu cầu chính
              <select defaultValue="">
                <option value="" disabled>Chọn nhu cầu</option>
                <option>Tìm nguồn cung theo mùa vụ</option>
                <option>Tạo hợp đồng thu mua</option>
                <option>Tư vấn đặt cọc/escrow</option>
                <option>Kết nối farmer uy tín</option>
              </select>
            </label>

            <label>
              Mô tả thêm
              <textarea rows="5" placeholder="Nhập sản phẩm, sản lượng, khu vực, thời gian cần thu mua..." />
            </label>

            <button type="submit">Gửi yêu cầu <FiArrowRight /></button>

            {submitted && (
              <motion.div className="ec-success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <FiCheckCircle /> Mock submit thành công. Sau này form này có thể gọi API contact/request-consultation.
              </motion.div>
            )}
          </motion.form>

          <motion.aside className="ec-side" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="ec-side__team">
              <FiUsers />
              <h2>Đội hỗ trợ doanh nghiệp</h2>
              <p>
                Phối hợp giữa tư vấn nguồn cung, vận hành hợp đồng, thanh toán trung gian và chăm sóc đối tác sau giao dịch.
              </p>
            </div>

            <div className="ec-faq">
              <h3>Câu hỏi thường gặp</h3>
              {faqs.map((item) => (
                <div key={item}><FiCheckCircle /><span>{item}</span></div>
              ))}
            </div>
          </motion.aside>
        </section>
      </main>
    </div>
  );
}

export default EnterpriseContact;
