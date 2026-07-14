import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiHeadphones,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSend,
  FiShield,
} from "react-icons/fi";

import Header from "../Common/Header";
import { COMPANY } from "../../constants";
import "./FarmerContact.css";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const supportChannels = [
  {
    title: "Hỗ trợ đăng sản phẩm",
    desc: "Hướng dẫn farmer tạo mùa vụ, thêm ảnh, chứng nhận và thông tin thu hoạch.",
    icon: FiPackageHelp,
  },
  {
    title: "Hợp đồng & đặt cọc",
    desc: "Giải thích quy trình escrow, hợp đồng bao tiêu và xử lý tranh chấp cơ bản.",
    icon: FiShield,
  },
  {
    title: "Tài khoản farmer",
    desc: "Hỗ trợ cập nhật hồ sơ, thông tin liên hệ, vùng trồng và điểm uy tín.",
    icon: FiHeadphones,
  },
];

function FiPackageHelp(props) {
  return <FiMessageCircle {...props} />;
}

function FarmerContact() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    topic: "product",
    name: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const contactInfo = useMemo(() => [
    { label: "Email hỗ trợ", value: COMPANY.SUPPORT_EMAIL || COMPANY.EMAIL, icon: FiMail },
    { label: "Hotline", value: COMPANY.HOTLINE || "1900 xxxx", icon: FiPhone },
    { label: "Khu vực hỗ trợ", value: COMPANY.ADDRESS || "Việt Nam", icon: FiMapPin },
    { label: "Thời gian", value: "08:00 - 17:30, Thứ 2 - Thứ 7", icon: FiClock },
  ], []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="farmer-contact-page">
      <Header />

      <main>
        <section className="fct-hero">
          <div className="fct-container fct-hero-grid">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.span className="fct-eyebrow" variants={fadeUp}>
                <FiHeadphones /> Liên hệ hỗ trợ farmer
              </motion.span>
              <motion.h1 variants={fadeUp}>Cần hỗ trợ đăng nông sản, hợp đồng hoặc thanh toán?</motion.h1>
              <motion.p variants={fadeUp}>
                Trang liên hệ riêng cho farmer giúp bạn biết nên hỏi vấn đề gì, gửi yêu cầu hỗ trợ nhanh
                và quay lại dashboard khi cần thao tác trực tiếp trên dữ liệu mùa vụ.
              </motion.p>
              <motion.div className="fct-actions" variants={fadeUp}>
                <button type="button" className="fct-btn primary" onClick={() => navigate("/farmer")}>Vào dashboard <FiArrowRight /></button>
                <button type="button" className="fct-btn ghost" onClick={() => navigate("/farmer/create-product")}>Đăng sản phẩm <FiSend /></button>
              </motion.div>
            </motion.div>

            <motion.aside
              className="fct-info-card"
              initial={{ opacity: 0, x: 34, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.12 }}
            >
              <span>PreOnic Farmer Care</span>
              <h3>Kênh hỗ trợ chính</h3>
              {contactInfo.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="fct-info-row" key={item.label}>
                    <Icon />
                    <div>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                );
              })}
            </motion.aside>
          </div>
        </section>

        <section className="fct-section">
          <div className="fct-container fct-support-grid">
            {supportChannels.map((item) => {
              const Icon = item.icon;
              return (
                <motion.article className="fct-support-card" key={item.title} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
                  <Icon />
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="fct-section fct-form-section">
          <div className="fct-container fct-form-grid">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.span className="fct-kicker" variants={fadeUp}>Gửi yêu cầu</motion.span>
              <motion.h2 variants={fadeUp}>Mô tả vấn đề của bạn, đội hỗ trợ sẽ phản hồi theo kênh liên hệ.</motion.h2>
              <motion.p variants={fadeUp}>
                Form này hiện xử lý ở frontend để hoàn thiện giao diện. Khi backend có API support ticket,
                bạn chỉ cần thay hàm submit bằng lệnh gọi API thật.
              </motion.p>

              <motion.div className="fct-note" variants={fadeUp}>
                <FiCheckCircle />
                <span>Nếu vấn đề liên quan sản phẩm cụ thể, hãy vào dashboard và chuẩn bị mã/tên mùa vụ trước khi liên hệ.</span>
              </motion.div>
            </motion.div>

            <motion.form className="fct-form" onSubmit={handleSubmit} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.label variants={fadeUp}>
                Chủ đề cần hỗ trợ
                <select name="topic" value={form.topic} onChange={handleChange}>
                  <option value="product">Đăng bán / chỉnh sửa sản phẩm</option>
                  <option value="contract">Hợp đồng / đặt cọc</option>
                  <option value="wallet">Ví & thanh toán</option>
                  <option value="account">Tài khoản farmer</option>
                </select>
              </motion.label>

              <motion.label variants={fadeUp}>
                Họ tên
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nhập tên của bạn" />
              </motion.label>

              <motion.label variants={fadeUp}>
                Số điện thoại
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Nhập số điện thoại" />
              </motion.label>

              <motion.label variants={fadeUp}>
                Nội dung
                <textarea name="message" value={form.message} onChange={handleChange} rows="5" placeholder="Mô tả ngắn vấn đề bạn cần hỗ trợ..." />
              </motion.label>

              {submitted && (
                <motion.div className="fct-success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <FiCheckCircle /> Yêu cầu đã được ghi nhận ở giao diện demo.
                </motion.div>
              )}

              <motion.button type="submit" variants={fadeUp}>Gửi yêu cầu hỗ trợ <FiSend /></motion.button>
            </motion.form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FarmerContact;
