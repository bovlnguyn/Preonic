import React from 'react';
import DashboardTopbar from '../Common/Dashboard/DashboardTopbar';

function EnterpriseTopbar() {
  return (
    <DashboardTopbar
      classPrefix="ent"
      role="enterprise"
      sectionLabel="Enterprise dashboard"
      title="Quản lý thu mua và chuỗi cung ứng"
      searchPlaceholder="Tìm nông dân, nông sản, hợp đồng..."
      defaultName="Doanh nghiệp PreOnic"
    />
  );
}

export default EnterpriseTopbar;
