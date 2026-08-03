import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { SERVICE_STATUS_EVENT } from '../../../services/api';
import './ServiceStatusBanner.css';

function ServiceStatusBanner() {
  const [status, setStatus] = useState({ visible: false, message: '' });

  useEffect(() => {
    const handleStatus = (event) => {
      const available = event.detail?.available !== false;

      if (available) {
        setStatus({ visible: false, message: '' });
        return;
      }

      setStatus({
        visible: true,
        message:
          event.detail?.message ||
          'Kết nối dữ liệu đang tạm thời gián đoạn. Dữ liệu của bạn không bị xóa.',
      });
    };

    const handleOffline = () =>
      setStatus({
        visible: true,
        message: 'Thiết bị đang mất kết nối mạng. Phiên đăng nhập vẫn được giữ nguyên.',
      });

    const handleOnline = () => setStatus({ visible: false, message: '' });

    window.addEventListener(SERVICE_STATUS_EVENT, handleStatus);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener(SERVICE_STATUS_EVENT, handleStatus);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!status.visible) return null;

  return (
    <aside className="service-status-banner" role="status" aria-live="polite">
      <span className="service-status-banner__icon">
        <FiAlertTriangle />
      </span>
      <div className="service-status-banner__content">
        <strong>Kết nối máy chủ tạm thời gián đoạn</strong>
        <span>{status.message}</span>
      </div>
      <button
        type="button"
        className="service-status-banner__close"
        onClick={() => setStatus({ visible: false, message: '' })}
        aria-label="Ẩn thông báo"
      >
        <FiX />
      </button>
    </aside>
  );
}

export default ServiceStatusBanner;
