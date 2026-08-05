import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { FiLogOut, FiX } from 'react-icons/fi';
import './LogoutConfirmModal.css';

function LogoutConfirmModal({
  open,
  role = 'farmer',
  userName = '',
  loading = false,
  onCancel,
  onConfirm,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const safeRole = role === 'enterprise' || role === 'admin' ? 'enterprise' : 'farmer';

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, onCancel, open]);

  if (!open || typeof document === 'undefined') return null;

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !loading) onCancel?.();
  };

  return createPortal(
    <div
      className={`logout-confirm logout-confirm--${safeRole}`}
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <section
        className="logout-confirm__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          type="button"
          className="logout-confirm__close"
          aria-label="Đóng hộp thoại đăng xuất"
          disabled={loading}
          onClick={onCancel}
        >
          <FiX />
        </button>

        <div className="logout-confirm__icon" aria-hidden="true">
          <FiLogOut />
        </div>

        <div className="logout-confirm__copy">
          <span>Phiên làm việc PreOnic</span>
          <h2 id={titleId}>Bạn muốn đăng xuất?</h2>
          <p id={descriptionId}>
            {userName ? (
              <>
                Phiên làm việc của <strong>{userName}</strong> trên thiết bị này sẽ kết thúc.
                Các thay đổi đã lưu vẫn được giữ nguyên.
              </>
            ) : (
              'Phiên làm việc trên thiết bị này sẽ kết thúc. Các thay đổi đã lưu vẫn được giữ nguyên.'
            )}
          </p>
        </div>

        <div className="logout-confirm__actions">
          <button
            type="button"
            className="logout-confirm__button logout-confirm__button--cancel"
            disabled={loading}
            onClick={onCancel}
            autoFocus
          >
            Không, ở lại
          </button>

          <button
            type="button"
            className="logout-confirm__button logout-confirm__button--confirm"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? <span className="logout-confirm__spinner" aria-hidden="true" /> : <FiLogOut />}
            <span>{loading ? 'Đang đăng xuất...' : 'Có, đăng xuất'}</span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default LogoutConfirmModal;
