import React from 'react';
import PartnerRatingsPage from '../../Common/DashboardPages/PartnerRatingsPage';
import SectionHeader from '../components/SectionHeader';
import './FarmerRatings.css';

const CRITERIA_FIELDS = [
  { key: 'transparency', label: 'Minh bạch điều khoản' },
  { key: 'paymentPunctuality', label: 'Thanh toán đúng hạn' },
  { key: 'coordination', label: 'Phối hợp hợp đồng trước mùa vụ' },
];

const VALUE_POINTS = [
  'Xếp hạng doanh nghiệp đáng tin cậy để hợp tác lâu dài',
  'Bảo vệ nông dân trước rủi ro chậm thanh toán',
  'Tăng khả năng lập kế hoạch gieo trồng an toàn',
];

function FarmerRatings() {
  return (
    <PartnerRatingsPage
      shellPrefix="farmer"
      classPrefix="fr"
      spinnerClassName="text-success"
      SectionHeader={SectionHeader}
      headerProps={{
        eyebrow: 'Rating đối tác 2 chiều',
        title: 'Đánh giá chéo Doanh nghiệp - Nông dân theo từng hợp đồng',
        desc: 'Sau mỗi hợp đồng hoàn tất giao hàng, hai bên có thể đánh giá nhau theo bộ tiêu chí riêng để xây dựng điểm tin cậy và giảm rủi ro hợp tác cho mùa vụ tiếp theo.',
      }}
      criteriaFields={CRITERIA_FIELDS}
      valuePoints={VALUE_POINTS}
      roleTag="Nông dân / Supplier đánh giá Doanh nghiệp"
      roleDescription="Đánh giá tính minh bạch, thanh toán và phối hợp hợp đồng trước mùa vụ để giảm rủi ro bị ép giá, chậm tiền."
    />
  );
}

export default FarmerRatings;
