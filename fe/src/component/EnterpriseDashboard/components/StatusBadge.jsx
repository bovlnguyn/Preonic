import React from 'react';
import { getStatusClass } from '../utils';

function StatusBadge({ status }) {
  return (
    <span className={`ent-badge ent-badge--${getStatusClass(status)}`}>
      {status}
    </span>
  );
}

export default StatusBadge;