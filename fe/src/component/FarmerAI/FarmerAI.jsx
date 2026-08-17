import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCloudRain,
  FiCpu,
  FiCreditCard,
  FiFeather,
  FiFileText,
  FiImage,
  FiLayers,
  FiLoader,
  FiMessageCircle,
  FiPackage,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiTruck,
  FiUser,
} from 'react-icons/fi';

import Header from '../Common/Header';
import Footer from '../Common/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingWidget } from '../../contexts/MessagingWidgetContext';
import { getFarmerAiStatus, sendFarmerAiMessage } from '../../services/ai.service';
import './FarmerAI.css';

const CHAT_STORAGE_KEY = 'preonic_farmer_ai_chat_v1';
const MAX_STORED_MESSAGES = 36;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 600;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const capabilityCards = [
  {
    icon: FiFeather,
    title: 'Kiến thức nông nghiệp cho Farmer',
    description:
      'Hỏi về cây trồng, mùa vụ, đất, nước, dinh dưỡng, thu hoạch và các nguyên tắc canh tác phù hợp với điều kiện thực tế.',
  },
  {
    icon: FiCloudRain,
    title: 'Thời tiết & lựa chọn cây trồng',
    description:
      'AI có thể dùng dữ liệu thời tiết của PreOnic để giải thích rủi ro và gợi ý nhóm cây phù hợp theo khu vực.',
  },
  {
    icon: FiPackage,
    title: 'Đăng bán nông sản rõ ràng hơn',
    description:
      'Gợi ý thông tin nên điền ở 4 bước đăng bán: sản phẩm, mùa vụ, giá & bao tiêu, ảnh & chứng chỉ.',
  },
  {
    icon: FiLayers,
    title: 'Hợp đồng, ký quỹ & giao dịch',
    description:
      'Giải thích luồng hợp đồng, tiến độ thực hiện, ký quỹ, ví và các trạng thái thường gặp trên PreOnic.',
  },
];

const workflowCards = [
  {
    icon: FiTrendingUp,
    title: 'Mùa vụ & giá bán',
    points: [
      'Điền sản lượng, đơn vị và thời gian thu hoạch',
      'Hiểu tỉ lệ bao tiêu tối thiểu',
      'Nhận gợi ý cách trình bày giá rõ ràng',
    ],
  },
  {
    icon: FiImage,
    title: 'Ảnh & chứng chỉ',
    points: [
      'Nên tải loại ảnh nào để hồ sơ đáng tin hơn',
      'Gợi ý bổ sung giấy tờ như VietGAP, GlobalGAP',
      'Nhắc các lỗi thường gặp khi thiếu media',
    ],
  },
  {
    icon: FiShield,
    title: 'Hợp đồng & ký quỹ',
    points: [
      'Giải thích trách nhiệm của Farmer trong hợp đồng',
      'Hiểu khi nào doanh nghiệp phải nạp ký quỹ',
      'Theo dõi các mốc xác nhận và giải ngân',
    ],
  },
];

const starterPrompts = [
  'Thời tiết Đà Nẵng hôm nay phù hợp với nhóm cây trồng nào?',
  'Đất dễ úng thì nên cải thiện thế nào trước khi xuống giống?',
  'Tôi cần chuẩn bị những gì trước khi đăng một mùa vụ mới?',
  'Giúp tôi viết mô tả bán 5 tấn xoài cát Hòa Lộc tại Miền Trung.',
  'Farmer cần kiểm tra gì trước khi ký hợp đồng trên PreOnic?',
  'Tôi nên tải những loại ảnh nào để hồ sơ nông sản chuyên nghiệp hơn?',
];

const heroWorkflow = [
  { icon: FiFeather, label: 'Canh tác', text: 'Kiến thức cây trồng, đất, nước và mùa vụ' },
  { icon: FiCloudRain, label: 'Thời tiết', text: 'Phân tích ảnh hưởng tới sản xuất' },
  { icon: FiPackage, label: 'Sản phẩm', text: 'Chuẩn hóa thông tin nông sản' },
  { icon: FiShield, label: 'Giao dịch', text: 'Hợp đồng, ký quỹ và thanh toán' },
];


