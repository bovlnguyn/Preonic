import React from 'react';
import DashboardStatusBadge from '../../Common/Dashboard/StatusBadge';
import { getStatusClass } from '../utils';

function StatusBadge(props) {
  return <DashboardStatusBadge classPrefix="ent" resolveStatusClass={getStatusClass} {...props} />;
}

export default StatusBadge;
