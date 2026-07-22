import { useRoutes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import publicRoutes from './publicRoutes';
import farmerRoutes from './farmerRoutes';
import enterpriseRoutes from './enterpriseRoutes';
import adminRoutes from './adminRoutes';
import notFoundRoute from './notFoundRoute';

const allRoutes = [
  ...publicRoutes,
  ...farmerRoutes,
  ...enterpriseRoutes,
  ...adminRoutes,
  notFoundRoute,
];

const AppRoutes = () => {
  const { loading } = useAuth();
  const element = useRoutes(allRoutes);

  if (loading) {
    return <LoadingSpinner />;
  }

  return element;
};

export default AppRoutes;
