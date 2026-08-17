import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { resolveImageUrl } from '../../../services/product.service';
import { getDashboardUserName, getInitials } from '../../../utils/dashboard';
import NotificationBell from '../../Notifications/NotificationBell';
import DashboardGlobalSearch from '../DashboardGlobalSearch';

function DashboardTopbar({
  classPrefix,
  role,
  sectionLabel,
  title,
  searchPlaceholder,
  defaultName,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);
  const userName = getDashboardUserName(user, role, defaultName);
  const avatarUrl = useMemo(() => resolveImageUrl(user?.avatar), [user?.avatar]);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  return (
    <header className={`${classPrefix}-topbar`}>
      <div className={`${classPrefix}-topbar__title`}>
        <span>{sectionLabel}</span>
        <h1>{title}</h1>
      </div>

      <div className={`${classPrefix}-topbar__actions`}>
        <DashboardGlobalSearch role={role} placeholder={searchPlaceholder} />
        <NotificationBell triggerClassName={`${classPrefix}-icon-button`} />

        <button
          type="button"
          className={`${classPrefix}-profile-chip`}
          title={`Mở hồ sơ của ${userName}`}
          onClick={() => navigate('/profile')}
        >
          <span className={`${classPrefix}-profile-chip__avatar`} aria-hidden="true">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setAvatarError(true)}
              />
            ) : (
              getInitials(userName, defaultName)
            )}
          </span>

          <span className={`${classPrefix}-profile-chip__copy`}>
            <small>Xin chào</small>
            <strong>{userName}</strong>
          </span>
        </button>
      </div>
    </header>
  );
}

export default DashboardTopbar;
