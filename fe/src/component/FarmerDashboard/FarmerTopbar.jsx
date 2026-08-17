import React from 'react';
import DashboardTopbar from '../Common/Dashboard/DashboardTopbar';

function FarmerTopbar() {
  return (
    <DashboardTopbar
      classPrefix="farmer"
      role="farmer"
      sectionLabel="Farmer dashboard"
      title="Quản lý nông sản và hợp đồng"
      searchPlaceholder="Tìm mùa vụ, hợp đồng, đơn hàng..."
      defaultName="Nông dân PreOnic"
    />
  );
}

export default FarmerTopbar;
