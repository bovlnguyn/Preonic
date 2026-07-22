import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiCpu,
  FiMapPin,
  FiMessageSquare,
  FiPackage,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import Header from "../Common/Header";
import "./EnterpriseAI.css";

const suggestions = [
  "Gợi ý nguồn cung xoài trong tháng 7 ở miền Tây",
  "So sánh farmer nào phù hợp để ký hợp đồng 30 tấn gạo",
  "Dự báo rủi ro giao hàng khi đặt cọc sầu riêng Đắk Lắk",
  "Tóm tắt sản phẩm có chứng chỉ VietGAP và rating cao",
];

const aiInsights = [
  { icon: FiSearch, title: "Tìm nguồn cung thông minh", desc: "Gợi ý sản phẩm theo sản lượng, vùng miền, mùa vụ và lịch sử giao dịch." },
  { icon: FiShield, title: "Cảnh báo rủi ro đặt cọc", desc: "Mô phỏng rủi ro dựa trên trạng thái hợp đồng, giao hàng và uy tín farmer." },
  { icon: FiTrendingUp, title: "Phân tích xu hướng giá", desc: "Hỗ trợ doanh nghiệp so sánh giá mock theo khu vực và thời điểm thu hoạch." },
];

const marketSignals = [
  { crop: "Gạo ST25", signal: "Nhu cầu ổn định", level: 78, region: "Sóc Trăng" },
  { crop: "Sầu riêng Ri6", signal: "Giá tăng nhẹ", level: 86, region: "Tây Nguyên" },
  { crop: "Rau Đà Lạt", signal: "Ưu tiên giao nhanh", level: 69, region: "Lâm Đồng" },
];

function EnterpriseAI() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Xin chào, tôi là trợ lý AI thu mua của PreOnic. Tôi có thể gợi ý nguồn cung, phân tích rủi ro hợp đồng và đề xuất farmer phù hợp cho doanh nghiệp.",
    },
  ]);

  const quickReply = useMemo(() => {
    if (!prompt.trim()) return "Hãy nhập nhu cầu thu mua để AI mô phỏng câu trả lời.";
    return `Dựa trên nhu cầu “${prompt}”, hệ thống có thể ưu tiên nguồn cung có chứng chỉ rõ ràng, rating từ 4.7 trở lên, khu vực gần kho và hỗ trợ escrow để giảm rủi ro đặt cọc.`;
  }, [prompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: prompt.trim() },
      { role: "assistant", text: quickReply },
    ]);
    setPrompt("");
  };

  const handleSuggestion = (item) => {
    setPrompt(item);
  };

  return (
    <div className="enterprise-ai-page">
      <Header />

      <main>
        <section className="ea-hero">
          <div className="ea-container ea-hero__grid">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="ea-eyebrow"><FiCpu /> Enterprise AI procurement assistant</span>
              <h1>AI hỗ trợ doanh nghiệp tìm nguồn cung và giảm rủi ro thu mua.</h1>
              <p>
                Trang này mô phỏng giao diện AI dành cho enterprise. Khi backend AI hoàn thiện,
                phần chat có thể nối với service phân tích sản phẩm, hợp đồng, farmer và dữ liệu thị trường.
              </p>
            </motion.div>

            <motion.div className="ea-ai-core" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.12 }}>
              <FiZap />
              <strong>AI matching score</strong>
              <span>92%</span>
              <p>Khớp nhu cầu thu mua với nguồn cung đã xác thực.</p>
            </motion.div>
          </div>
        </section>

        <section className="ea-container ea-ai-grid">
          <motion.div className="ea-chat-card" initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="ea-chat-card__head">
              <div>
                <span><FiMessageSquare /> PreOnic AI</span>
                <h2>Trợ lý thu mua</h2>
              </div>
              <em>Mock mode</em>
            </div>

            <div className="ea-messages">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`ea-message ea-message--${message.role}`}>
                  {message.text}
                </div>
              ))}
            </div>

            <div className="ea-suggestions">
              {suggestions.map((item) => (
                <button type="button" key={item} onClick={() => handleSuggestion(item)}>{item}</button>
              ))}
            </div>

            <form className="ea-input" onSubmit={handleSubmit}>
              <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Nhập nhu cầu: 30 tấn gạo ST25, giao trong tháng 8..." />
              <button type="submit"><FiArrowRight /></button>
            </form>
          </motion.div>

          <motion.aside className="ea-insight-panel" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2>Tín hiệu thị trường</h2>
            {marketSignals.map((item) => (
              <article key={item.crop}>
                <div>
                  <strong>{item.crop}</strong>
                  <span><FiMapPin /> {item.region}</span>
                </div>
                <em>{item.signal}</em>
                <div className="ea-signal"><i style={{ width: `${item.level}%` }} /></div>
              </article>
            ))}
          </motion.aside>
        </section>

        <section className="ea-container ea-feature-grid">
          {aiInsights.map(({ icon: Icon, title, desc }, index) => (
            <motion.article key={title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }}>
              <Icon />
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.article>
          ))}
        </section>

        <section className="ea-container ea-dashboard-preview">
          <div>
            <span className="ea-eyebrow ea-eyebrow--blue"><FiBarChart2 /> AI dashboard preview</span>
            <h2>Backend có thể nối AI với dữ liệu nào?</h2>
            <p>
              Product API để lấy nguồn cung, Contract API để đọc đề xuất hợp đồng, Review API để đánh giá uy tín farmer, Transaction/Escrow API để phân tích rủi ro thanh toán.
            </p>
          </div>
          <div className="ea-preview-list">
            <span><FiPackage /> Product matching</span>
            <span><FiShield /> Escrow risk scoring</span>
            <span><FiActivity /> Delivery performance</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default EnterpriseAI;
