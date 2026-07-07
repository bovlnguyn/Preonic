import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from './utils';

function FarmerTopbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        <button
          type="button"
          className="farmer-profile-chip"
          title={farmerName}
          onClick={() => navigate('/profile')}
        >
          <span>{getInitials(farmerName)}</span>
          <strong>{farmerName}</strong>
        </button>
      </div>
    </header>
  );
}

export default FarmerTopbar;
