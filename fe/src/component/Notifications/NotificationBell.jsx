import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import notificationService from '../../services/notification.service';
import './NotificationBell.css';

const POLL_INTERVAL_MS = 30000;
const DROPDOWN_PAGE_SIZE = 10;
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const ROLE_BASE_PATH = {
  farmer: '/farmer',
  enterprise: '/enterprise',
};

const formatRelativeTime = (isoDate) => {
  const date = new Date(isoDate);
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', { timeZone: VN_TIME_ZONE });
};

function NotificationBell({ triggerClassName = 'notif-bell__trigger' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res?.data?.unreadCount ?? 0);
    } catch {
      // Bo qua loi polling ngam, khong lam phien nguoi dung
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.list({ limit: DROPDOWN_PAGE_SIZE });
      setNotifications(res?.data?.notifications ?? []);
      setUnreadCount(res?.data?.unreadCount ?? 0);
    } catch {
      // Bo qua loi, giu danh sach hien tai
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goToRelatedTarget = (notification) => {
    if (notification.relatedModel === 'Contract' && notification.relatedId) {
      const base = ROLE_BASE_PATH[user?.role];
      if (base) navigate(`${base}/contracts/${notification.relatedId}`);
    }
  };

  const handleNotificationClick = async (notification) => {
    setOpen(false);
    goToRelatedTarget(notification);

    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationService.markAsRead(notification.id);
      } catch {
        // Da cap nhat lac quan tren UI, bo qua loi ngam
      }
    }
  };

  const handleMarkAllAsRead = async (event) => {
    event.stopPropagation();
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
    } catch {
      // Bo qua loi ngam, lan mo tiep theo se dong bo lai
    }
  };

  return (
    <div className="notif-bell" ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-label="Thông báo"
        onClick={() => setOpen((value) => !value)}
      >
        <FiBell />
        {unreadCount > 0 && <span />}
      </button>

      {open && (
        <div className="notif-bell__panel">
          <div className="notif-bell__header">
            <span>Thông báo</span>
            <button
              type="button"
              className="notif-bell__mark-all"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <FiCheckCircle />
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          <div className="notif-bell__list">
            {loading && <div className="notif-bell__empty">Đang tải...</div>}

            {!loading && notifications.length === 0 && (
              <div className="notif-bell__empty">Không có thông báo nào</div>
            )}

            {!loading &&
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notif-bell__item ${notification.isRead ? '' : 'unread'} severity-${notification.severity || 'info'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notif-bell__item-dot" />
                  <span className="notif-bell__item-body">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <time>{formatRelativeTime(notification.createdAt)}</time>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
