import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiCloudRain,
  FiCpu,
  FiDatabase,
  FiFeather,
  FiMessageCircle,
  FiSearch,
  FiShield,
  FiSun,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

import Header from "../Common/Header";
import Footer from "../Common/Footer";
import aiImage from "../../assets/home/BG2.jpg";
import PublicAIChat from "./PublicAIChat";
import "./AIAgriculture.css";

const aiUseCases = [
  {
    icon: FiCloudRain,
    title: "Diễn giải thông tin thời tiết",
    description: "Tóm tắt dữ liệu dự báo theo cách dễ hiểu để người dùng tham khảo khi lên kế hoạch mùa vụ hoặc thu mua.",
  },
  {
    icon: FiSearch,
    title: "Hỗ trợ tra cứu nhanh",
    description: "Gợi ý nơi tìm sản phẩm, hợp đồng, nhà cung cấp và các khu vực chức năng phù hợp trong hệ thống.",
  },
  {
    icon: FiBarChart2,
    title: "Tổng hợp dữ liệu giao dịch",
    description: "Giúp đọc các chỉ số tổng quan, lịch sử hoạt động và xu hướng để người dùng nắm tình hình nhanh hơn.",
  },
  {
    icon: FiMessageCircle,
    title: "Trợ lý hỏi đáp theo vai trò",
    description: "Nội dung trả lời được định hướng khác nhau cho Farmer và Enterprise dựa trên nhu cầu sử dụng.",
  },
];

const roleDemos = {
  farmer: {
    label: "AI cho Farmer",
    title: "Một trợ lý số đồng hành cùng người quản lý mùa vụ.",
    description:
      "Farmer có thể dùng AI để tham khảo cách chuẩn bị thông tin sản phẩm, đọc cảnh báo thời tiết và hiểu quy trình hợp đồng trước khi thao tác.",
    questions: [
      "Tôi nên chuẩn bị thông tin gì khi đăng một mùa vụ mới?",
      "Cảnh báo mưa lớn ảnh hưởng thế nào đến kế hoạch thu hoạch?",
      "Các bước để kiểm tra hợp đồng và khoản đặt cọc là gì?",
    ],
    answer: "AI sẽ tổng hợp dữ liệu đang có trong hệ thống và trình bày thành hướng dẫn ngắn gọn, dễ thực hiện. Các quyết định về mùa vụ vẫn cần người dùng kiểm tra thực tế.",
    icon: FiFeather,
  },
  enterprise: {
    label: "AI cho Enterprise",
    title: "Hỗ trợ doanh nghiệp đọc nguồn cung và ra quyết định nhanh hơn.",
    description:
      "Enterprise có thể tham khảo AI khi tìm nguồn hàng, so sánh thông tin nhà cung cấp và hiểu các chỉ số giao dịch trong dashboard.",
    questions: [
      "Làm thế nào để lọc nguồn cung phù hợp với nhu cầu thu mua?",
      "Tôi nên xem những thông tin nào trước khi chọn farmer?",
      "Các trạng thái hợp đồng và escrow có ý nghĩa gì?",
    ],
    answer: "AI hỗ trợ tìm và diễn giải thông tin, không tự thay doanh nghiệp phê duyệt hợp đồng, chuyển tiền hoặc đưa ra cam kết thương mại.",
    icon: FiUsers,
  },
};

