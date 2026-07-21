import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Home from '../pages/Home';

// Trang / sẽ tự chuyển theo role nếu người dùng đã đăng nhập.
// Public Home chỉ dành cho khách chưa đăng nhập.
const HomeEntry = () => {
  const { user } = useAuth();

  if (user?.role === 'farmer') {
    return <Navigate to="/farmer-home" replace />;
  }
  if (user?.role === 'enterprise') {
    return <Navigate to="/enterprise-home" replace />;
  }
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Home />;
};

export default HomeEntry;
