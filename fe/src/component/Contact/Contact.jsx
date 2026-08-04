import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiFileText,
  FiHeadphones,
  FiHelpCircle,
  FiLock,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSend,
  FiShield,
  FiUserCheck,
} from "react-icons/fi";

import Header from "../Common/Header";
import Footer from "../Common/Footer";
import { COMPANY } from "../../constants";
import "./Contact.css";

const supportAreas = [
  {
    icon: FiUserCheck,
    title: "Tài khoản và hồ sơ",
    description: "Tìm hiểu cách đăng ký Farmer hoặc Enterprise, xác thực thông tin và cập nhật hồ sơ.",
  },
  {
    icon: FiFileText,
    title: "Sản phẩm và hợp đồng",
    description: "Được hướng dẫn về đăng nguồn hàng, tìm sản phẩm, gửi đề xuất và theo dõi hợp đồng.",
  },
  {
    icon: FiShield,
    title: "Escrow và thanh toán",
    description: "Hiểu quy trình đặt cọc, trạng thái thanh toán và các bước xử lý khi phát sinh vấn đề.",
  },
  {
    icon: FiMessageCircle,
    title: "Hỗ trợ sử dụng hệ thống",
    description: "Nhận định hướng tới đúng màn hình và chức năng dựa trên vai trò tài khoản của bạn.",
  },
];

