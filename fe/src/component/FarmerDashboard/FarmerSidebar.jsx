import React from 'react';
import {
  FiBarChart2,
  FiBox,
  FiCloudRain,
  FiCreditCard,
  FiFileText,
  FiPackage,
  FiPlusCircle,
  FiShield,
  FiStar,
  FiTrendingUp,
} from 'react-icons/fi';
import DashboardSidebar from '../Common/Dashboard/DashboardSidebar';

const NAV_ITEMS = [
  { to: '/farmer/create-product', label: 'Đăng bán nông sản', icon: FiPlusCircle },
  { to: '/farmer', label: 'Tổng quan', icon: FiBarChart2, end: true },
  { to: '/farmer/crops', label: 'Mùa vụ của tôi', icon: FiPackage },
  { to: '/farmer/contracts', label: 'Hợp đồng', icon: FiFileText },
  { to: '/farmer/orders', label: 'Đơn hàng', icon: FiBox },
  { to: '/farmer/escrow', label: 'Thanh toán trung gian', icon: FiShield },
  { to: '/farmer/wallet', label: 'Ví & Thanh toán', icon: FiCreditCard },
  { to: '/farmer/finance', label: 'Tài chính', icon: FiTrendingUp },
  { to: '/farmer/ratings', label: 'Đánh giá đối tác', icon: FiStar },
  { to: '/farmer/weather-insurance', label: 'Thời tiết & Bảo hiểm', icon: FiCloudRain },
];

function FarmerSidebar() {
  return (
    <DashboardSidebar
      classPrefix="farmer"
      role="farmer"
      rootPath="/farmer"
      homePath="/farmer-home"
      workspaceLabel="Farmer workspace"
      navAriaLabel="Farmer dashboard navigation"
      defaultName="Nông dân PreOnic"
      navItems={NAV_ITEMS}
    />
  );
}

export default FarmerSidebar;
