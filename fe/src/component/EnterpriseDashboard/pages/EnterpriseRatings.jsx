import React from 'react';
import PartnerRatingsPage from '../../Common/DashboardPages/PartnerRatingsPage';
import SectionHeader from '../components/SectionHeader';
import './EnterpriseRatings.css';

const CRITERIA_FIELDS = [
  { key: 'quality', label: 'Chất lượng sản phẩm' },
  { key: 'onTimeDelivery', label: 'Giao hàng đúng hạn' },
  { key: 'committedVolume', label: 'Đúng sản lượng cam kết' },
];

const VALUE_POINTS = [
  'Xếp hạng nông dân đáng tin cậy để hợp tác lâu dài',
  'Bảo vệ doanh nghiệp trước rủi ro chậm giao, sai sản lượng',
  'Tăng khả năng lập kế hoạch thu mua an toàn',
];

function EnterpriseRatings() {
  return (
    <PartnerRatingsPage
      shellPrefix="ent"
      classPrefix="er"
      spinnerClassName="text-primary"
      SectionHeader={SectionHeader}
      headerProps={{
        breadcrumb: 'Đánh giá đối tác',
        eyebrow: 'Đánh giá đối tác',
        title: 'Đánh giá chất lượng hợp tác theo từng hợp đồng',
        desc: 'Sau mỗi hợp đồng hoàn tất, doanh nghiệp có thể đánh giá nhà cung cấp theo các tiêu chí chất lượng, tiến độ và sản lượng để xây dựng điểm tin cậy.',
      }}
      criteriaFields={CRITERIA_FIELDS}
      valuePoints={VALUE_POINTS}
      roleTag="Doanh nghiệp đánh giá Nông dân"
      roleDescription="Đánh giá chất lượng, giao hàng đúng hạn và đúng sản lượng cam kết trước khi mở rộng hoặc gia hạn hợp tác."
    />
  );
}

export default EnterpriseRatings;