const faqs = [
  {
    question: "Tôi có thể xem sản phẩm khi chưa đăng nhập không?",
    answer: "Có. Khách có thể xem danh sách, thông tin sản phẩm và các trang giới thiệu. Các thao tác quản lý, tạo hợp đồng hoặc thanh toán yêu cầu tài khoản phù hợp.",
  },
  {
    question: "Farmer và Enterprise có dùng chung dashboard không?",
    answer: "Không. Sau khi đăng nhập, hệ thống xác định vai trò và chuyển người dùng đến không gian làm việc riêng với chức năng tương ứng.",
  },
  {
    question: "AI nông nghiệp có tự thực hiện giao dịch không?",
    answer: "Không. AI chỉ hỗ trợ tra cứu, giải thích và gợi ý. Người dùng vẫn phải kiểm tra và trực tiếp xác nhận các thao tác quan trọng.",
  },
  {
    question: "Tôi cần làm gì khi gặp vấn đề với hợp đồng hoặc thanh toán?",
    answer: "Hãy đăng nhập để đội hỗ trợ có thể xác định tài khoản, vai trò và giao dịch liên quan. Sau đó gửi yêu cầu với mã hợp đồng hoặc thông tin cần kiểm tra.",
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

function Contact() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const [showLoginNotice, setShowLoginNotice] = useState(false);
  const [form, setForm] = useState({
    topic: "account",
    name: "",
    email: "",
    message: "",
  });

  const contactInfo = useMemo(
    () => [
      { icon: FiMail, label: "Email hỗ trợ", value: COMPANY.SUPPORT_EMAIL },
      { icon: FiPhone, label: "Hotline", value: COMPANY.HOTLINE },
      { icon: FiMapPin, label: "Văn phòng", value: COMPANY.ADDRESS },
      { icon: FiClock, label: "Thời gian hỗ trợ", value: "08:00 - 17:30, Thứ 2 - Thứ 7" },
    ],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setShowLoginNotice(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setShowLoginNotice(true);
  };

  return (
    <div className="public-contact-page">
      <Header />

      <main>
        <section className="pc-hero">
          <div className="pc-hero__pattern" />
          <div className="pc-container pc-hero__grid">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.span className="pc-eyebrow" variants={fadeUp}>
                <FiHeadphones /> PreOnic Support Center
              </motion.span>
              <motion.h1 variants={fadeUp}>
                Chúng tôi giúp bạn <span>hiểu đúng và bắt đầu dễ dàng.</span>
              </motion.h1>
              <motion.p variants={fadeUp}>
                Khách có thể xem hướng dẫn chung, thông tin liên hệ và câu hỏi thường gặp. Với yêu cầu liên quan đến tài khoản,
                hợp đồng hoặc giao dịch cụ thể, hãy đăng nhập để hệ thống chuyển bạn đến đúng kênh hỗ trợ.
              </motion.p>
              <motion.div className="pc-hero__actions" variants={fadeUp}>
                <button type="button" className="pc-btn pc-btn--primary" onClick={() => navigate("/auth")}>
                  Đăng nhập để được hỗ trợ <FiArrowRight />
                </button>
                <button type="button" className="pc-btn pc-btn--glass" onClick={() => navigate("/register")}>
                  Tạo tài khoản mới
                </button>
              </motion.div>
            </motion.div>

            <motion.aside
              className="pc-contact-card"
              initial={{ opacity: 0, x: 38, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.12 }}
            >
              <div className="pc-contact-card__head">
                <span><FiMessageCircle /></span>
                <div>
                  <small>Kênh liên hệ chính thức</small>
                  <h2>PreOnic Care</h2>
                </div>
              </div>

              <div className="pc-contact-list">
                {contactInfo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.label}>
                      <span><Icon /></span>
                      <div>
                        <small>{item.label}</small>
                        <strong>{item.value}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="pc-contact-card__status">
                <i />
                <span>Đội hỗ trợ sẵn sàng tiếp nhận yêu cầu trong giờ làm việc</span>
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="pc-section pc-support-section">
          <div className="pc-container">
            <div className="pc-section__head">
              <span>Chúng tôi hỗ trợ những gì?</span>
              <h2>Đi đúng kênh ngay từ đầu để vấn đề được xử lý nhanh hơn.</h2>
              <p>
                Mỗi yêu cầu sau đăng nhập sẽ được gắn với đúng vai trò và dữ liệu liên quan, giúp giảm thời gian trao đổi lại thông tin.
              </p>
            </div>

            <motion.div className="pc-support-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.16 }}>
              {supportAreas.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} variants={fadeUp}>
                    <span><Icon /></span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="pc-section pc-request-section">
          <div className="pc-container pc-request-layout">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <motion.span className="pc-kicker" variants={fadeUp}>Chuẩn bị yêu cầu hỗ trợ</motion.span>
              <motion.h2 variants={fadeUp}>Mô tả trước vấn đề, đăng nhập để gửi theo đúng tài khoản.</motion.h2>
              <motion.p variants={fadeUp}>
                Bạn có thể điền thử thông tin để xác định nội dung cần chuẩn bị. Form công khai không gửi dữ liệu lên hệ thống;
                bước gửi chính thức sẽ yêu cầu đăng nhập để bảo vệ thông tin giao dịch.
              </motion.p>

              <motion.div className="pc-login-reasons" variants={stagger}>
                <motion.div variants={fadeUp}><FiLock /><span>Xác định đúng người dùng và vai trò</span></motion.div>
                <motion.div variants={fadeUp}><FiShield /><span>Bảo vệ thông tin hợp đồng, ví và thanh toán</span></motion.div>
                <motion.div variants={fadeUp}><FiCheckCircle /><span>Liên kết yêu cầu với dữ liệu cần xử lý</span></motion.div>
              </motion.div>
            </motion.div>

            <motion.form className="pc-request-form" onSubmit={handleSubmit} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <motion.div className="pc-form-row" variants={fadeUp}>
                <label>
                  Chủ đề
                  <select name="topic" value={form.topic} onChange={handleChange}>
                    <option value="account">Tài khoản và hồ sơ</option>
                    <option value="product">Sản phẩm và nguồn cung</option>
                    <option value="contract">Hợp đồng và đơn hàng</option>
                    <option value="payment">Escrow, ví và thanh toán</option>
                    <option value="other">Vấn đề khác</option>
                  </select>
                </label>
                <label>
                  Họ tên
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Nhập họ tên" />
                </label>
              </motion.div>

              <motion.label variants={fadeUp}>
                Email liên hệ
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" />
              </motion.label>

              <motion.label variants={fadeUp}>
                Nội dung cần hỗ trợ
                <textarea name="message" value={form.message} onChange={handleChange} rows="5" placeholder="Mô tả ngắn vấn đề và thông tin bạn đang có..." />
              </motion.label>

              <AnimatePresence>
                {showLoginNotice && (
                  <motion.div className="pc-login-notice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <FiLock />
                    <div>
                      <strong>Đăng nhập để gửi yêu cầu chính thức</strong>
                      <span>Thông tin vừa nhập chỉ đang hiển thị trên trình duyệt và chưa được gửi.</span>
                    </div>
                    <button type="button" onClick={() => navigate("/auth")}>Đăng nhập</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" className="pc-submit" variants={fadeUp}>
                Tiếp tục gửi yêu cầu <FiSend />
              </motion.button>
            </motion.form>
          </div>
        </section>

        <section className="pc-section pc-faq-section">
          <div className="pc-container pc-faq-layout">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <motion.span className="pc-kicker" variants={fadeUp}><FiHelpCircle /> Câu hỏi thường gặp</motion.span>
              <motion.h2 variants={fadeUp}>Có thể câu trả lời bạn cần đã ở ngay đây.</motion.h2>
              <motion.p variants={fadeUp}>
                Những câu hỏi dưới đây giúp khách hiểu phạm vi xem công khai và các thao tác cần đăng nhập.
              </motion.p>
            </motion.div>

            <motion.div className="pc-faq-list" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {faqs.map((item, index) => {
                const opened = openFaq === index;
                return (
                  <motion.article key={item.question} className={opened ? "open" : ""} variants={fadeUp}>
                    <button type="button" onClick={() => setOpenFaq(opened ? -1 : index)} aria-expanded={opened}>
                      <span>{item.question}</span>
                      <FiChevronDown />
                    </button>
                    <AnimatePresence initial={false}>
                      {opened && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }}>
                          <p>{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="pc-final-cta">
          <div className="pc-container pc-final-cta__card">
            <div>
              <span><FiHeadphones /> Hỗ trợ theo đúng ngữ cảnh tài khoản</span>
              <h2>Đăng nhập để đội ngũ PreOnic có thể hỗ trợ chính xác hơn.</h2>
            </div>
            <div>
              <button type="button" className="pc-btn pc-btn--light" onClick={() => navigate("/auth")}>Đăng nhập</button>
              <button type="button" className="pc-btn pc-btn--outline-light" onClick={() => navigate("/solutions")}>Xem giải pháp</button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Contact;