const ACTION_ICONS = {
  dashboard: FiLayers,
  crops: FiPackage,
  create_product: FiPackage,
  crop_detail: FiPackage,
  edit_crop: FiPackage,
  contracts: FiFileText,
  contract_detail: FiFileText,
  orders: FiTruck,
  escrow: FiShield,
  wallet: FiCreditCard,
  finance: FiTrendingUp,
  ratings: FiStar,
  weather_insurance: FiCloudRain,
  profile: FiUser,
  messages: FiMessageCircle,
  farmer_home: FiLayers,
  farmer_products: FiPackage,
  farmer_solutions: FiShield,
  farmer_contact: FiMessageCircle,
};

const isSafeFarmerPath = (path = '') =>
  typeof path === 'string' &&
  (/^\/farmer(?:\/|$)/.test(path) ||
    /^\/farmer-(?:home|products|solutions|contact)(?:\/|$)/.test(path) ||
    /^\/profile(?:[/?#]|$)/.test(path));

const normalizeAiActions = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((action) => action && (action.type === 'navigate' || action.type === 'open_chat'))
    .map((action) => {
      const label = typeof action.label === 'string'
        ? action.label.trim().slice(0, 80)
        : '';
      const target = typeof action.target === 'string' ? action.target : '';

      if (!label || !target) return null;

      if (action.type === 'navigate') {
        if (!isSafeFarmerPath(action.path)) return null;
        return { type: 'navigate', target, label, path: action.path };
      }

      return {
        type: 'open_chat',
        target: 'messages',
        label,
        partnerId: typeof action.partnerId === 'string' ? action.partnerId : '',
        partnerName: typeof action.partnerName === 'string' ? action.partnerName : '',
      };
    })
    .filter(Boolean)
    .slice(0, 2);
};

const buildMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  content,
  createdAt: Date.now(),
  ...extra,
});

const createWelcomeMessage = (userName = 'Farmer') =>
  buildMessage(
    'assistant',
    `Xin chào ${userName}! Tôi là PreOnic Farmer AI. Bạn có thể hỏi tôi về nông nghiệp, cây trồng, mùa vụ, đất, thời tiết, thu hoạch hoặc các chức năng Farmer như đăng bán nông sản, hợp đồng, ký quỹ và ví trên PreOnic.`
  );

const loadStoredMessages = (userName) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createWelcomeMessage(userName)];
    }

    const safeMessages = parsed
      .filter(
        (item) =>
          item &&
          (item.role === 'assistant' || item.role === 'user') &&
          typeof item.content === 'string'
      )
      .slice(-MAX_STORED_MESSAGES)
      .map((item) => ({
        ...item,
        actions: item.role === 'assistant' ? normalizeAiActions(item.actions) : [],
      }));

    return safeMessages.length ? safeMessages : [createWelcomeMessage(userName)];
  } catch {
    return [createWelcomeMessage(userName)];
  }
};

const getErrorMessage = (error) => {
  const code = error?.response?.data?.code;

  if (code === 'FARMER_AI_RATE_LIMITED' || error?.response?.status === 429) {
    return 'Bạn đang gửi câu hỏi quá nhanh. Vui lòng chờ ít phút rồi thử lại.';
  }

  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return 'Phiên đăng nhập không còn hợp lệ hoặc bạn không có quyền dùng chức năng này. Vui lòng đăng nhập lại.';
  }

  return (
    error?.response?.data?.message ||
    'PreOnic Farmer AI đang tạm thời chưa phản hồi. Vui lòng kiểm tra kết nối và thử lại.'
  );
};

