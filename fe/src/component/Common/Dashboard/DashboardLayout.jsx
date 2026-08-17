import React from 'react';
import { Outlet } from 'react-router-dom';

function DashboardLayout({ classPrefix, sidebar, topbar }) {
  return (
    <div className={`${classPrefix}-dashboard`}>
      {sidebar}
      <main className={`${classPrefix}-main`}>
        {topbar}
        <div className={`${classPrefix}-page`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
