import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowRight,
  FiCpu,
  FiLoader,
  FiLock,
  FiLogIn,
  FiMessageCircle,
  FiRefreshCw,
  FiSend,
  FiUserPlus,
} from 'react-icons/fi';

import {
  getPublicAiStatus,
  sendPublicAiMessage,
} from '../../services/ai.service';

const CHAT_STORAGE_KEY = 'preonic_public_ai_chat_v2';
const MAX_STORED_MESSAGES = 24;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 600;

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào! Tôi là PreOnic AI dành cho khách. Bạn có thể hỏi nhanh về PreOnic, vai trò Farmer/Enterprise, quy trình hợp đồng, ký quỹ hoặc cách đăng ký tài khoản.',
  createdAt: Date.now(),
};

const loadStoredMessages = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) return [welcomeMessage];

    const safeMessages = parsed
      .filter(
        (item) =>
          item &&
          (item.role === 'assistant' || item.role === 'user') &&
          typeof item.content === 'string'
      )
      .slice(-MAX_STORED_MESSAGES);

    return safeMessages.length > 0 ? safeMessages : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
};

const buildMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt: Date.now(),
  ...extra,
});

const getErrorMessage = (error) => {
  const code = error?.response?.data?.code;
  if (code === 'PUBLIC_AI_RATE_LIMITED' || error?.response?.status === 429) {
    return 'Bạn đã gửi quá nhiều câu hỏi trong thời gian ngắn. Vui lòng thử lại sau.';
  }

  return (
    error?.response?.data?.message ||
    'PreOnic AI đang tạm thời chưa phản hồi. Vui lòng kiểm tra kết nối và thử lại.'
  );
};

