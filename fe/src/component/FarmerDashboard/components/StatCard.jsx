import React from 'react';
import DashboardStatCard from '../../Common/Dashboard/StatCard';

function StatCard(props) {
  return <DashboardStatCard classPrefix="farmer" tone="green" {...props} />;
}

export default StatCard;
