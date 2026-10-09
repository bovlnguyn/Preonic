import React from 'react';
import {
  FiBarChart2,
  FiBriefcase,
  FiCloudRain,
  FiFileText,
  FiPackage,
  FiStar,
  FiTruck,
  FiUsers,
} from 'react-icons/fi';
import DashboardSidebar from '../Common/Dashboard/DashboardSidebar';

const NAV_ITEMS = [
  { to: '/enterprise', label: 'Tổng quan', icon: FiBarChart2, end: true },
  { to: '/enterprise/contracts', label: 'Hợp đồng', icon: FiFileText },
  { to: '/enterprise/products', label: 'Danh sách sản phẩm', icon: FiPackage },
  { to: '/enterprise/orders', label: 'Theo dõi đơn hàng', icon: FiTruck },
  { to: '/enterprise/billing', label: 'Thanh toán & Phí', icon: FiBriefcase },
  { to: '/enterprise/suppliers', label: 'Nhà cung cấp', icon: FiUsers },
  { to: '/enterprise/transactions', label: 'Lịch sử giao dịch', icon: FiBriefcase },
  { to: '/enterprise/ratings', label: 'Đánh giá đối tác', icon: FiStar },
  { to: '/enterprise/weather-insurance', label: 'Thời tiết & Bảo hiểm', icon: FiCloudRain },
];

function EnterpriseSidebar() {
  return (
    <DashboardSidebar
      classPrefix="ent"
      role="enterprise"
      rootPath="/enterprise"
      homePath="/enterprise-home"
      workspaceLabel="Enterprise workspace"
      navAriaLabel="Enterprise dashboard navigation"
      defaultName="Doanh nghiệp PreOnic"
      navItems={NAV_ITEMS}
    />
  );
}

export default EnterpriseSidebar;
