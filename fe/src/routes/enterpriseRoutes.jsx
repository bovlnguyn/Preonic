import React, { lazy } from 'react';
import ProtectedRoute from './ProtectedRoute';

// Fix 08: route-level code splitting. Mỗi nhóm trang chỉ được tải khi người dùng
// thực sự điều hướng tới route đó, thay vì nhét toàn bộ Enterprise site/dashboard
// vào initial JavaScript bundle.
const EnterpriseHome = lazy(() => import('../component/EnterpriseHome/EnterpriseHome'));
const EnterpriseProductsPage = lazy(() => import('../component/EnterpriseProducts/EnterpriseProducts'));
const EnterpriseSolutions = lazy(() => import('../component/EnterpriseSolutions/EnterpriseSolutions'));
const EnterpriseContact = lazy(() => import('../component/EnterpriseContact/EnterpriseContact'));
const EnterpriseAI = lazy(() => import('../component/EnterpriseAI/EnterpriseAI'));

const EnterpriseLayout = lazy(() => import('../component/EnterpriseDashboard/EnterpriseLayout'));
const EnterpriseOverview = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseOverview'));
const EnterpriseContracts = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseContracts'));
const EnterpriseProducts = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseProducts'));
const EnterpriseOrders = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseOrders'));
const EnterpriseEscrow = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseEscrow'));
const EnterpriseWallet = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseWallet'));
const EnterpriseSuppliers = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseSuppliers'));
const EnterpriseTransactions = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseTransactions'));
const EnterpriseRatings = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseRatings'));
const EnterpriseWeatherInsurance = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseWeatherInsurance'));
const EnterpriseCreateContract = lazy(() => import('../component/EnterpriseDashboard/pages/EnterpriseCreateContract'));

const ContractDetailView = lazy(() => import('../component/ContractDetailView/ContractDetailView'));
const ProductDetail = lazy(() => import('../component/ProductDetail/ProductDetail'));
const EnterpriseSupplierDetail = lazy(() => import('../component/EnterpriseSupplierDetail/EnterpriseSupplierDetail'));

const forEnterprise = (element) => (
  <ProtectedRoute allowedRoles={['enterprise']}>{element}</ProtectedRoute>
);

const enterpriseRoutes = [
  { path: '/enterprise-home', element: forEnterprise(<EnterpriseHome />) },
  { path: '/enterprise-products', element: forEnterprise(<EnterpriseProductsPage />) },
  { path: '/enterprise-products/:id', element: forEnterprise(<ProductDetail context="enterprise-site" />) },
  { path: '/enterprise-solutions', element: forEnterprise(<EnterpriseSolutions />) },
  { path: '/enterprise-contact', element: forEnterprise(<EnterpriseContact />) },
  { path: '/enterprise-ai-agriculture', element: forEnterprise(<EnterpriseAI />) },

  {
    path: '/enterprise',
    element: forEnterprise(<EnterpriseLayout />),
    children: [
      { index: true, element: <EnterpriseOverview /> },
      { path: 'contracts', element: <EnterpriseContracts /> },
      { path: 'contracts/create', element: <EnterpriseCreateContract /> },
      { path: 'contracts/:id', element: <ContractDetailView /> },
      { path: 'products', element: <EnterpriseProducts /> },
      { path: 'products/:id', element: <ProductDetail context="enterprise" /> },
      { path: 'orders', element: <EnterpriseOrders /> },
      { path: 'escrow', element: <EnterpriseEscrow /> },
      { path: 'wallet', element: <EnterpriseWallet /> },
      { path: 'suppliers', element: <EnterpriseSuppliers /> },
      { path: 'suppliers/:id', element: <EnterpriseSupplierDetail /> },
      { path: 'transactions', element: <EnterpriseTransactions /> },
      { path: 'ratings', element: <EnterpriseRatings /> },
      { path: 'weather-insurance', element: <EnterpriseWeatherInsurance /> },
    ],
  },
];

export default enterpriseRoutes;
