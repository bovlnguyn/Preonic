import React from 'react';
import DashboardSectionHeader from '../../Common/Dashboard/SectionHeader';

function SectionHeader(props) {
  return <DashboardSectionHeader classPrefix="ent" defaultHomePath="/enterprise" {...props} />;
}

export default SectionHeader;
