import React from 'react';

function ProgressBar({ classPrefix, value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className={`${classPrefix}-progress`} aria-label={`Tiến độ ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export default ProgressBar;
