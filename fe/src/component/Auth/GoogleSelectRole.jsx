import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/auth.service';

export default function GoogleSelectRole() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Lấy profile từ URL params
  const params  = new URLSearchParams(location.search);
  const profileString = params.get('profile');
  
  let profile = null;
  try {
    profile = profileString ? JSON.parse(decodeURIComponent(profileString)) : null;
  } catch {
    profile = null;
  }

  if (!profile) {
    navigate('/auth', { replace: true });
    return null;
  }

 const handleSelectRole = async (role) => {
  setLoading(true);
  setError('');
  try {
    const response = await authService.googleRegister({
      email:     profile.email,
      firstName: profile.firstName,
      lastName:  profile.lastName,
      avatar:    profile.avatar,
      role,
    });

    if (response.success) {
      const { user, accessToken } = response.data;
      login(accessToken, user);
      if (role === 'farmer') navigate('/farmer-home', { replace: true });
      else navigate('/enterprise-home', { replace: true });
    }
  } catch (err) {
    setError(err?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        {/* Avatar */}
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt="avatar"
            style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: 16 }}
          />
        )}

        {/* Greeting */}
        <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
          Chào mừng, {profile.firstName}! 👋
        </h2>
        <p style={{ color: '#6b7c70', marginBottom: 32 }}>
          Bạn đang đăng ký với email <strong>{profile.email}</strong>.<br />
          Vui lòng chọn vai trò của bạn:
        </p>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', padding: '10px 16px',
            borderRadius: 8, marginBottom: 20, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Role buttons */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {/* Farmer */}
          <button
            onClick={() => handleSelectRole('farmer')}
            disabled={loading}
            style={{
              flex: 1, padding: '20px 16px',
              border: '2px solid #16a34a',
              borderRadius: 16, background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌾</div>
            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 16 }}>Nông dân</div>
            <div style={{ fontSize: 12, color: '#6b7c70', marginTop: 4 }}>
              Đăng bán nông sản, nhận hợp đồng bao tiêu
            </div>
          </button>

          {/* Enterprise */}
          <button
            onClick={() => handleSelectRole('enterprise')}
            disabled={loading}
            style={{
              flex: 1, padding: '20px 16px',
              border: '2px solid #2563eb',
              borderRadius: 16, background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
            <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 16 }}>Doanh nghiệp</div>
            <div style={{ fontSize: 12, color: '#6b7c70', marginTop: 4 }}>
              Tìm nguồn cung, ký hợp đồng bao tiêu
            </div>
          </button>
        </div>

        {loading && (
          <div style={{ color: '#6b7c70', fontSize: 14 }}>
            <span className="spinner-border spinner-border-sm me-2" />
            Đang tạo tài khoản...
          </div>
        )}

        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
          Đã có tài khoản?{' '}
          <button
            onClick={() => navigate('/auth')}
            style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}