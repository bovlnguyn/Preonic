import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import AdminDashboard from '../component/AdminDashboard/AdminDashboard';

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
