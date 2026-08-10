import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const parseUserFromUrl = (value) => {
  if (!value) return null;

  // URLSearchParams đã decode query một lần; chỉ fallback decodeURIComponent
  // để tương thích callback cũ từng encode hai lần.
  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }
};

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

    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const user = parseUserFromUrl(params.get('user'));

    if (!token || !user?.id || !user?.role) {
      navigate('/auth?error=google_failed', { replace: true });
      return;
    }

    login(token, user);
    navigate(getRedirectByRole(user.role), { replace: true });
  }, [location.search, login, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border text-success" role="status" aria-label="Đang xử lý đăng nhập" />
        <p className="mt-3 text-muted">Đang xử lý đăng nhập Google...</p>
      </div>
    </div>
  );
}
