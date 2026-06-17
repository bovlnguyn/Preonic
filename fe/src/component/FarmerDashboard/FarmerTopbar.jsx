import React from 'react';
import { FiBell, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from './utils';

function FarmerTopbar() {
  const { user } = useAuth();
  const farmerName = user?.fullName || user?.name || 'Nông dân PreOnic';

  return (
    <header className="farmer-topbar">
      <div className="farmer-topbar__title">
        <span>Farmer dashboard</span>
        <h1>Quản lý nông sản và hợp đồng</h1>
      </div>

      <div className="farmer-topbar__actions">
        <label className="farmer-search">
          <FiSearch />
          <input type="search" placeholder="Tìm mùa vụ, hợp đồng, đơn hàng..." />
        </label>
        <button className="farmer-icon-button" type="button" aria-label="Thông báo">
          <FiBell />
          <span />
        </button>
        <div className="farmer-profile-chip" title={farmerName}>
          <span>{getInitials(farmerName)}</span>
          <strong>{farmerName}</strong>
        </div>
      </div>
    </header>
  );
}

export default FarmerTopbar;
