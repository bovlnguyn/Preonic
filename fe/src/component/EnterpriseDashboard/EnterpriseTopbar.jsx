import React from 'react';
import { FiBell, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from './utils';

function EnterpriseTopbar() {
  const { user } = useAuth();
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
        <button className="ent-icon-button" type="button" aria-label="Thông báo">
          <FiBell /><span />
        </button>
        <div className="ent-profile-chip" title={entName}>
          <span>{getInitials(entName)}</span>
          <strong>{entName}</strong>
        </div>
      </div>
    </header>
  );
}

export default EnterpriseTopbar;