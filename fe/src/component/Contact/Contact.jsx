import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiCheckCircle, FiMail, FiMessageCircle, FiPhone, FiSend } from "react-icons/fi";

import Header from "../Common/Header";
import Footer from "../Common/Footer";
import contactService from "../../services/contact.service";
import { useToast } from "../../contexts/ToastContext";
import { COMPANY } from "../../constants";
import "./Contact.css";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

function Contact() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ topic: "account", name: "", email: "", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSubmitted(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    try {
      const result = await contactService.send({ audience: "public", ...form });
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
    <div className="public-contact-page public-contact-page--compact">
      <Header />
      <motion.section className="pc-page-hero" initial="hidden" animate="show" variants={fadeUp}>
        <div className="pc-container pc-page-hero__inner">
          <span className="pc-page-hero__eyebrow"><FiMessageCircle /> Kết nối cùng Farmora</span>
          <h1>Liên hệ và nhận tư vấn</h1>
          <p>Một kênh hỗ trợ thống nhất cho tài khoản, nguồn cung, hợp đồng và thanh toán.</p>
        </div>
      </motion.section>
      <main className="pc-compact-main">
        <div className="pc-container pc-compact-layout">
          <motion.section className="pc-compact-copy" initial="hidden" animate="show" variants={fadeUp}>
            <span className="pc-compact-kicker"><FiMessageCircle /> Liên hệ Farmora</span>
            <h2>Hãy nói cho chúng tôi điều bạn cần.</h2>
            <p>Gửi thông tin qua biểu mẫu. Đội ngũ Farmora sẽ xem xét và phản hồi trực tiếp qua email bạn cung cấp.</p>
            <div className="pc-support-links">
              <a href={`mailto:${COMPANY.SUPPORT_EMAIL}`}><FiMail /> {COMPANY.SUPPORT_EMAIL}</a>
              <a href={`tel:${COMPANY.HOTLINE}`}><FiPhone /> {COMPANY.HOTLINE}</a>
            </div>
          </motion.section>

          <motion.form
            className="pc-request-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          >
            <div className="pc-form-heading">
              <span>Biểu mẫu liên hệ</span>
              <h2>Gửi yêu cầu cho Farmora</h2>
            </div>

            <div className="pc-form-row">
              <label>
                Chủ đề
                <select name="topic" value={form.topic} onChange={handleChange}>
                  <option value="account">Tài khoản và hồ sơ</option>
                  <option value="product">Sản phẩm và nguồn cung</option>
                  <option value="contract">Hợp đồng và đơn hàng</option>
                  <option value="payment">Thanh toán và phí dịch vụ</option>
                  <option value="other">Vấn đề khác</option>
                </select>
              </label>
              <label>
                Họ tên
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nhập họ tên" required />
              </label>
            </div>

            <label>
              Email liên hệ
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required />
            </label>

            <label>
              Nội dung
              <textarea name="message" value={form.message} onChange={handleChange} rows="6" minLength="10" maxLength="5000" placeholder="Mô tả ngắn vấn đề bạn cần hỗ trợ..." required />
            </label>

            <AnimatePresence>
              {submitted && (
                <motion.div className="pc-success-notice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <FiCheckCircle /><span>Yêu cầu đã được gửi. Hãy kiểm tra email để xem phản hồi.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="pc-submit" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi yêu cầu"} <FiSend />
            </button>
          </motion.form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Contact;
