import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiBarChart2, FiBriefcase, FiCloudRain, FiCreditCard,
  FiFileText, FiHome, FiLogOut, FiPackage,
  FiShield, FiStar, FiTruck, FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import LogoutConfirmModal from '../Common/LogoutConfirmModal';
import logo from '../../assets/branding/preonic-logo-main.png';

const navItems = [
  { to: '/enterprise', label: 'Tổng quan', icon: FiBarChart2, end: true },
  { to: '/enterprise/contracts', label: 'Hợp đồng', icon: FiFileText },
  { to: '/enterprise/products', label: 'Danh sách sản phẩm', icon: FiPackage },
  { to: '/enterprise/orders', label: 'Theo dõi đơn hàng', icon: FiTruck },
  { to: '/enterprise/escrow', label: 'Thanh toán trung gian', icon: FiShield },
  { to: '/enterprise/wallet', label: 'Ví & Thanh toán', icon: FiCreditCard },
  { to: '/enterprise/suppliers', label: 'Nhà cung cấp', icon: FiUsers },
  { to: '/enterprise/transactions', label: 'Lịch sử giao dịch', icon: FiBriefcase },
  { to: '/enterprise/ratings', label: 'Đánh giá đối tác', icon: FiStar },
  { to: '/enterprise/weather-insurance', label: 'Thời tiết & Bảo hiểm', icon: FiCloudRain },
];

function EnterpriseSidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const enterpriseName = user?.fullName || user?.name || 'Doanh nghiệp PreOnic';

  const confirmLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await Promise.resolve(logout?.());
      setLogoutOpen(false);
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <aside className="ent-sidebar">
        <button className="ent-brand" type="button" onClick={() => navigate('/enterprise')}>
          <span className="ent-brand__logo">
            <img src={logo} alt="PreOnic" />
          </span>
          <span>
            <strong>PreOnic</strong>
            <small>Enterprise workspace</small>
          </span>
        </button>

        <nav className="ent-nav" aria-label="Enterprise dashboard navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ent-sidebar__footer">
          <button type="button" onClick={() => navigate('/enterprise-home')}>
            <FiHome />
            <span>Về trang chủ</span>
          </button>
          <button type="button" onClick={() => setLogoutOpen(true)}>
            <FiLogOut />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <LogoutConfirmModal
        open={logoutOpen}
        role="enterprise"
        userName={enterpriseName}
        loading={isLoggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}

export default EnterpriseSidebar;
