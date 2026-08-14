import React, { lazy } from 'react';
import ProtectedRoute from './ProtectedRoute';

const HomeEntry = lazy(() => import('./HomeEntry'));
const Register = lazy(() => import('../component/Register/Register'));
const Auth = lazy(() => import('../component/Auth/Auth'));
const GoogleCallback = lazy(() => import('../component/Auth/GoogleCallBack'));
const GoogleSelectRole = lazy(() => import('../component/Auth/GoogleSelectRole'));
const ResetPassword = lazy(() => import('../component/ResetPassword/ResetPassword'));
const VerifyEmail = lazy(() => import('../component/VerifyEmail/VerifyEmail'));
const ProductList = lazy(() => import('../pages/ProductList'));
const ProductDetail = lazy(() => import('../component/ProductDetail/ProductDetail'));
const Solutions = lazy(() => import('../component/Solutions/Solutions'));
const Contact = lazy(() => import('../component/Contact/Contact'));
const AIAgriculture = lazy(() => import('../component/AIAgriculture/AIAgriculture'));
const Profile = lazy(() => import('../component/Profile/Profile'));

const publicRoutes = [
  { path: '/', element: <HomeEntry /> },
  { path: '/register', element: <Register /> },
  { path: '/auth', element: <Auth /> },
  { path: '/auth/google/callback', element: <GoogleCallback /> },
  { path: '/auth/google/select-role', element: <GoogleSelectRole /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/reset-password/:token', element: <ResetPassword /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/products', element: <ProductList /> },
  { path: '/products/:id', element: <ProductDetail context="public" /> },
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