const principles = [
  { icon: FiDatabase, title: "Dựa trên dữ liệu", text: "Ưu tiên thông tin có trong hệ thống và ngữ cảnh người dùng cung cấp." },
  { icon: FiShield, title: "Hỗ trợ, không thay quyết định", text: "AI không tự ký hợp đồng, chuyển tiền hoặc xác nhận giao dịch." },
  { icon: FiActivity, title: "Giải thích rõ ràng", text: "Kết quả được trình bày thành gợi ý dễ đọc, có phạm vi và lưu ý cần thiết." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function AIAgriculture() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState("farmer");
  const currentRole = roleDemos[activeRole];
  const RoleIcon = currentRole.icon;

  return (
    <div className="public-ai-page">
      <Header />

      <main>
        <section className="pai-hero">
          <div className="pai-hero__grid-lines" />
          <div className="pai-container pai-hero__grid">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.span className="pai-eyebrow" variants={fadeUp}>
                <FiCpu /> PreOnic Agricultural Intelligence
              </motion.span>
              <motion.h1 variants={fadeUp}>
                AI giúp thông tin nông nghiệp trở nên <span>dễ hiểu và hữu ích hơn.</span>
              </motion.h1>
              <motion.p variants={fadeUp}>
                Khách có thể trò chuyện trực tiếp với PreOnic AI để hỏi nhanh về hệ thống, vai trò và quy trình sử dụng.
                Khi cần phân tích chuyên sâu hoặc phiên dùng thử kết thúc, trợ lý sẽ mời bạn đăng nhập để mở AI đầy đủ.
              </motion.p>
              <motion.div className="pai-hero__actions" variants={fadeUp}>
                <button type="button" className="pai-btn pai-btn--primary" onClick={() => navigate("/register")}>
                  Tạo tài khoản để trải nghiệm <FiArrowRight />
                </button>
                <button type="button" className="pai-btn pai-btn--glass" onClick={() => navigate("/solutions")}>
                  Xem hệ sinh thái
                </button>
              </motion.div>
              <motion.div className="pai-hero__notes" variants={fadeUp}>
                <span><FiCheck /> Hỏi đáp theo vai trò</span>
                <span><FiCheck /> Diễn giải dữ liệu</span>
                <span><FiCheck /> Luôn cần người dùng kiểm tra</span>
              </motion.div>
            </motion.div>

            <motion.div
              className="pai-hero__visual"
              initial={{ opacity: 0, x: 42, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.12, ease: "easeOut" }}
            >
              <div className="pai-image-card">
                <img src={aiImage} alt="Nông nghiệp số và trí tuệ nhân tạo" />
                <div className="pai-image-card__overlay" />
                <div className="pai-ai-orbit">
                  <span><FiCpu /></span>
                  <i className="pai-orbit pai-orbit--one" />
                  <i className="pai-orbit pai-orbit--two" />
                </div>
                <div className="pai-image-card__caption">
                  <span>AI insight</span>
                  <strong>Kết nối dữ liệu – giải thích – hỗ trợ hành động</strong>
                </div>
              </div>
              <motion.div
                className="pai-floating pai-floating--weather"
                animate={{ y: [0, -9, 0] }}
                transition={{ repeat: Infinity, duration: 3.1, ease: "easeInOut" }}
              >
                <FiSun /> Ổn định cho thu hoạch
              </motion.div>
              <motion.div
                className="pai-floating pai-floating--trend"
                animate={{ y: [0, 9, 0] }}
                transition={{ repeat: Infinity, duration: 3.7, ease: "easeInOut" }}
              >
                <FiTrendingUp /> Phân tích theo ngữ cảnh
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="pai-section pai-capabilities">
          <div className="pai-container">
            <div className="pai-section__head">
              <span>AI hỗ trợ điều gì?</span>
              <h2>Biến dữ liệu phức tạp thành nội dung người dùng có thể hiểu nhanh.</h2>
              <p>
                PreOnic định hướng AI như một lớp hỗ trợ thông tin, không phải công cụ tự động thay người dùng thực hiện giao dịch.
              </p>
            </div>

            <motion.div className="pai-usecase-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.16 }}>
              {aiUseCases.map((item) => {
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

        <section className="pai-section pai-demo-section">
          <div className="pai-container">
            <div className="pai-demo-head">
              <div>
                <span>Trải nghiệm AI công khai</span>
                <h2>Hỏi nhanh trước khi tạo tài khoản.</h2>
              </div>
              <div className="pai-role-switch" role="tablist" aria-label="Chọn vai trò AI">
                {Object.entries(roleDemos).map(([key, item]) => (
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
                className="pai-demo-panel"
                key={activeRole}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.34 }}
              >
                <div className="pai-demo-copy">
                  <span className="pai-kicker"><RoleIcon /> {currentRole.label}</span>
                  <h3>{currentRole.title}</h3>
                  <p>{currentRole.description}</p>
                  <button type="button" className="pai-inline-link" onClick={() => navigate("/auth")}>
                    Đăng nhập để mở AI đầy đủ <FiArrowRight />
                  </button>
                </div>

                <PublicAIChat
                  suggestedQuestions={currentRole.questions}
                  roleLabel={currentRole.label.replace("AI cho ", "")}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section className="pai-section pai-principles-section">
          <div className="pai-container pai-principles-layout">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <motion.span className="pai-kicker" variants={fadeUp}>Nguyên tắc thiết kế</motion.span>
              <motion.h2 variants={fadeUp}>AI đáng tin cậy bắt đầu từ phạm vi sử dụng rõ ràng.</motion.h2>
              <motion.p variants={fadeUp}>
                Trợ lý được xây dựng để hướng dẫn, tổng hợp và gợi ý. Người dùng vẫn là người kiểm tra thông tin và chịu trách nhiệm cho quyết định cuối cùng.
              </motion.p>
            </motion.div>

            <motion.div className="pai-principles" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {principles.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} variants={fadeUp}>
                    <span><Icon /></span>
                    <div><h3>{item.title}</h3><p>{item.text}</p></div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="pai-final-cta">
          <div className="pai-container pai-final-cta__card">
            <div>
              <span><FiCpu /> Trợ lý AI theo tài khoản</span>
              <h2>Đăng nhập để AI hiểu đúng vai trò và dữ liệu bạn đang quản lý.</h2>
            </div>
            <div>
              <button type="button" className="pai-btn pai-btn--light" onClick={() => navigate("/auth")}>Đăng nhập</button>
              <button type="button" className="pai-btn pai-btn--outline-light" onClick={() => navigate("/register")}>Tạo tài khoản</button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AIAgriculture;