function FarmerAI() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openWidget, openChatWith } = useMessagingWidget();
  const userName = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (fullName) {
      const parts = fullName.split(/\s+/);
      return parts[parts.length - 1];
    }
    return 'Farmer';
  }, [user]);

  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const chatSectionRef = useRef(null);

  const [messages, setMessages] = useState(() => loadStoredMessages(userName));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [assistantStatus, setAssistantStatus] = useState({
    available: true,
    assistantName: 'PreOnic Farmer AI',
    specialties: [],
    suggestedQuestions: starterPrompts.slice(0, 4),
  });

  useEffect(() => {
    let active = true;

    getFarmerAiStatus()
      .then((data) => {
        if (!active || !data) return;
        setAssistantStatus({
          available: Boolean(data.available),
          assistantName: data.assistantName || 'PreOnic Farmer AI',
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          suggestedQuestions:
            Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length
              ? data.suggestedQuestions
              : starterPrompts.slice(0, 4),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setStatusLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
    );

    const frameId = window.requestAnimationFrame(() => {
      const container = chatBodyRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, sending]);

  const apiHistory = useMemo(
    () =>
      messages
        .filter(
          (item) =>
            !item.isError && (item.role === 'assistant' || item.role === 'user')
        )
        .slice(-MAX_HISTORY_MESSAGES)
        .map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  const resetConversation = () => {
    const next = [createWelcomeMessage(userName)];
    setMessages(next);
    setInput('');
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  };

  const focusChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 450);
  };

  const submitQuestion = async (rawQuestion) => {
    const question = rawQuestion.trim();
    if (!question || sending) return;

    const userMessage = buildMessage('user', question);
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);

    try {
      const data = await sendFarmerAiMessage({
        message: question,
        history: apiHistory,
        currentFeature: 'farmer-ai-page',
      });

      if (!data?.answer) throw new Error('Farmer AI response is empty');

      setMessages((current) => [
        ...current,
        buildMessage('assistant', data.answer, {
          category: data.category || 'platform_help',
          actions: normalizeAiActions(data.actions),
        }),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        buildMessage('assistant', getErrorMessage(error), { isError: true }),
      ]);
    } finally {
      setSending(false);
      window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion(input);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(input);
    }
  };

  const handlePromptSelect = (prompt) => {
    setInput(prompt);
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  };

  const handleAiAction = (action) => {
    if (!action) return;

    if (action.type === 'navigate' && isSafeFarmerPath(action.path)) {
      navigate(action.path);
      return;
    }

    if (action.type === 'open_chat') {
      if (action.partnerId) {
        openChatWith(action.partnerId, action.partnerName);
      } else {
        openWidget();
      }
    }
  };

  const questionCount = messages.filter((item) => item.role === 'user').length;
  const suggestedQuestions = assistantStatus.suggestedQuestions.length
    ? assistantStatus.suggestedQuestions
    : starterPrompts.slice(0, 4);

  return (
    <div className="farmer-ai-page">
      <Header />

      <main>
        <section className="fai-hero">
          <div className="fai-container fai-hero-grid">
            <motion.div
              className="fai-hero-copy"
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              <motion.span className="fai-eyebrow" variants={fadeUp}>
                <FiCpu /> AI chuyên cho Farmer
              </motion.span>

              <motion.h1 variants={fadeUp}>
                Trợ lý AI đồng hành cùng Farmer từ{' '}
                <span>canh tác nông nghiệp đến làm việc trên PreOnic.</span>
              </motion.h1>

              <motion.p variants={fadeUp}>
                Bạn có thể hỏi kiến thức nông nghiệp, lựa chọn cây trồng, đất, nước,
                mùa vụ, ảnh hưởng thời tiết và đồng thời được hướng dẫn các nghiệp vụ Farmer
                trên PreOnic như đăng bán, hợp đồng, ký quỹ và ví.
              </motion.p>

              <motion.div className="fai-hero-badges" variants={fadeUp}>
                <span><FiCheckCircle /> Kiến thức nông nghiệp thực tế</span>
                <span><FiCheckCircle /> Thời tiết & mùa vụ</span>
                <span><FiCheckCircle /> Hướng dẫn đúng luồng PreOnic</span>
              </motion.div>

              <motion.div className="fai-actions" variants={fadeUp}>
                <button type="button" className="fai-btn primary" onClick={focusChat}>
                  Bắt đầu hỏi AI <FiArrowRight />
                </button>
                <button
                  type="button"
                  className="fai-btn ghost"
                  onClick={() => navigate('/farmer/create-product')}
                >
                  Đăng mùa vụ mới
                </button>
              </motion.div>
            </motion.div>

            <motion.aside
              className="fai-hero-visual"
              initial={{ opacity: 0, x: 32, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.62, ease: 'easeOut', delay: 0.08 }}
            >
              <div className="fai-hero-visual__eyebrow">FARMER AI WORKSPACE</div>
              <h2>Một trợ lý hiểu cả nông nghiệp và luồng làm việc trên PreOnic.</h2>
              <p>
                Hỏi về canh tác hoặc nghiệp vụ Farmer và nhận hướng dẫn ngắn gọn,
                có điều kiện rõ ràng khi dữ liệu thực địa chưa đủ.
              </p>

              <div className="fai-hero-flow">
                {heroWorkflow.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div className="fai-hero-flow__item" key={item.label}>
                      <span className="fai-hero-flow__icon"><Icon /></span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.text}</small>
                      </div>
                      <i>{String(index + 1).padStart(2, '0')}</i>
                    </div>
                  );
                })}
              </div>

              <div className="fai-hero-visual__footer">
                <span><FiShield /> Phạm vi: Nông nghiệp & PreOnic</span>
                <strong>Farmer focused</strong>
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="fai-chat-section" ref={chatSectionRef}>
          <div className="fai-container">
            <div className="fai-chat-section__head">
              <div>
                <span><FiMessageCircle /> Làm việc với PreOnic AI</span>
                <h2>Hỏi đáp tập trung trong một không gian riêng.</h2>
                <p>
                  Hỏi về nông nghiệp hoặc các chức năng PreOnic trong cùng một hội thoại.
                  Nhấn Enter để gửi, Shift + Enter để xuống dòng.
                </p>
              </div>

              <div className="fai-chat-session-stats">
                <article>
                  <strong>{assistantStatus.specialties.length || 5}</strong>
                  <span>nhóm hỗ trợ</span>
                </article>
                <article>
                  <strong>{questionCount}</strong>
                  <span>câu đã hỏi</span>
                </article>
              </div>
            </div>

            <div className="fai-workspace">
              <motion.div
                className="fai-chat-card fai-chat-card--workspace"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: 0.45 }}
              >
                <div className="fai-chat-head">
                  <div className="fai-chat-head__identity">
                    <span className="fai-chat-head__icon"><FiCpu /></span>
                    <div>
                      <strong>{assistantStatus.assistantName}</strong>
                      <small>Trợ lý dành riêng cho Farmer · Xin chào {userName}</small>
                    </div>
                  </div>

                  <button type="button" className="fai-reset-btn" onClick={resetConversation}>
                    <FiRefreshCw /> Hội thoại mới
                  </button>
                </div>

                <div className="fai-chat-toolbar">
                  <span className={`fai-status-pill ${statusLoading ? 'is-loading' : ''}`}>
                    {statusLoading ? <FiLoader className="fai-spin" /> : <FiCpu />}
                    {statusLoading
                      ? 'Đang kết nối trợ lý...'
                      : 'PreOnic Farmer AI đang hoạt động'}
                  </span>
                  <small><FiClock /> AI không thực hiện giao dịch thay người dùng</small>
                </div>

                <div className="fai-chat-body" ref={chatBodyRef}>
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`fai-bubble ${item.role} ${item.isError ? 'is-error' : ''}`}
                    >
                      <span className="fai-bubble__avatar">
                        {item.role === 'assistant' ? <FiCpu /> : <FiUser />}
                      </span>
                      <div className="fai-bubble__content">
                        <strong>{item.role === 'assistant' ? 'PreOnic AI' : 'Bạn'}</strong>
                        <p>{item.content}</p>
                        {item.role === 'assistant' && item.actions?.length > 0 && (
                          <div className="fai-bubble__actions" aria-label="Hành động được PreOnic AI đề xuất">
                            {item.actions.map((action, actionIndex) => {
                              const ActionIcon = ACTION_ICONS[action.target] || FiArrowRight;
                              return (
                                <button
                                  type="button"
                                  key={`${item.id}-${action.target}-${actionIndex}`}
                                  onClick={() => handleAiAction(action)}
                                >
                                  <span><ActionIcon /></span>
                                  <strong>{action.label}</strong>
                                  <FiArrowRight className="fai-bubble__action-arrow" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="fai-bubble assistant is-loading">
                      <span className="fai-bubble__avatar"><FiCpu /></span>
                      <div className="fai-bubble__content">
                        <strong>PreOnic AI</strong>
                        <p>Đang suy nghĩ và soạn câu trả lời phù hợp cho Farmer...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="fai-quick-prompts">
                  {suggestedQuestions.map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      onClick={() => handlePromptSelect(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <form className="fai-chat-input" onSubmit={handleSubmit}>
                  <div className="fai-chat-input__box">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) =>
                        setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
                      }
                      onKeyDown={handleInputKeyDown}
                      placeholder="Hỏi về cây trồng, mùa vụ, đất, thời tiết hoặc đăng bán, hợp đồng, ký quỹ..."
                      rows={3}
                    />
                    <div className="fai-chat-input__foot">
                      <small>{input.length}/{MAX_MESSAGE_LENGTH} ký tự</small>
                      <button type="submit" disabled={sending || !input.trim()}>
                        {sending ? <FiLoader className="fai-spin" /> : <FiSend />}
                        <span>{sending ? 'Đang gửi' : 'Gửi câu hỏi'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>

              <aside className="fai-workspace-side">
                <div className="fai-workspace-side__card">
                  <span className="fai-workspace-side__eyebrow">Gợi ý nhanh</span>
                  <h3>Bạn có thể bắt đầu từ đây.</h3>
                  <div className="fai-workspace-side__prompts">
                    {starterPrompts.map((prompt) => (
                      <button
                        type="button"
                        key={prompt}
                        onClick={() => handlePromptSelect(prompt)}
                      >
                        <FiArrowRight />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fai-workspace-side__note">
                  <span><FiShield /></span>
                  <div>
                    <strong>Phạm vi AI</strong>
                    <p>
                      Nếu câu hỏi không liên quan đến PreOnic, trợ lý sẽ thông báo
                      đây không phải chuyên môn và hướng bạn quay lại đúng nghiệp vụ Farmer.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="fai-section">
          <div className="fai-container">
            <div className="fai-section-head">
              <span>AI có thể làm gì cho Farmer?</span>
              <h2>Đúng trọng tâm nghiệp vụ, không trả lời lan man ngoài phạm vi PreOnic.</h2>
            </div>

            <motion.div
              className="fai-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.14 }}
              variants={stagger}
            >
              {capabilityCards.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article className="fai-card" key={item.title} variants={fadeUp}>
                    <span className="fai-card__icon"><Icon /></span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="fai-section fai-section--soft">
          <div className="fai-container">
            <div className="fai-section-head">
              <span>Luồng hỗ trợ chính</span>
              <h2>Những nhóm câu hỏi Farmer nên khai thác nhiều nhất.</h2>
            </div>

            <div className="fai-workflow-grid">
              {workflowCards.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="fai-workflow-card" key={item.title}>
                    <span className="fai-workflow-card__icon"><Icon /></span>
                    <h3>{item.title}</h3>
                    <ul>
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default FarmerAI;
