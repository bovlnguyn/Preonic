import React from 'react';
import DashboardStatCard from '../../Common/Dashboard/StatCard';

function StatCard(props) {
  return <DashboardStatCard classPrefix="ent" tone="blue" {...props} />;
}

export default StatCard;
