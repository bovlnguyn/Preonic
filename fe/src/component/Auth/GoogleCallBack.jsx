import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/auth.service';

const getRedirectByRole = (role) => {
  if (role === 'farmer') return '/farmer-home';
  if (role === 'enterprise') return '/enterprise-home';
  if (role === 'admin') return '/admin';
  return '/';
};

export default function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const completeGoogleLogin = async () => {
      try {
        const params = new URLSearchParams(location.search);
        if (params.get('success') !== '1') {
          throw new Error('Google callback không hợp lệ');
        }

        // Backend has already stored a refresh token in a secure httpOnly cookie.
        // Exchange it for a short-lived access token; no JWT is exposed in the URL.
        const refreshResponse = await authService.refreshToken();
        const accessToken = refreshResponse?.data?.accessToken;
        if (!accessToken) throw new Error('Không nhận được phiên đăng nhập hợp lệ');

        const meResponse = await authService.getMe();
        const user = meResponse?.data?.user;
        if (!user?.id || !user?.role) throw new Error('Không lấy được thông tin tài khoản');

        login(accessToken, user);
        navigate(getRedirectByRole(user.role), { replace: true });
      } catch {
        navigate('/auth?error=google_failed', { replace: true });
      }
    };

    void completeGoogleLogin();
  }, [location.search, login, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border text-success" role="status" aria-label="Đang xử lý đăng nhập" />
        <p className="mt-3 text-muted">Đang hoàn tất đăng nhập Google...</p>
      </div>
    </div>
  );
}
