import React from 'react';
import DashboardSectionHeader from '../../Common/Dashboard/SectionHeader';

function SectionHeader(props) {
  return <DashboardSectionHeader classPrefix="farmer" defaultHomePath="/farmer" {...props} />;
}

export default SectionHeader;
