import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiBarChart2,
  FiBox,
  FiCloudRain,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiLogOut,
  FiPackage,
  FiPlusCircle,
  FiShield,
  FiShoppingBag,
  FiStar,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/branding/preonic-logo-main.png';

const navItems = [
  { to: '/farmer/create-product', label: 'Đăng bán nông sản', icon: FiPlusCircle },
  { to: '/farmer', label: 'Tổng quan', icon: FiBarChart2, end: true },
  { to: '/farmer/crops', label: 'Mùa vụ của tôi', icon: FiPackage },
  { to: '/farmer/contracts', label: 'Hợp đồng', icon: FiFileText },
  { to: '/farmer/orders', label: 'Đơn hàng', icon: FiBox },
  { to: '/farmer/escrow', label: 'Thanh toán trung gian', icon: FiShield },
  { to: '/farmer/wallet', label: 'Ví & Thanh toán', icon: FiCreditCard },
  { to: '/farmer/ratings', label: 'Đánh giá đối tác', icon: FiStar },
  { to: '/farmer/weather-insurance', label: 'Thời tiết & Bảo hiểm', icon: FiCloudRain },

];

function FarmerSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="farmer-sidebar">
      <button className="farmer-brand" type="button" onClick={() => navigate('/farmer')}>
        <span className="farmer-brand__logo">
          <img src={logo} alt="PreOnic" />
        </span>
        <span>
          <strong>PreOnic</strong>
          <small>Farmer workspace</small>
        </span>
      </button>

      <nav className="farmer-nav" aria-label="Farmer dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="farmer-sidebar__footer">
        <button type="button" onClick={() => navigate('/farmer-home')}>
          <FiHome />
          <span>Về trang chủ</span>
        </button>
        <button type="button" onClick={handleLogout}>
          <FiLogOut />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

export default FarmerSidebar;
