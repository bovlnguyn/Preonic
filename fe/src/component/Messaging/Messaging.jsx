import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSend, FiMessageCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import messagingService from '../../services/messaging.service';
import './Messaging.css';

const CONVERSATION_POLL_MS = 20000;
const MESSAGE_POLL_MS = 8000;
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const getInitials = (name) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const formatRelativeTime = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', { timeZone: VN_TIME_ZONE });
};

const formatMessageTime = (isoDate) =>
  isoDate
    ? new Date(isoDate).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: VN_TIME_ZONE,
      })
    : '';

function Messaging() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const startedPartnerRef = useRef(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const loadConversations = useCallback(async (options = {}) => {
    if (!options.silent) setLoadingConversations(true);
    try {
      const res = await messagingService.listConversations();
      setConversations(res?.data?.conversations || []);
    } catch {
      if (!options.silent) setConversations([]);
    } finally {
      if (!options.silent) setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, options = {}) => {
    if (!options.silent) setLoadingMessages(true);
    try {
      const res = await messagingService.listMessages(conversationId, { limit: 50 });
      setMessages(res?.data?.messages || []);
    } catch {
      if (!options.silent) setMessages([]);
    } finally {
      if (!options.silent) setLoadingMessages(false);
    }
  }, []);

  const openConversation = useCallback(
    async (conversationId) => {
      setActiveId(conversationId);
      await loadMessages(conversationId);
      messagingService.markAsRead(conversationId).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    },
    [loadMessages]
  );

  // Tai danh sach hoi thoai khi vao trang
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Neu duoc dieu huong toi kem ?partnerId=, tu dong mo/tao hoi thoai voi doi tac do
  useEffect(() => {
    const partnerId = searchParams.get('partnerId');
    if (!partnerId || startedPartnerRef.current === partnerId) return;
    startedPartnerRef.current = partnerId;

    messagingService
      .startConversation(partnerId)
      .then((res) => {
        const conversation = res?.data?.conversation;
        if (!conversation) return;
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          return exists
            ? prev.map((c) => (c.id === conversation.id ? conversation : c))
            : [conversation, ...prev];
        });
        openConversation(conversation.id);
        setSearchParams({}, { replace: true });
      })
      .catch((err) => toast.error(err?.message || 'Không thể bắt đầu hội thoại'));
  }, [searchParams, setSearchParams, openConversation, toast]);

  // Poll danh sach hoi thoai de cap nhat tin nhan moi / unread count
  useEffect(() => {
    const timer = setInterval(() => loadConversations({ silent: true }), CONVERSATION_POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversations]);

  // Poll tin nhan cua hoi thoai dang mo
  useEffect(() => {
    if (!activeId) return undefined;
    const timer = setInterval(() => loadMessages(activeId, { silent: true }), MESSAGE_POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, activeId]);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !activeId || sending) return;

    setSending(true);
    setText('');
    try {
      const res = await messagingService.sendMessage(activeId, trimmed);
      const sent = res?.data?.message;
      if (sent) setMessages((prev) => [...prev, sent]);
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === activeId
              ? { ...c, lastMessage: trimmed, lastMessageAt: sent?.createdAt || new Date().toISOString() }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
      );
    } catch (err) {
      toast.error(err?.message || 'Gửi tin nhắn thất bại');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="msg-page">
      <aside className="msg-sidebar">
        <div className="msg-sidebar__header">
          <h2>Tin nhắn</h2>
        </div>

        {loadingConversations ? (
          <div className="msg-empty">Đang tải...</div>
        ) : conversations.length === 0 ? (
          <div className="msg-empty">
            <FiMessageCircle size={28} />
            <p>Chưa có cuộc hội thoại nào.</p>
            <span>Mở một hợp đồng và bấm “Nhắn tin” để bắt đầu trò chuyện.</span>
          </div>
        ) : (
          <div className="msg-conversation-list">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={`msg-conversation ${conversation.id === activeId ? 'active' : ''}`}
                onClick={() => openConversation(conversation.id)}
              >
                <span className="msg-avatar">{getInitials(conversation.partner?.name)}</span>
                <span className="msg-conversation__body">
                  <span className="msg-conversation__top">
                    <strong>{conversation.partner?.name || 'Người dùng'}</strong>
                    <time>{formatRelativeTime(conversation.lastMessageAt)}</time>
                  </span>
                  <span className="msg-conversation__bottom">
                    <p>{conversation.lastMessage || 'Chưa có tin nhắn'}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="msg-unread-badge">{conversation.unreadCount}</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="msg-thread">
        {!activeConversation ? (
          <div className="msg-thread__placeholder">
            <FiMessageCircle size={36} />
            <p>Chọn một cuộc hội thoại để xem tin nhắn</p>
          </div>
        ) : (
          <>
            <div className="msg-thread__header">
              <span className="msg-avatar">{getInitials(activeConversation.partner?.name)}</span>
              <div>
                <strong>{activeConversation.partner?.name || 'Người dùng'}</strong>
                <span className="msg-thread__role">
                  {activeConversation.partner?.role === 'farmer' ? 'Nông dân' : 'Doanh nghiệp'}
                </span>
              </div>
            </div>

            <div className="msg-thread__body">
              {loadingMessages ? (
                <div className="msg-empty">Đang tải tin nhắn...</div>
              ) : messages.length === 0 ? (
                <div className="msg-empty">Hãy gửi tin nhắn đầu tiên</div>
              ) : (
                messages.map((message) => {
                  const isMine = message.sender?.id === user?.id;
                  return (
                    <div key={message.id} className={`msg-bubble-row ${isMine ? 'mine' : ''}`}>
                      <div className="msg-bubble">
                        <p>{message.text}</p>
                        <time>{formatMessageTime(message.createdAt)}</time>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="msg-thread__input" onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={4000}
              />
              <button type="submit" disabled={!text.trim() || sending} aria-label="Gửi">
                <FiSend />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default Messaging;
