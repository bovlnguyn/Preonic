import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight, FiBarChart2, FiCheckCircle, FiCpu, FiFileText, FiLoader,
  FiMessageCircle, FiPackage, FiRefreshCw, FiSearch, FiSend, FiShield,
  FiTrendingUp, FiTruck, FiUser, FiUsers,
} from 'react-icons/fi';
import Header from '../Common/Header';
import Footer from '../Common/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingWidget } from '../../contexts/MessagingWidgetContext';
import { getEnterpriseAiStatus, sendEnterpriseAiMessage } from '../../services/ai.service';
import './EnterpriseAI.css';

const CHAT_STORAGE_KEY = 'preonic_enterprise_ai_chat_v2';
const MAX_STORED_MESSAGES = 36;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 600;
const starterPrompts = [
  'Nguồn cung nào đang có rating tốt và còn sản lượng?',
  'Tóm tắt các hợp đồng doanh nghiệp cần theo dõi.',
  'Phân tích các khoản chi và phí dịch vụ hiện tại.',
  'Mở báo cáo chi phí cho tôi.',
];
const capabilities = [
  { icon: FiSearch, title: 'Tìm nguồn cung', text: 'Đối chiếu nông sản đang hoạt động theo vùng, sản lượng, giá và uy tín người bán.' },
  { icon: FiUsers, title: 'Phân tích nhà cung cấp', text: 'Tổng hợp lịch sử hợp tác, số hợp đồng hoàn thành và nhóm nông sản đã cung ứng.' },
  { icon: FiFileText, title: 'Theo dõi hợp đồng', text: 'Nhận diện hợp đồng đang chờ, tiến độ giao nhận và các khoản còn phải thanh toán.' },
  { icon: FiBarChart2, title: 'Kiểm soát dòng tiền', text: 'Giải thích tiền hàng đã chi, khoản đang chờ và phí dịch vụ từ báo cáo thật của doanh nghiệp.' },
];
const ACTION_ICONS = {
  products: FiPackage, product_detail: FiPackage, contracts: FiFileText,
  contract_detail: FiFileText, orders: FiTruck, suppliers: FiUsers,
  supplier_detail: FiUsers, billing: FiTrendingUp, cashflow_report: FiBarChart2,
  messages: FiMessageCircle,
};
const buildMessage = (role, content, extra = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role, content, actions: [], ...extra,
});
const createWelcome = (name) => buildMessage('assistant', `Xin chào ${name}. Tôi đã kết nối với dữ liệu nguồn cung, nhà cung cấp, hợp đồng và báo cáo chi phí mà doanh nghiệp của bạn được phép xem. Bạn muốn bắt đầu từ phần nào?`);
const normalizeActions = (actions) => Array.isArray(actions)
  ? actions.filter((item) => item && (item.type === 'navigate' || item.type === 'open_chat')).slice(0, 2)
  : [];
const isSafeEnterprisePath = (path) => typeof path === 'string' && (
  /^\/enterprise(?:\/|$)/.test(path) ||
  ['/profile', '/enterprise-home', '/enterprise-products', '/enterprise-solutions', '/enterprise-contact'].includes(path)
);
const loadMessages = (name) => {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    const safe = Array.isArray(saved) ? saved
      .filter((item) => item && ['assistant', 'user'].includes(item.role) && typeof item.content === 'string')
      .slice(-MAX_STORED_MESSAGES)
      .map((item) => ({ ...item, actions: normalizeActions(item.actions) })) : [];
    return safe.length ? safe : [createWelcome(name)];
  } catch { return [createWelcome(name)]; }
};

