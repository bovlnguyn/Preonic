import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/auth.service';
import './ResetPassword.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const token  = params.get('token');

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showCpw,         setShowCpw]         = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);

  // Token không hợp lệ
  if (!token) {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-state">
            <span className="rp-state-icon">❌</span>
            <h2>Link không hợp lệ</h2>
            <p>Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
            <button className="rp-btn-primary" onClick={() => navigate('/auth')}>
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) { setError('Vui lòng nhập mật khẩu mới.'); return; }
    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }

    setLoading(true);
    try {
      await authService.resetPassword({ token, password, confirmPassword });
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Thành công
  if (success) {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-state">
            <span className="rp-state-icon">✅</span>
            <h2>Đặt lại mật khẩu thành công!</h2>
            <p>Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.</p>
            <button className="rp-btn-primary" onClick={() => navigate('/auth')}>
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-page">
      <div className="rp-card">

        {/* Header */}
        <div className="rp-header">
          <div className="rp-logo">🌾</div>
          <h2 className="rp-title">Đặt lại mật khẩu</h2>
          <p className="rp-sub">Nhập mật khẩu mới cho tài khoản PreOnic của bạn.</p>
        </div>

        {/* Error */}
        {error && <div className="rp-error">{error}</div>}

        <form onSubmit={handleSubmit} className="rp-form">

          {/* Mật khẩu mới */}
          <div className="rp-field">
            <label className="rp-label">Mật khẩu mới *</label>
            <div className="rp-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="rp-input"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="rp-eye-btn"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="rp-field">
            <label className="rp-label">Xác nhận mật khẩu mới *</label>
            <div className="rp-input-wrap">
              <input
                type={showCpw ? 'text' : 'password'}
                className="rp-input"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="rp-eye-btn"
                onClick={() => setShowCpw(!showCpw)}
              >
                {showCpw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="rp-btn-primary"
            disabled={loading}
          >
            {loading
              ? <><span className="rp-spinner" />Đang xử lý...</>
              : 'Đặt lại mật khẩu'
            }
          </button>

          <button
            type="button"
            className="rp-btn-ghost"
            onClick={() => navigate('/auth')}
          >
            Quay lại đăng nhập
          </button>

        </form>
      </div>
    </div>
  );
}