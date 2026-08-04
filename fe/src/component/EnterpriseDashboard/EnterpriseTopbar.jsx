import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { resolveImageUrl } from '../../services/product.service';
import NotificationBell from '../Notifications/NotificationBell';
import { getInitials } from './utils';

function EnterpriseTopbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);

  const entName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.companyName ||
    'Doanh nghiệp PreOnic';
  const avatarUrl = resolveImageUrl(user?.avatar);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

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
          title={`Mở hồ sơ của ${entName}`}
          onClick={() => navigate('/profile')}
        >
          <span className="ent-profile-chip__avatar" aria-hidden="true">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt=""
                onError={() => setAvatarError(true)}
              />
            ) : (
              getInitials(entName)
            )}
          </span>
          <span className="ent-profile-chip__copy">
            <small>Xin chào</small>
            <strong>{entName}</strong>
          </span>
        </button>
      </div>
    </header>
  );
}

export default EnterpriseTopbar;
