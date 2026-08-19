import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../../contexts/AuthContext';
import { ROUTES } from '../../../constants';
import { getDashboardUserName } from '../../../utils/dashboard';
import LogoutConfirmModal from '../LogoutConfirmModal';
import logo from '../../../assets/branding/preonic-logo-main.png';

function DashboardSidebar({
  classPrefix,
  role,
  rootPath,
  homePath,
  workspaceLabel,
  navAriaLabel,
  defaultName,
  navItems,
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userName = getDashboardUserName(user, role, defaultName);

  const confirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.AUTH, { replace: true });
    } finally {
      setIsLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <>
      <aside className={`${classPrefix}-sidebar`}>
        <button className={`${classPrefix}-brand`} type="button" onClick={() => navigate(rootPath)}>
          <span className={`${classPrefix}-brand__logo`}>
            <img src={logo} alt="PreOnic" />
          </span>
          <span>
            <strong>PreOnic</strong>
            <small>{workspaceLabel}</small>
          </span>
        </button>

        <nav className={`${classPrefix}-nav`} aria-label={navAriaLabel}>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`${classPrefix}-sidebar__footer`}>
          <button type="button" onClick={() => navigate(homePath)}>
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
        role={role}
        userName={userName}
        loading={isLoggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}

export default DashboardSidebar;
