import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function GoogleCallback() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params      = new URLSearchParams(location.search);
    const token       = params.get('token');
    const userString  = params.get('user');

    if (token && userString) {
      try {
        const user = JSON.parse(decodeURIComponent(userString));
        login(token, user);

        if (user.role === 'farmer')     navigate('/farmer-home', { replace: true });
        else if (user.role === 'enterprise') navigate('/enterprise-home', { replace: true });
        else navigate('/', { replace: true });

      } catch {
        navigate('/auth?error=google_failed', { replace: true });
      }
    } else {
      navigate('/auth?error=google_failed', { replace: true });
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border text-success" role="status" />
        <p className="mt-3 text-muted">Đang xử lý đăng nhập Google...</p>
      </div>
    </div>
  );
}