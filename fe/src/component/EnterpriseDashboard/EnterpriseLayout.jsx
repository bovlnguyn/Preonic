import React from 'react';
import DashboardLayout from '../Common/Dashboard/DashboardLayout';
import EnterpriseSidebar from './EnterpriseSidebar';
import EnterpriseTopbar from './EnterpriseTopbar';
import './EnterpriseDashboard.css';

function EnterpriseLayout() {
  return (
    <DashboardLayout
      classPrefix="ent"
      sidebar={<EnterpriseSidebar />}
      topbar={<EnterpriseTopbar />}
    />
  );
}

export default EnterpriseLayout;
