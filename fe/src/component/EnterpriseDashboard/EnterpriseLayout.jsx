import React from 'react';
import { Outlet } from 'react-router-dom';
import EnterpriseSidebar from './EnterpriseSidebar';
import EnterpriseTopbar from './EnterpriseTopbar';
import './EnterpriseDashboard.css';

function EnterpriseLayout() {
  return (
    <div className="ent-dashboard">
      <EnterpriseSidebar />
      <main className="ent-main">
        <EnterpriseTopbar />
        <div className="ent-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default EnterpriseLayout;