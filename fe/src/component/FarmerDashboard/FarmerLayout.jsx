import React from 'react';
import DashboardLayout from '../Common/Dashboard/DashboardLayout';
import FarmerSidebar from './FarmerSidebar';
import FarmerTopbar from './FarmerTopbar';
import './FarmerDashboard.css';

function FarmerLayout() {
  return (
    <DashboardLayout
      classPrefix="farmer"
      sidebar={<FarmerSidebar />}
      topbar={<FarmerTopbar />}
    />
  );
}

export default FarmerLayout;
