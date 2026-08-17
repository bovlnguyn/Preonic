import React from 'react';

function StatusBadge({ classPrefix, status, resolveStatusClass }) {
  return (
    <span className={`${classPrefix}-badge ${classPrefix}-badge--${resolveStatusClass(status)}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