function EnterpriseAI() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openWidget, openChatWith } = useMessagingWidget();
  const name = useMemo(() => user?.fullName?.trim()?.split(/\s+/).pop() || 'doanh nghiệp', [user]);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const [messages, setMessages] = useState(() => loadMessages(name));
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState({ available: true, assistantName: 'PreOnic Enterprise AI', specialties: [], suggestedQuestions: starterPrompts });

  useEffect(() => {
    let active = true;
    getEnterpriseAiStatus().then((data) => {
      if (!active || !data) return;
      setStatus({
        available: Boolean(data.available),
        assistantName: data.assistantName || 'PreOnic Enterprise AI',
        specialties: Array.isArray(data.specialties) ? data.specialties : [],
        suggestedQuestions: Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length ? data.suggestedQuestions : starterPrompts,
      });
    }).catch(() => {}).finally(() => active && setStatusLoading(false));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    const frame = window.requestAnimationFrame(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }));
    return () => window.cancelAnimationFrame(frame);
  }, [messages, sending]);
  const history = useMemo(() => messages.filter((item) => !item.isError).slice(-MAX_HISTORY_MESSAGES).map((item) => ({ role: item.role, content: item.content })), [messages]);

  const submit = async (rawPrompt) => {
    const question = rawPrompt.trim();
    if (!question || sending) return;
    setMessages((current) => [...current, buildMessage('user', question)]);
    setPrompt(''); setSending(true);
    try {
      const data = await sendEnterpriseAiMessage({ message: question, history, currentFeature: 'enterprise-ai-page' });
      if (!data?.answer) throw new Error('Empty AI response');
      setMessages((current) => [...current, buildMessage('assistant', data.answer, { category: data.category, actions: normalizeActions(data.actions) })]);
    } catch (error) {
      const errorMessage = error?.response?.status === 429
        ? 'Bạn đang gửi câu hỏi quá nhanh. Vui lòng chờ ít phút rồi thử lại.'
        : error?.response?.data?.message || 'PreOnic Enterprise AI đang tạm thời chưa phản hồi. Vui lòng thử lại.';
      setMessages((current) => [...current, buildMessage('assistant', errorMessage, { isError: true })]);
    } finally { setSending(false); window.setTimeout(() => inputRef.current?.focus(), 0); }
  };
  const handleAction = (action) => {
    if (action.type === 'navigate' && isSafeEnterprisePath(action.path)) navigate(action.path);
    if (action.type === 'open_chat') action.partnerId ? openChatWith(action.partnerId, action.partnerName) : openWidget();
  };
  const reset = () => { const next = [createWelcome(name)]; setMessages(next); setPrompt(''); };

  return (
    <div className="enterprise-ai-page">
      <Header />
      <main>
        <section className="ea-hero"><div className="ea-container ea-hero__grid">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="ea-eyebrow"><FiCpu /> AI dành cho doanh nghiệp</span>
            <h1>Ra quyết định thu mua dựa trên <span>dữ liệu thật của PreOnic.</span></h1>
            <p>Hỏi về nguồn cung, nhà cung cấp, hợp đồng và dòng tiền. Trợ lý chỉ sử dụng dữ liệu mà doanh nghiệp của bạn được quyền truy cập.</p>
            <div className="ea-hero__badges"><span><FiCheckCircle /> Nguồn cung đang hoạt động</span><span><FiCheckCircle /> Hợp đồng của doanh nghiệp</span><span><FiCheckCircle /> Dòng tiền đã đối chiếu</span></div>
            <div className="ea-hero__actions"><button type="button" onClick={() => inputRef.current?.focus()}>Bắt đầu hỏi AI <FiArrowRight /></button><button type="button" onClick={() => navigate('/enterprise/products')}>Xem nguồn cung</button></div>
          </motion.div>
          <motion.aside className="ea-ai-core" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}>
            <FiShield /><span>ENTERPRISE AI WORKSPACE</span><h2>Một trợ lý hiểu đúng luồng thu mua và thanh toán trực tiếp.</h2>
            <div className="ea-ai-core__list">{(status.specialties.length ? status.specialties : capabilities.map((item) => item.title)).slice(0, 5).map((item) => <p key={item}><FiCheckCircle /> {item}</p>)}</div>
          </motion.aside>
        </div></section>

        <section className="ea-chat-section"><div className="ea-container">
          <div className="ea-section-head"><span><FiMessageCircle /> Không gian phân tích</span><h2>Trao đổi với trợ lý thu mua.</h2><p>AI có thể đọc bản tóm tắt dữ liệu hiện tại nhưng không ký hợp đồng hay chuyển tiền thay bạn.</p></div>
          <div className="ea-workspace">
            <motion.div className="ea-chat-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="ea-chat-card__head"><div><span><FiCpu /> {status.assistantName}</span><small>Xin chào {name}</small></div><button type="button" onClick={reset}><FiRefreshCw /> Hội thoại mới</button></div>
              <div className="ea-chat-status"><span className={!status.available && !statusLoading ? 'is-offline' : ''}>{statusLoading ? <FiLoader className="ea-spin" /> : <FiCpu />}{statusLoading ? 'Đang kiểm tra kết nối...' : status.available ? 'AI backend đang hoạt động' : 'AI chưa được cấu hình trên máy chủ'}</span><small>{messages.filter((item) => item.role === 'user').length} câu trong phiên</small></div>
              <div className="ea-messages" ref={chatRef}>
                {messages.map((message) => <div key={message.id} className={`ea-message ea-message--${message.role} ${message.isError ? 'is-error' : ''}`}>
                  <span className="ea-message__avatar">{message.role === 'assistant' ? <FiCpu /> : <FiUser />}</span><div><strong>{message.role === 'assistant' ? 'PreOnic AI' : 'Bạn'}</strong><p>{message.content}</p>
                  {!!message.actions?.length && <div className="ea-message__actions">{message.actions.map((action, index) => { const Icon = ACTION_ICONS[action.target] || FiArrowRight; return <button type="button" key={`${message.id}-${index}`} onClick={() => handleAction(action)}><Icon /> {action.label} <FiArrowRight /></button>; })}</div>}</div>
                </div>)}
                {sending && <div className="ea-message ea-message--assistant"><span className="ea-message__avatar"><FiCpu /></span><div><strong>PreOnic AI</strong><p><FiLoader className="ea-spin" /> Đang đối chiếu dữ liệu doanh nghiệp...</p></div></div>}
              </div>
              <div className="ea-suggestions">{status.suggestedQuestions.slice(0, 4).map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div>
              <form className="ea-input" onSubmit={(event) => { event.preventDefault(); submit(prompt); }}>
                <textarea ref={inputRef} value={prompt} maxLength={MAX_MESSAGE_LENGTH} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(prompt); } }} placeholder="Hỏi về nguồn cung, nhà cung cấp, hợp đồng hoặc chi phí..." rows={3} />
                <div><small>{prompt.length}/{MAX_MESSAGE_LENGTH} ký tự</small><button type="submit" disabled={sending || !prompt.trim()}>{sending ? <FiLoader className="ea-spin" /> : <FiSend />} {sending ? 'Đang gửi' : 'Gửi câu hỏi'}</button></div>
              </form>
            </motion.div>
            <aside className="ea-side-panel"><span>Gợi ý nhanh</span><h3>Bắt đầu bằng dữ liệu đang có.</h3>{starterPrompts.map((item) => <button type="button" key={item} onClick={() => { setPrompt(item); inputRef.current?.focus(); }}><FiArrowRight /> {item}</button>)}<div className="ea-side-panel__note"><FiShield /><p>AI chỉ phân tích và điều hướng. Mọi thao tác hợp đồng hoặc thanh toán vẫn cần bạn tự xác nhận trong màn hình nghiệp vụ.</p></div></aside>
          </div>
        </div></section>
        <section className="ea-container ea-capabilities"><div className="ea-section-head"><span>Năng lực chính</span><h2>Thông tin phục vụ đúng quyết định thu mua.</h2></div><div className="ea-feature-grid">{capabilities.map(({ icon: Icon, title, text }) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      </main><Footer />
    </div>
  );
}
export default EnterpriseAI;
