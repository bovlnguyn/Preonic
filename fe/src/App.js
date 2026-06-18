import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Home from './pages/Home';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GoogleCallback from './component/Auth/GoogleCallBack';
import GoogleSelectRole from './component/Auth/GoogleSelectRole';
import ResetPassword from './component/ResetPassword/ResetPassword';
import EnterpriseLayout           from './component/EnterpriseDashboard/EnterpriseLayout';
import EnterpriseOverview         from './component/EnterpriseDashboard/pages/EnterpriseOverview';
import EnterpriseContracts        from './component/EnterpriseDashboard/pages/EnterpriseContracts';
import EnterpriseProducts         from './component/EnterpriseDashboard/pages/EnterpriseProducts';
import EnterpriseOrders           from './component/EnterpriseDashboard/pages/EnterpriseOrders';
import EnterpriseEscrow           from './component/EnterpriseDashboard/pages/EnterpriseEscrow';
import EnterpriseWallet           from './component/EnterpriseDashboard/pages/EnterpriseWallet';
import EnterpriseSuppliers        from './component/EnterpriseDashboard/pages/EnterpriseSuppliers';
import EnterpriseTransactions     from './component/EnterpriseDashboard/pages/EnterpriseTransactions';
import EnterpriseRatings          from './component/EnterpriseDashboard/pages/EnterpriseRatings';
import EnterpriseWeatherInsurance from './component/EnterpriseDashboard/pages/EnterpriseWeatherInsurance';

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
    return <Navigate to={user.role === 'farmer' ? '/farmer-home' : '/enterprise'} replace />;
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
      <Route path="/reset-password" element={<ResetPassword />} />
{/* Protected — Farmer */}
      <Route path="/farmer-home" element={
        <ProtectedRoute allowedRoles={['farmer']}>
          <FarmerHome />
        </ProtectedRoute>
      } />

      {/* Protected — Enterprise */}
      <Route
  path="/enterprise"
  element={
    <ProtectedRoute allowedRoles={['enterprise']}>
      <EnterpriseLayout />
    </ProtectedRoute>
  }
>
  <Route index                  element={<EnterpriseOverview />} />
  <Route path="contracts"       element={<EnterpriseContracts />} />
  <Route path="products"        element={<EnterpriseProducts />} />
  <Route path="orders"          element={<EnterpriseOrders />} />
  <Route path="escrow"          element={<EnterpriseEscrow />} />
  <Route path="wallet"          element={<EnterpriseWallet />} />
  <Route path="suppliers"       element={<EnterpriseSuppliers />} />
  <Route path="transactions"    element={<EnterpriseTransactions />} />
  <Route path="ratings"         element={<EnterpriseRatings />} />
  <Route path="weather"         element={<EnterpriseWeatherInsurance />} />
</Route>

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