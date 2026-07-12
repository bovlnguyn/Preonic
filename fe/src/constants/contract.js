/**
 * Nhan hien thi cho trang thai hop dong bao tieu — dung chung
 * cho ca giao dien farmer va enterprise.
 */

export const CONTRACT_STATUS_LABEL = {
  draft: 'Nháp',
  pending: 'Chờ nông dân xác nhận',
  approved: 'Đã duyệt',
  active: 'Đang hiệu lực',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  disputed: 'Tranh chấp',
};

export const PAYMENT_TERMS_LABEL = {
  '50_50': '50% đặt cọc — 50% khi nhận hàng',
  '30_70': '30% đặt cọc — 70% khi nhận hàng',
  '100_delivery': '100% khi nhận hàng',
  '100_upfront': '100% trả trước',
};
