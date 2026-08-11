import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/auth.service';

export default function GoogleSelectRole() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const loadedRef = useRef(false);
  const [profile, setProfile] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadProfile = async () => {
      try {
        const response = await authService.getGoogleOnboardingProfile();
        const nextProfile = response?.data?.profile;
        if (!nextProfile?.email) throw new Error('Phiên đăng ký Google không hợp lệ');
        setProfile(nextProfile);
      } catch {
        navigate('/auth?error=google_profile_invalid', { replace: true });
      } finally {
        setInitialLoading(false);
      }
    };

    void loadProfile();
  }, [navigate]);

  const handleSelectRole = async (role) => {
    if (loading || !profile) return;

    setLoading(true);
    setError('');

    try {
      // Only the role is submitted. Google identity is read by backend from the
      // signed httpOnly onboarding cookie created after Google verification.
      const response = await authService.googleRegister({ role });

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tạo tài khoản Google.');
      }

      const { user, accessToken } = response.data || {};
      if (!user || !accessToken) {
        throw new Error('Máy chủ không trả về phiên đăng nhập hợp lệ.');
      }

      login(accessToken, user);

      if (user.role === 'farmer') navigate('/farmer-home', { replace: true });
      else if (user.role === 'enterprise') navigate('/enterprise-home', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-success" role="status" aria-label="Đang tải thông tin Google" />
          <p className="mt-3 text-muted">Đang xác minh phiên Google...</p>
        </div>
      </div>
    );
  }

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
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt={`${profile.firstName || 'Người dùng'} avatar`}
            referrerPolicy="no-referrer"
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%', marginBottom: 16 }}
          />
        )}

        <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
          Chào mừng{profile.firstName ? `, ${profile.firstName}` : ''}! 👋
        </h2>
        <p style={{ color: '#6b7c70', marginBottom: 32 }}>
          Bạn đang đăng ký với email <strong>{profile.email}</strong>.<br />
          Vui lòng chọn vai trò của bạn:
        </p>

        {error && (
          <div role="alert" style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => handleSelectRole('farmer')}
            disabled={loading}
            style={{
              flex: 1, padding: '20px 16px', border: '2px solid #16a34a', borderRadius: 16,
              background: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌾</div>
            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 16 }}>Nông dân</div>
            <div style={{ fontSize: 12, color: '#6b7c70', marginTop: 4 }}>Đăng bán nông sản, nhận hợp đồng bao tiêu</div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole('enterprise')}
            disabled={loading}
            style={{
              flex: 1, padding: '20px 16px', border: '2px solid #2563eb', borderRadius: 16,
              background: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
            <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 16 }}>Doanh nghiệp</div>
            <div style={{ fontSize: 12, color: '#6b7c70', marginTop: 4 }}>Tìm nguồn cung, ký hợp đồng bao tiêu</div>
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
            type="button"
            disabled={loading}
            onClick={() => navigate('/auth', { replace: true })}
            style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}
