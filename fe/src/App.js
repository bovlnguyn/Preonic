import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Home from './pages/Home';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GoogleCallback from './component/Auth/GoogleCallBack';
import GoogleSelectRole from './component/Auth/GoogleSelectRole';

// ── Components đã có ──
import Register from './component/Register/Register';
// ── Components chưa có — tạo placeholder, thay bằng thật sau ──
import Auth from './component/Auth/Auth';
const FarmerHome = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <h3 className="mb-4">🌾 Dashboard Farmer</h3>
      <div className="d-flex gap-3">
        <button className="btn btn-outline-success rounded-3" onClick={() => navigate('/')}>
          🏠 Về trang chủ
        </button>
        <button className="btn btn-outline-danger rounded-3"
          onClick={async () => { await logout(); navigate('/'); }}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

const EnterpriseHome = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <h3 className="mb-4">🏢 Dashboard Enterprise</h3>
      <div className="d-flex gap-3">
        <button className="btn btn-outline-primary rounded-3" onClick={() => navigate('/')}>
          🏠 Về trang chủ
        </button>
        <button className="btn btn-outline-danger rounded-3"
          onClick={async () => { await logout(); navigate('/'); }}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

// ── Protected Route ──
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'farmer' ? '/farmer-home' : '/enterprise-home'} replace />;
  }

  return children;
};

// ── Routes chính ──
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth"     element={<Auth />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/auth/google/select-role" element={<GoogleSelectRole />} />
{/* Protected — Farmer */}
      <Route path="/farmer-home" element={
        <ProtectedRoute allowedRoles={['farmer']}>
          <FarmerHome />
        </ProtectedRoute>
      } />

      {/* Protected — Enterprise */}
      <Route path="/enterprise-home" element={
        <ProtectedRoute allowedRoles={['enterprise']}>
          <EnterpriseHome />
        </ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={
        <div className="min-vh-100 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <h1 className="display-1 text-muted">404</h1>
            <p className="text-muted">Trang không tồn tại</p>
            <a href="/" className="btn btn-success rounded-3">Về trang chủ</a>
          </div>
        </div>
      } />
    </Routes>
  );
};
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);     
      

export default App;