import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Home from './pages/Home';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// ── Components đã có ──
import Register from './component/Register/Register';
// ── Components chưa có — tạo placeholder, thay bằng thật sau ──
import Auth from './component/Auth/Auth';
const FarmerHome = () => <div className="p-5 text-center"><h3>🌾 Dashboard Farmer</h3></div>;
const EnterpriseHome = () => <div className="p-5 text-center"><h3>🏢 Dashboard Enterprise</h3></div>;

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