import { useCallback, useEffect, useRef, useState } from 'react';
import { FiMessageCircle, FiX, FiArrowLeft, FiSend } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useMessagingWidget } from '../../contexts/MessagingWidgetContext';
import messagingService from '../../services/messaging.service';
import './FloatingChatWidget.css';

const UNREAD_POLL_MS = 30000;
const CONVERSATION_POLL_MS = 20000;
const MESSAGE_POLL_MS = 8000;
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CHAT_ROLES = ['farmer', 'enterprise'];

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

function FloatingChatWidget() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const { isOpen, closeWidget, toggleWidget, pendingPartner, consumePendingPartner } =
    useMessagingWidget();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const startedPartnerRef = useRef(null);
  const conversationRequestRef = useRef(false);
  const messageRequestRef = useRef(false);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const canUseChat = !authLoading && user && CHAT_ROLES.includes(user.role);

  const loadConversations = useCallback(async (options = {}) => {
    if (document.hidden || !navigator.onLine || conversationRequestRef.current) return;

    conversationRequestRef.current = true;
    if (!options.silent) setLoadingConversations(true);
    try {
      const res = await messagingService.listConversations();
      setConversations(res?.data?.conversations || []);
    } catch {
      // Giữ dữ liệu hiện tại khi poll lỗi; không làm danh sách biến mất.
    } finally {
      conversationRequestRef.current = false;
      if (!options.silent) setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, options = {}) => {
    if (document.hidden || !navigator.onLine || messageRequestRef.current) return;

    messageRequestRef.current = true;
    if (!options.silent) setLoadingMessages(true);
    try {
      const res = await messagingService.listMessages(conversationId, { limit: 50 });
      setMessages(res?.data?.messages || []);
    } catch {
      // Giữ tin nhắn đã tải khi mạng/DB gián đoạn.
    } finally {
      messageRequestRef.current = false;
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

  const backToList = () => setActiveId(null);

  // Luon theo doi tong so tin chua doc de hien badge tren bong bong, ke ca khi dong popup
  useEffect(() => {
    // Khi popup mở đã có poll riêng 20s; không chạy thêm poll unread 30s song song.
    if (!canUseChat || isOpen) return undefined;

    loadConversations({ silent: true });
    const timer = setInterval(() => loadConversations({ silent: true }), UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [canUseChat, isOpen, loadConversations]);

  // Khi mo popup: tai lai danh sach hoi thoai (khong silent de hien loading lan dau)
  useEffect(() => {
    if (isOpen && canUseChat) loadConversations();
  }, [isOpen, canUseChat, loadConversations]);

  // Cac trang khac (ProductDetail, ContractDetailView...) yeu cau mo chat voi 1 doi tac cu the
  useEffect(() => {
    if (!pendingPartner || !canUseChat) return;
    if (startedPartnerRef.current === pendingPartner.id) return;
    startedPartnerRef.current = pendingPartner.id;

    messagingService
      .startConversation(pendingPartner.id)
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
      })
      .catch((err) => toast.error(err?.message || 'Không thể bắt đầu hội thoại'))
      .finally(() => consumePendingPartner());
  }, [pendingPartner, canUseChat, openConversation, consumePendingPartner, toast]);

  // Poll danh sach hoi thoai khi popup dang mo
  useEffect(() => {
    if (!isOpen || !canUseChat) return undefined;
    const timer = setInterval(() => loadConversations({ silent: true }), CONVERSATION_POLL_MS);
    return () => clearInterval(timer);
  }, [isOpen, canUseChat, loadConversations]);

  // Poll tin nhan cua hoi thoai dang mo
  useEffect(() => {
    if (!isOpen || !activeId) return undefined;
    const timer = setInterval(() => loadMessages(activeId, { silent: true }), MESSAGE_POLL_MS);
    return () => clearInterval(timer);
  }, [isOpen, activeId, loadMessages]);

  useEffect(() => {
    if (isOpen && activeId) messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, activeId, isOpen]);

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

  if (!canUseChat) return null;

  return (
    <div className="fcw-root">
      {isOpen && (
        <div className={`fcw-panel${user?.role === 'farmer' ? ' fcw-panel--farmer' : ''}`}>
          {!activeConversation ? (
            <>
              <div className={`fcw-header${user?.role === 'farmer' ? ' fcw-header--farmer' : ''}`}>
                <span>Tin nhắn</span>
                <button type="button" className="fcw-icon-btn" onClick={closeWidget} aria-label="Đóng">
                  <FiX />
                </button>
              </div>

              <div className="fcw-list">
                {loadingConversations ? (
                  <div className="fcw-empty">Đang tải...</div>
                ) : conversations.length === 0 ? (
                  <div className="fcw-empty">
                    <FiMessageCircle size={26} />
                    <p>Chưa có cuộc hội thoại nào.</p>
                    <span>Bấm “Nhắn tin” trên sản phẩm hoặc hợp đồng để bắt đầu trò chuyện.</span>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      type="button"
                      key={conversation.id}
                      className="fcw-conversation"
                      onClick={() => openConversation(conversation.id)}
                    >
                      <span className="fcw-avatar">{getInitials(conversation.partner?.name)}</span>
                      <span className="fcw-conversation__body">
                        <span className="fcw-conversation__top">
                          <strong>{conversation.partner?.name || 'Người dùng'}</strong>
                          <time>{formatRelativeTime(conversation.lastMessageAt)}</time>
                        </span>
                        <span className="fcw-conversation__bottom">
                          <p>{conversation.lastMessage || 'Chưa có tin nhắn'}</p>
                          {conversation.unreadCount > 0 && (
                            <span className="fcw-unread-badge">{conversation.unreadCount}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className={`fcw-header${user?.role === 'farmer' ? ' fcw-header--farmer' : ''}`}>
                <button type="button" className="fcw-icon-btn" onClick={backToList} aria-label="Quay lại">
                  <FiArrowLeft />
                </button>
                <span className="fcw-header__title">
                  <strong>{activeConversation.partner?.name || 'Người dùng'}</strong>
                  <small>{activeConversation.partner?.role === 'farmer' ? 'Nông dân' : 'Doanh nghiệp'}</small>
                </span>
                <button type="button" className="fcw-icon-btn" onClick={closeWidget} aria-label="Đóng">
                  <FiX />
                </button>
              </div>

              <div className="fcw-thread">
                {loadingMessages ? (
                  <div className="fcw-empty">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="fcw-empty">Hãy gửi tin nhắn đầu tiên</div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender?.id === user?.id;
                    return (
                      <div key={message.id} className={`fcw-bubble-row ${isMine ? 'mine' : ''}`}>
                        <div className="fcw-msg-bubble">
                             <p>{message.text}</p>
                        </div>
                        <time className="fcw-bubble-time">{formatMessageTime(message.createdAt)}</time>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="fcw-input" onSubmit={handleSend}>
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
        </div>
      )}

      <button
        type="button"
        className={`fcw-bubble${user?.role === 'farmer' ? ' fcw-bubble--farmer' : ''}`}
        onClick={toggleWidget}
        aria-label="Tin nhắn">
        <FiMessageCircle size={24} />
        {totalUnread > 0 && <span className="fcw-bubble__badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
      </button>
    </div>
  );
}

export default FloatingChatWidget;
