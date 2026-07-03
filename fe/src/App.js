import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';

import Home from './pages/Home';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Register from './component/Register/Register';
import Auth from './component/Auth/Auth';
import GoogleCallback from './component/Auth/GoogleCallBack';
import GoogleSelectRole from './component/Auth/GoogleSelectRole';
import ResetPassword from './component/ResetPassword/ResetPassword';

// Enterprise Dashboard
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

// Farmer Dashboard Layout + Pages
import FarmerLayout from './component/FarmerDashboard/FarmerLayout';
import FarmerOverview from './component/FarmerDashboard/pages/FarmerOverview';
import FarmerCrops from './component/FarmerDashboard/pages/FarmerCrops';
import FarmerContracts from './component/FarmerDashboard/pages/FarmerContracts';
import FarmerOrders from './component/FarmerDashboard/pages/FarmerOrders';
import FarmerEscrow from './component/FarmerDashboard/pages/FarmerEscrow';
import FarmerWallet from './component/FarmerDashboard/pages/FarmerWallet';
import FarmerRatings from './component/FarmerDashboard/pages/FarmerRatings';
import FarmerWeatherInsurance from './component/FarmerDashboard/pages/FarmerWeatherInsurance';
import FarmerCreateProduct from './component/FarmerDashboard/pages/FarmerCreateProduct';


// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'farmer') {
      return <Navigate to="/farmer" replace />;
    }

    if (user.role === 'enterprise') {
      return <Navigate to="/enterprise" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
};

// Routes chính
const AppRoutes = () => {
  const { loading } = useAuth();

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
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth" element={<Auth />} />

      {/* Google Auth */}
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/auth/google/select-role" element={<GoogleSelectRole />} />

      {/* Password / Email */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />


      {/* Route cũ sau login: giữ lại để không gãy luồng đăng nhập */}
      <Route
        path="/farmer-home"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <Navigate to="/farmer" replace />
          </ProtectedRoute>
        }
      />

      {/* Farmer Dashboard - Layout + Nested Pages */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <FarmerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FarmerOverview />} />
        <Route path="crops" element={<FarmerCrops />} />
        <Route path="contracts" element={<FarmerContracts />} />
        <Route path="orders" element={<FarmerOrders />} />
        <Route path="escrow" element={<FarmerEscrow />} />
        <Route path="wallet" element={<FarmerWallet />} />
        <Route path="ratings" element={<FarmerRatings />} />
        <Route path="weather-insurance" element={<FarmerWeatherInsurance />} />
        <Route path="create-product" element={<FarmerCreateProduct />} />
      </Route>

      {/* Enterprise */}
      <Route
  path="/enterprise-home"
  element={
    <ProtectedRoute allowedRoles={['enterprise']}>
      <Navigate to="/enterprise" replace />
    </ProtectedRoute>
  }
/>

{/* Cấu hình các Dashboard thực tế của Enterprise */}
<Route
  path="/enterprise"
  element={
    <ProtectedRoute allowedRoles={['enterprise']}>
      <EnterpriseLayout />
    </ProtectedRoute>
  }
>
  
  <Route index element={<EnterpriseOverview />} />
        <Route path="contracts" element={<EnterpriseContracts />} />
        <Route path="products" element={<EnterpriseProducts />} />
        <Route path="orders" element={<EnterpriseOrders />} />
        <Route path="escrow" element={<EnterpriseEscrow />} />
        <Route path="wallet" element={<EnterpriseWallet />} />
        <Route path="suppliers" element={<EnterpriseSuppliers />} />
        <Route path="transactions" element={<EnterpriseTransactions />} />
        <Route path="ratings" element={<EnterpriseRatings />} />
        <Route path="weather-insurance" element={<EnterpriseWeatherInsurance />} />
</Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-vh-100 d-flex align-items-center justify-content-center">
            <div className="text-center">
              <h1 className="display-1 text-muted">404</h1>
              <p className="text-muted">Trang không tồn tại</p>
              <a href="/" className="btn btn-success rounded-3">
                Về trang chủ
              </a>
            </div>
          </div>
        }
      />
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