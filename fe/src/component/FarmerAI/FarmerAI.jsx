import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCamera,
  FiCheckCircle,
  FiCloudRain,
  FiCpu,
  FiFileText,
  FiMessageCircle,
  FiSend,
  FiShield,
  FiZap,
} from "react-icons/fi";

import Header from "../Common/Header";
import Footer from "../Common/Footer";
import "./FarmerAI.css";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const aiFeatures = [
  {
    title: "Gợi ý mô tả nông sản",
    desc: "AI giúp farmer viết mô tả rõ ràng hơn về giống cây, vùng trồng, quy cách và thời gian thu hoạch.",
    icon: FiFileText,
  },
  {
    title: "Checklist chất lượng",
    desc: "Nhắc các thông tin cần bổ sung trước khi gửi sản phẩm cho doanh nghiệp xem xét.",
    icon: FiCheckCircle,
  },
  {
    title: "Cảnh báo thời tiết",
    desc: "Định hướng tích hợp cảnh báo mưa, hạn, bão và rủi ro ảnh hưởng mùa vụ.",
    icon: FiCloudRain,
  },
  {
    title: "Hỗ trợ hình ảnh mùa vụ",
    desc: "Gợi ý loại ảnh farmer nên chụp để doanh nghiệp đánh giá sản phẩm tốt hơn.",
    icon: FiCamera,
  },
];

const samplePrompts = [
  "Viết mô tả bán 5 tấn xoài cát Hòa Lộc thu hoạch tháng 6.",
  "Tôi cần bổ sung thông tin gì trước khi đăng sản phẩm cà phê?",
  "Gợi ý cam kết chất lượng cho hồ sơ mùa vụ thanh long.",
];

function FarmerAI() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([
    {
      role: "ai",
      text: "Xin chào farmer, mình có thể gợi ý cách chuẩn hóa mô tả nông sản, checklist hồ sơ và nội dung cam kết chất lượng.",
    },
  ]);

  const handleSend = (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    setHistory((current) => [
      ...current,
      { role: "user", text },
      {
        role: "ai",
        text: "Giao diện AI đã sẵn sàng. Khi backend có API AI thật, bạn chỉ cần thay phần phản hồi demo này bằng request đến service AI.",
      },
    ]);
    setMessage("");
  };

  return (
    <div className="farmer-ai-page">
      <Header />

      <main>
        <section className="fai-hero">
          <div className="fai-container fai-hero-grid">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.span className="fai-eyebrow" variants={fadeUp}>
                <FiCpu /> AI nông nghiệp cho farmer
              </motion.span>
              <motion.h1 variants={fadeUp}>Trợ lý AI giúp farmer chuẩn hóa hồ sơ nông sản nhanh hơn.</motion.h1>
              <motion.p variants={fadeUp}>
                Trang này là không gian AI riêng cho farmer. Hiện tại giao diện đã hoàn thiện để demo,
                sau này có thể nối API AI để gợi ý mô tả, checklist, cảnh báo rủi ro và nội dung cam kết.
              </motion.p>
              <motion.div className="fai-actions" variants={fadeUp}>
                <button type="button" className="fai-btn primary" onClick={() => navigate("/farmer/create-product")}>Dùng khi đăng sản phẩm <FiArrowRight /></button>
                <button type="button" className="fai-btn ghost" onClick={() => navigate("/farmer")}>Vào dashboard <FiZap /></button>
              </motion.div>
            </motion.div>

            <motion.aside
              className="fai-chat-card"
              initial={{ opacity: 0, x: 34, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.12 }}
            >
              <div className="fai-chat-head">
                <span><FiMessageCircle /> PreOnic AI</span>
                <strong>Farmer Assistant</strong>
              </div>

              <div className="fai-chat-body">
                {history.map((item, index) => (
                  <div className={`fai-bubble ${item.role}`} key={`${item.role}-${index}`}>{item.text}</div>
                ))}
              </div>

              <form className="fai-chat-input" onSubmit={handleSend}>
                <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Nhập câu hỏi demo..." />
                <button type="submit"><FiSend /></button>
              </form>
            </motion.aside>
          </div>
        </section>

        <section className="fai-section">
          <div className="fai-container">
            <div className="fai-section-head">
              <span>AI có thể hỗ trợ gì?</span>
              <h2>Các tình huống nên dùng AI trong luồng farmer.</h2>
            </div>

            <motion.div className="fai-grid" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }} variants={stagger}>
              {aiFeatures.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="fai-card" key={item.title} variants={fadeUp}>
                    <Icon />
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="fai-section fai-prompts-section">
          <div className="fai-container fai-prompts-grid">
            <div>
              <span className="fai-kicker">Prompt mẫu</span>
              <h2>Farmer có thể hỏi AI theo các mẫu này.</h2>
              <p>Nhấn vào một prompt để đưa vào ô chat demo. Khi nối API thật, prompt này có thể gửi lên backend AI.</p>
            </div>

            <div className="fai-prompts">
              {samplePrompts.map((prompt) => (
                <button type="button" key={prompt} onClick={() => setMessage(prompt)}>
                  <FiShield /> {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default FarmerAI;
