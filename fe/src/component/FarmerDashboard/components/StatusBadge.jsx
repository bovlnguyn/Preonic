import React from 'react';
import { getStatusClass } from '../utils';

function StatusBadge({ status }) {
  return <span className={`farmer-badge farmer-badge--${getStatusClass(status)}`}>{status}</span>;
}

export default StatusBadge;
