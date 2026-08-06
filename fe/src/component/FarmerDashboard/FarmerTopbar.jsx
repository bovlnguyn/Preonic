import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { resolveImageUrl } from '../../services/product.service';
import NotificationBell from '../Notifications/NotificationBell';
import DashboardGlobalSearch from '../Common/DashboardGlobalSearch';
import { getInitials } from './utils';

function FarmerTopbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);

  const farmerName = user?.fullName || user?.name || 'Nông dân PreOnic';
  const avatarUrl = useMemo(() => resolveImageUrl(user?.avatar), [user?.avatar]);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  return (
    <header className="farmer-topbar">
      <div className="farmer-topbar__title">
        <span>Farmer dashboard</span>
        <h1>Quản lý nông sản và hợp đồng</h1>
      </div>

      <div className="farmer-topbar__actions">
        <DashboardGlobalSearch
          role="farmer"
          placeholder="Tìm mùa vụ, hợp đồng, đơn hàng..."
        />

        <NotificationBell triggerClassName="farmer-icon-button" />

        <button
          type="button"
          className="farmer-profile-chip"
          title={`Mở hồ sơ của ${farmerName}`}
          onClick={() => navigate('/profile')}
        >
          <span className="farmer-profile-chip__avatar" aria-hidden="true">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setAvatarError(true)}
              />
            ) : (
              getInitials(farmerName)
            )}
          </span>

          <span className="farmer-profile-chip__copy">
            <small>Xin chào</small>
            <strong>{farmerName}</strong>
          </span>
        </button>
      </div>
    </header>
  );
}

export default FarmerTopbar;
