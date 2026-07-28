import React from 'react';
import ProtectedRoute from './ProtectedRoute';

// Enterprise role website pages
import EnterpriseHome from '../component/EnterpriseHome/EnterpriseHome';
import EnterpriseProductsPage from '../component/EnterpriseProducts/EnterpriseProducts';
import EnterpriseSolutions from '../component/EnterpriseSolutions/EnterpriseSolutions';
import EnterpriseContact from '../component/EnterpriseContact/EnterpriseContact';
import EnterpriseAI from '../component/EnterpriseAI/EnterpriseAI';

// Enterprise Dashboard Layout + Pages
import EnterpriseLayout from '../component/EnterpriseDashboard/EnterpriseLayout';
import EnterpriseOverview from '../component/EnterpriseDashboard/pages/EnterpriseOverview';
import EnterpriseContracts from '../component/EnterpriseDashboard/pages/EnterpriseContracts';
import EnterpriseProducts from '../component/EnterpriseDashboard/pages/EnterpriseProducts';
import EnterpriseOrders from '../component/EnterpriseDashboard/pages/EnterpriseOrders';
import EnterpriseEscrow from '../component/EnterpriseDashboard/pages/EnterpriseEscrow';
import EnterpriseWallet from '../component/EnterpriseDashboard/pages/EnterpriseWallet';
import EnterpriseSuppliers from '../component/EnterpriseDashboard/pages/EnterpriseSuppliers';
import EnterpriseTransactions from '../component/EnterpriseDashboard/pages/EnterpriseTransactions';
import EnterpriseRatings from '../component/EnterpriseDashboard/pages/EnterpriseRatings';
import EnterpriseWeatherInsurance from '../component/EnterpriseDashboard/pages/EnterpriseWeatherInsurance';
import EnterpriseCreateContract from '../component/EnterpriseDashboard/pages/EnterpriseCreateContract';

// Dùng chung Farmer/Enterprise
import ContractDetailView from '../component/ContractDetailView/ContractDetailView';

const forEnterprise = (element) => (
  <ProtectedRoute allowedRoles={['enterprise']}>{element}</ProtectedRoute>
);

const enterpriseRoutes = [
  // Enterprise role website pages - chỉ dành cho enterprise đã đăng nhập
  { path: '/enterprise-home', element: forEnterprise(<EnterpriseHome />) },
  { path: '/enterprise-products', element: forEnterprise(<EnterpriseProductsPage />) },
  { path: '/enterprise-solutions', element: forEnterprise(<EnterpriseSolutions />) },
  { path: '/enterprise-contact', element: forEnterprise(<EnterpriseContact />) },
  { path: '/enterprise-ai-agriculture', element: forEnterprise(<EnterpriseAI />) },

  // Cấu hình các Dashboard thực tế của Enterprise
  {
    path: '/enterprise',
    element: forEnterprise(<EnterpriseLayout />),
    children: [
      { index: true, element: <EnterpriseOverview /> },
      { path: 'contracts', element: <EnterpriseContracts /> },
      { path: 'contracts/create', element: <EnterpriseCreateContract /> },
      { path: 'contracts/:id', element: <ContractDetailView /> },
      { path: 'products', element: <EnterpriseProducts /> },
      { path: 'orders', element: <EnterpriseOrders /> },
      { path: 'escrow', element: <EnterpriseEscrow /> },
      { path: 'wallet', element: <EnterpriseWallet /> },
      { path: 'suppliers', element: <EnterpriseSuppliers /> },
      { path: 'transactions', element: <EnterpriseTransactions /> },
      { path: 'ratings', element: <EnterpriseRatings /> },
      { path: 'weather-insurance', element: <EnterpriseWeatherInsurance /> },
    ],
  },
];

export default enterpriseRoutes;
