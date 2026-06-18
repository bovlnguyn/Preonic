import { useNavigate, useLocation } from 'react-router-dom';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const params  = new URLSearchParams(location.search);
  const status  = params.get('status');
  const message = params.get('message');

  const isSuccess = status === 'success';
  const isError   = status === 'error';

  return (
    <div className="ve-page">
      <div className="ve-card">

        {/* Success */}
        {isSuccess && (
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
        {isError && (
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

        {/* Chờ xác minh — chưa có status */}
        {!status && (
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