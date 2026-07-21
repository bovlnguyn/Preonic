/**
 * Nhãn hiển thị cho escrow (ký quỹ) và milestone — dùng chung
 * cho cả giao diện farmer và enterprise.
 */

export const ESCROW_STATUS_LABEL = {
  pending: 'Chờ ký quỹ',
  active: 'Đang theo dõi',
  completed: 'Đã hoàn tất',
  disputed: 'Tranh chấp',
  refunded: 'Đã hoàn tiền',
  cancelled: 'Đã hủy',
};

export const MILESTONE_STATUS_LABEL = {
  pending: 'Chưa thực hiện',
  waiting_confirmation: 'Chờ xác nhận',
  completed: 'Đã hoàn tất',
  disputed: 'Tranh chấp',
};

export const MILESTONE_ROLE_LABEL = {
  farmer: 'Nông dân',
  enterprise: 'Doanh nghiệp',
  system: 'Hệ thống',
};
