import React, { lazy } from 'react';
import ProtectedRoute from './ProtectedRoute';

const AdminDashboard = lazy(() => import('../component/AdminDashboard/AdminDashboard'));

const adminRoutes = [
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
];

export default adminRoutes;
