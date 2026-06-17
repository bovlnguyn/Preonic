import React from 'react';
import { Outlet } from 'react-router-dom';
import FarmerSidebar from './FarmerSidebar';
import FarmerTopbar from './FarmerTopbar';
import './FarmerDashboard.css';

function FarmerLayout() {
  return (
    <div className="farmer-dashboard">
      <FarmerSidebar />
      <main className="farmer-main">
        <FarmerTopbar />
        <div className="farmer-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default FarmerLayout;