function LoginGate({ reason, onLogin, onRegister }) {
  const isLimit = reason === 'limit';

  return (
    <div className="pai-login-gate">
      <div className="pai-login-gate__icon">
        <FiLock />
      </div>
      <div className="pai-login-gate__content">
        <strong>
          {isLimit
            ? 'Bạn đã đạt giới hạn dùng thử dành cho khách'
            : 'Nội dung này cần AI đầy đủ theo tài khoản'}
        </strong>
        <p>
          {isLimit
            ? 'Đăng nhập để tiếp tục hội thoại và sử dụng trợ lý phù hợp với vai trò Farmer hoặc Enterprise.'
            : 'Đăng nhập giúp AI xác định đúng vai trò và mở các chức năng phân tích chuyên sâu hơn.'}
        </p>
        <div className="pai-login-gate__actions">
          <button type="button" onClick={onLogin}>
            <FiLogIn /> Đăng nhập
          </button>
          <button type="button" onClick={onRegister}>
            <FiUserPlus /> Tạo tài khoản
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicAIChat({ suggestedQuestions = [], roleLabel = 'PreOnic' }) {
  const navigate = useNavigate();
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState(loadStoredMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [usage, setUsage] = useState({
    limit: 20,
    answeredCount: 0,
    remainingQuestions: 20,
    limitReached: false,
  });

  const isLocked = usage.limitReached;
  const apiHistory = useMemo(
    () =>
      messages
        .filter(
          (item) =>
            !item.isError &&
            !item.isLoginOnly &&
            !item.loginGateReason &&
            (item.role === 'user' || item.role === 'assistant')
        )
        .slice(-MAX_HISTORY_MESSAGES)
        .map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  useEffect(() => {
    let active = true;

    getPublicAiStatus()
      .then((data) => {
        if (active && data) setUsage(data);
      })
      .catch(() => {
        // Chat vẫn có thể hoạt động; trạng thái chính xác sẽ được cập nhật sau
        // lần gửi đầu tiên.
      })
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

    // Chỉ cuộn phần nội dung của chat. Không dùng scrollIntoView vì API đó
    // có thể kéo theo cả viewport của trang, khiến giao diện bị nhảy vị trí.
    const frameId = window.requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, sending]);

  const submitQuestion = async (rawQuestion) => {
    const question = rawQuestion.trim();
    if (!question || sending || isLocked) return;

    const userMessage = buildMessage('user', question);
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);

    try {
      const data = await sendPublicAiMessage({
        message: question,
        history: apiHistory,
      });

      if (!data) throw new Error('AI response is empty');

      setUsage({
        limit: data.limit ?? usage.limit,
        answeredCount: data.answeredCount ?? usage.answeredCount,
        remainingQuestions:
          data.remainingQuestions ?? usage.remainingQuestions,
        limitReached: Boolean(data.limitReached),
      });

      setMessages((current) => [
        ...current,
        buildMessage('assistant', data.answer, {
          loginGateReason:
            data.requiresLogin || data.showLoginAfterAnswer
              ? data.loginReason || 'advanced'
              : null,
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

  const resetLocalConversation = () => {
    setMessages([welcomeMessage]);
    setInput('');
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="pai-chat-card pai-chat-card--live">
      <div className="pai-chat-card__header">
        <span>
          <FiCpu />
        </span>
        <div>
          <strong>PreOnic AI</strong>
          <small>Trợ lý công khai · {roleLabel}</small>
        </div>
        <i aria-label="AI đang hoạt động" />
      </div>

      <div className="pai-chat-toolbar">
        <span className={isLocked ? 'is-locked' : ''}>
          {statusLoading ? <FiLoader className="pai-spin" /> : <FiMessageCircle />}
          {statusLoading
            ? 'Đang kết nối trợ lý...'
            : isLocked
              ? 'Đăng nhập để tiếp tục'
              : 'Sẵn sàng hỗ trợ'}
        </span>
        <button type="button" onClick={resetLocalConversation} title="Xóa hội thoại trên thiết bị">
          <FiRefreshCw /> Hội thoại mới
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        className="pai-chat-messages"
        aria-live="polite"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`pai-message pai-message--${message.role}${
              message.isError ? ' pai-message--error' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <span className="pai-message__avatar">AI</span>
            )}
            <div className="pai-message__body">
              <p>{message.content}</p>
              {message.loginGateReason && (
                <LoginGate
                  reason={message.loginGateReason}
                  onLogin={() => navigate('/auth')}
                  onRegister={() => navigate('/register')}
                />
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="pai-message pai-message--assistant">
            <span className="pai-message__avatar">AI</span>
            <div className="pai-message__body pai-typing" aria-label="AI đang trả lời">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {!isLocked && suggestedQuestions.length > 0 && (
        <div className="pai-chat-suggestions">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => submitQuestion(question)}
              disabled={sending}
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {isLocked ? (
        <div className="pai-chat-locked">
          <FiLock />
          <div>
            <strong>Phiên khách đã đạt giới hạn</strong>
            <span>Đăng nhập để tiếp tục với AI đầy đủ.</span>
          </div>
          <button type="button" onClick={() => navigate('/auth')}>
            Đăng nhập <FiArrowRight />
          </button>
        </div>
      ) : (
        <form className="pai-chat-composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            placeholder="Hỏi nhanh về PreOnic..."
            rows={2}
            disabled={sending}
            aria-label="Nhập câu hỏi cho PreOnic AI"
          />
          <div className="pai-chat-composer__footer">
            <span>{input.length}/{MAX_MESSAGE_LENGTH}</span>
            <button type="submit" disabled={!input.trim() || sending}>
              {sending ? (
                <FiLoader className="pai-spin" aria-hidden="true" />
              ) : (
                <FiSend aria-hidden="true" />
              )}
              <span>Gửi</span>
            </button>
          </div>
        </form>
      )}

      <div className="pai-chat-disclaimer">
        <FiAlertCircle /> AI có thể nhầm lẫn. Không dùng câu trả lời công khai để thay thế quyết định giao dịch hoặc tư vấn chuyên môn.
      </div>
    </div>
  );
}

export default PublicAIChat;
