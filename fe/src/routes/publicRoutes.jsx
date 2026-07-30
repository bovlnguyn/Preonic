import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import HomeEntry from './HomeEntry';



import Register from '../component/Register/Register';
import Auth from '../component/Auth/Auth';
import GoogleCallback from '../component/Auth/GoogleCallBack';
import GoogleSelectRole from '../component/Auth/GoogleSelectRole';
import ResetPassword from '../component/ResetPassword/ResetPassword';
import VerifyEmail from '../component/VerifyEmail/VerifyEmail';

import ProductList from '../pages/ProductList';
import ProductDetail from '../component/ProductDetail/ProductDetail';
import Solutions from '../component/Solutions/Solutions';
import Contact from '../component/Contact/Contact';
import AIAgriculture from '../component/AIAgriculture/AIAgriculture';

// Hồ sơ cá nhân — dùng chung Farmer/Enterprise, đứng ngoài layout dashboard
import Profile from '../component/Profile/Profile';

const publicRoutes = [
  { path: '/', element: <HomeEntry /> },
  { path: '/register', element: <Register /> },
  { path: '/auth', element: <Auth /> },

  // Google Auth
  { path: '/auth/google/callback', element: <GoogleCallback /> },
  { path: '/auth/google/select-role', element: <GoogleSelectRole /> },

  // Password / Email
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/reset-password/:token', element: <ResetPassword /> },
  { path: '/verify-email', element: <VerifyEmail /> },

  { path: '/products', element: <ProductList /> },
  { path: '/products/:id', element: <ProductDetail /> },
  { path: '/solutions', element: <Solutions /> },
  { path: '/contact', element: <Contact /> },
  { path: '/ai-agriculture', element: <AIAgriculture /> },


  {
    path: '/profile',
    element: (
      <ProtectedRoute allowedRoles={['farmer', 'enterprise']}>
        <Profile />
      </ProtectedRoute>
    ),
  },
];

export default publicRoutes;
