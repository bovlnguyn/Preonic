import React, { lazy } from 'react';
import ProtectedRoute from './ProtectedRoute';

// Fix 08: chỉ tải code của route Farmer khi route đó thực sự được mở.
const FarmerHome = lazy(() => import('../component/FarmerHome/FarmerHome'));
const FarmerProducts = lazy(() => import('../component/FarmerProducts/FarmerProducts'));
const FarmerSolutions = lazy(() => import('../component/FarmerSolutions/FarmerSolutions'));
const FarmerContact = lazy(() => import('../component/FarmerContact/FarmerContact'));
const FarmerAI = lazy(() => import('../component/FarmerAI/FarmerAI'));

const FarmerLayout = lazy(() => import('../component/FarmerDashboard/FarmerLayout'));
const FarmerOverview = lazy(() => import('../component/FarmerDashboard/pages/FarmerOverview'));
const FarmerCrops = lazy(() => import('../component/FarmerDashboard/pages/FarmerCrops'));
const FarmerContracts = lazy(() => import('../component/FarmerDashboard/pages/FarmerContracts'));
const FarmerOrders = lazy(() => import('../component/FarmerDashboard/pages/FarmerOrders'));
const FarmerEscrow = lazy(() => import('../component/FarmerDashboard/pages/FarmerEscrow'));
const FarmerWallet = lazy(() => import('../component/FarmerDashboard/pages/FarmerWallet'));
const FarmerFinance = lazy(() => import('../component/FarmerDashboard/pages/FarmerFinance'));
const FarmerRatings = lazy(() => import('../component/FarmerDashboard/pages/FarmerRatings'));
const FarmerWeatherInsurance = lazy(() => import('../component/FarmerDashboard/pages/FarmerWeatherInsurance'));
const FarmerCreateProduct = lazy(() => import('../component/FarmerDashboard/pages/FarmerCreateProduct'));
const FarmerEditProduct = lazy(() => import('../component/FarmerDashboard/pages/FarmerEditProduct'));

const ContractDetailView = lazy(() => import('../component/ContractDetailView/ContractDetailView'));
const ProductDetail = lazy(() => import('../component/ProductDetail/ProductDetail'));

const forFarmer = (element) => (
  <ProtectedRoute allowedRoles={['farmer']}>{element}</ProtectedRoute>
);

const farmerRoutes = [
  { path: '/farmer-home', element: forFarmer(<FarmerHome />) },
  { path: '/farmer-products', element: forFarmer(<FarmerProducts />) },
  { path: '/farmer-solutions', element: forFarmer(<FarmerSolutions />) },
  { path: '/farmer-contact', element: forFarmer(<FarmerContact />) },
  { path: '/farmer-ai-agriculture', element: forFarmer(<FarmerAI />) },

  {
    path: '/farmer',
    element: forFarmer(<FarmerLayout />),
    children: [
      { index: true, element: <FarmerOverview /> },
      { path: 'crops', element: <FarmerCrops /> },
      { path: 'crops/:id', element: <ProductDetail context="farmer" /> },
      { path: 'contracts', element: <FarmerContracts /> },
      { path: 'contracts/:id', element: <ContractDetailView /> },
      { path: 'orders', element: <FarmerOrders /> },
      { path: 'escrow', element: <FarmerEscrow /> },
      { path: 'wallet', element: <FarmerWallet /> },
      { path: 'finance', element: <FarmerFinance /> },
      { path: 'ratings', element: <FarmerRatings /> },
      { path: 'weather-insurance', element: <FarmerWeatherInsurance /> },
      { path: 'create-product', element: <FarmerCreateProduct /> },
      { path: 'edit-product/:id', element: <FarmerEditProduct /> },
    ],
  },
];

export default farmerRoutes;
