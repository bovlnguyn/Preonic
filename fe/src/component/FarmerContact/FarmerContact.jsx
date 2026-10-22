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
import Footer from "../Common/Footer";
import { COMPANY } from "../../constants";
import contactService from "../../services/contact.service";
import { useToast } from "../../contexts/ToastContext";
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
    title: "Hợp đồng & thanh toán",
    desc: "Giải thích quy trình thanh toán trực tiếp, hợp đồng bao tiêu và xử lý tranh chấp cơ bản.",
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
  const toast = useToast();
  const [form, setForm] = useState({
    topic: "product",
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    try {
      const result = await contactService.send({ audience: "farmer", ...form });
      setSubmitted(true);
      setForm((current) => ({ ...current, message: "" }));
      toast.success(result.message || "Yêu cầu hỗ trợ đã được gửi.");
    } catch (error) {
      toast.error(error?.message || "Không thể gửi yêu cầu lúc này.");
    } finally {
      setSubmitting(false);
    }
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
                Yêu cầu sẽ được gửi tới hộp thư hỗ trợ chính thức và bạn sẽ nhận
                email xác nhận ngay sau khi hệ thống tiếp nhận.
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
                  <option value="contract">Hợp đồng / thanh toán tiền hàng</option>
                  <option value="billing">Tài khoản nhận tiền / phí dịch vụ</option>
                  <option value="account">Tài khoản farmer</option>
                </select>
              </motion.label>

              <motion.label variants={fadeUp}>
                Họ tên
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nhập tên của bạn" required />
              </motion.label>

              <motion.label variants={fadeUp}>
                Email nhận phản hồi
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required />
              </motion.label>

              <motion.label variants={fadeUp}>
                Số điện thoại
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Nhập số điện thoại" required />
              </motion.label>

              <motion.label variants={fadeUp}>
                Nội dung
                <textarea name="message" value={form.message} onChange={handleChange} rows="5" minLength="10" maxLength="5000" placeholder="Mô tả ngắn vấn đề bạn cần hỗ trợ..." required />
              </motion.label>

              {submitted && (
                <motion.div className="fct-success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <FiCheckCircle /> Yêu cầu đã được gửi. Hãy kiểm tra email xác nhận.
                </motion.div>
              )}

              <motion.button type="submit" variants={fadeUp} disabled={submitting}>
                {submitting ? "Đang gửi..." : "Gửi yêu cầu hỗ trợ"} <FiSend />
              </motion.button>
            </motion.form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default FarmerContact;
