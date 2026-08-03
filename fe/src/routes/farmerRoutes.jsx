import React from 'react';
import ProtectedRoute from './ProtectedRoute';

// Farmer role website pages
import FarmerHome from '../component/FarmerHome/FarmerHome';
import FarmerProducts from '../component/FarmerProducts/FarmerProducts';
import FarmerSolutions from '../component/FarmerSolutions/FarmerSolutions';
import FarmerContact from '../component/FarmerContact/FarmerContact';
import FarmerAI from '../component/FarmerAI/FarmerAI';

// Farmer Dashboard Layout + Pages
import FarmerLayout from '../component/FarmerDashboard/FarmerLayout';
import FarmerOverview from '../component/FarmerDashboard/pages/FarmerOverview';
import FarmerCrops from '../component/FarmerDashboard/pages/FarmerCrops';
import FarmerContracts from '../component/FarmerDashboard/pages/FarmerContracts';
import FarmerOrders from '../component/FarmerDashboard/pages/FarmerOrders';
import FarmerEscrow from '../component/FarmerDashboard/pages/FarmerEscrow';
import FarmerWallet from '../component/FarmerDashboard/pages/FarmerWallet';
import FarmerRatings from '../component/FarmerDashboard/pages/FarmerRatings';
import FarmerWeatherInsurance from '../component/FarmerDashboard/pages/FarmerWeatherInsurance';
import FarmerCreateProduct from '../component/FarmerDashboard/pages/FarmerCreateProduct';
import FarmerEditProduct from '../component/FarmerDashboard/pages/FarmerEditProduct';

// Dùng chung Farmer/Enterprise
import ContractDetailView from '../component/ContractDetailView/ContractDetailView';
import ProductDetail from '../component/ProductDetail/ProductDetail';

const forFarmer = (element) => (
  <ProtectedRoute allowedRoles={['farmer']}>{element}</ProtectedRoute>
);

const farmerRoutes = [
  // Farmer role website pages - chỉ dành cho farmer đã đăng nhập
  { path: '/farmer-home', element: forFarmer(<FarmerHome />) },
  { path: '/farmer-products', element: forFarmer(<FarmerProducts />) },
  { path: '/farmer-solutions', element: forFarmer(<FarmerSolutions />) },
  { path: '/farmer-contact', element: forFarmer(<FarmerContact />) },
  { path: '/farmer-ai-agriculture', element: forFarmer(<FarmerAI />) },

  // Farmer Dashboard - Layout + Nested Pages
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
      { path: 'ratings', element: <FarmerRatings /> },
      { path: 'weather-insurance', element: <FarmerWeatherInsurance /> },
      { path: 'create-product', element: <FarmerCreateProduct /> },
      { path: 'edit-product/:id', element: <FarmerEditProduct /> },
    ],
  },
];

export default farmerRoutes;
