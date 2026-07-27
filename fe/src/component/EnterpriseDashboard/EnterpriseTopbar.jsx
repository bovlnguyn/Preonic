import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';
import { getInitials } from './utils';

function EnterpriseTopbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const entName = user?.fullName || user?.name || 'Doanh nghiệp PreOnic';

  return (
    <header className="ent-topbar">
      <div className="ent-topbar__title">
        <span>Enterprise dashboard</span>
        <h1>Quản lý thu mua và chuỗi cung ứng</h1>
      </div>

      <div className="ent-topbar__actions">
        <label className="ent-search">
          <FiSearch />
          <input type="search" placeholder="Tìm nông dân, nông sản, hợp đồng..." />
        </label>
        <NotificationBell triggerClassName="ent-icon-button" />
        <button
          type="button"
          className="ent-profile-chip"
          title={entName}
          onClick={() => navigate('/profile')}
        >
          <span>{getInitials(entName)}</span>
          <strong>{entName}</strong>
        </button>
      </div>
    </header>
  );
}

export default EnterpriseTopbar;