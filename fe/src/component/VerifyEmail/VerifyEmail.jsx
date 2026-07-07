import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/auth.service';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const params      = new URLSearchParams(location.search);
  const statusParam = params.get('status');
  const token       = params.get('token');

  // Link email trỏ thẳng về FE kèm ?token=... → FE tự gọi API xác minh.
  // Link cũ (backend redirect sau khi verify) trỏ về kèm ?status=success|error.
  const [status,  setStatus]  = useState(statusParam);
  const [message, setMessage] = useState(params.get('message'));
  const [loading, setLoading] = useState(!!token && !statusParam);

  // Token chỉ dùng được 1 lần ở backend — chặn gọi lặp do React.StrictMode
  // remount effect 2 lần ở dev, tránh lần gọi thứ 2 báo "token không hợp lệ".
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (!token || statusParam) return;
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err?.message);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isSuccess = status === 'success';
  const isError   = status === 'error';

  return (
    <div className="ve-page">
      <div className="ve-card">

        {/* Đang xác minh */}
        {loading && (
          <div className="ve-state">
            <span className="ve-state-icon">⏳</span>
            <h2>Đang xác minh email...</h2>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {/* Success */}
        {!loading && isSuccess && (
          <div className="ve-state">
            <span className="ve-state-icon">✅</span>
            <h2>Email đã được xác minh!</h2>
            <p>Tài khoản PreOnic của bạn đã được kích hoạt thành công.</p>
            <button className="ve-btn-primary" onClick={() => navigate('/auth')}>
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Error */}
        {!loading && isError && (
          <div className="ve-state">
            <span className="ve-state-icon">❌</span>
            <h2>Xác minh thất bại</h2>
            <p>{message || 'Token không hợp lệ hoặc đã hết hạn.'}</p>
            <button className="ve-btn-primary" onClick={() => navigate('/register')}>
              Đăng ký lại
            </button>
            <button className="ve-btn-ghost" onClick={() => navigate('/auth')}>
              Về trang đăng nhập
            </button>
          </div>
        )}

        {/* Chưa có status/token — truy cập trực tiếp trang này */}
        {!loading && !status && !token && (
          <div className="ve-state">
            <span className="ve-state-icon">📧</span>
            <h2>Kiểm tra email của bạn</h2>
            <p>
              Chúng tôi đã gửi email xác minh đến địa chỉ email của bạn.
              Vui lòng kiểm tra hộp thư và nhấn vào link xác minh.
            </p>
            <p className="ve-note">
              Không thấy email? Kiểm tra thư mục Spam.
            </p>
            <button className="ve-btn-ghost" onClick={() => navigate('/auth')}>
              Về trang đăng nhập
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
