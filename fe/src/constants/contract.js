/**
 * Nhan hien thi cho trang thai hop dong bao tieu — dung chung
 * cho ca giao dien farmer va enterprise.
 */

export const CONTRACT_STATUS_LABEL = {
  draft: 'Nháp — chưa gửi cho nông dân',
  pending: 'Chờ ký xác nhận',
  approved: 'Đã ký đủ hai bên — chờ khóa ký quỹ',
  active: 'Đang hiệu lực',
  cancel_pending: 'Đang chờ xác nhận hủy',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  disputed: 'Tranh chấp',
};

/**
 * Nhan hien thi theo dung goc nhin nguoi xem (ai da ky, ai chua) — dung cho ca
 * trang danh sach va trang chi tiet de tranh nhan lan (vd: Enterprise van thay
 * "Cho nong dan xac nhan" du Farmer da ky roi).
 */
export const resolveContractStatusLabel = (contract) => {
  if (!contract) return '';
  if (contract.status === 'pending') {
    return contract.signedByFarmer ? 'Chờ doanh nghiệp ký' : 'Chờ nông dân xác nhận';
  }
  return CONTRACT_STATUS_LABEL[contract.status] || contract.status;
};

export const PAYMENT_TERMS_LABEL = {
  '50_50': '50% đặt cọc — 50% khi nhận hàng',
  '30_70': '30% đặt cọc — 70% khi nhận hàng',
  '100_delivery': '100% khi nhận hàng',
  '100_upfront': '100% trả trước',
};

export const CAN_CANCEL_STATUSES = ['pending', 'draft', 'approved', 'active'];

export const CANCEL_PENDING_STATUS = 'cancel_pending';

/**
 * Uoc luong tien do hop dong theo trang thai — dung cho cac thanh progress
 * o trang tong quan/danh sach khi chua co so lieu moc ky quy chi tiet.
 */
const CONTRACT_PROGRESS_BY_STATUS = {
  draft: 0,
  pending: 15,
  approved: 35,
  active: 65,
  cancel_pending: 65,
  completed: 100,
  disputed: 50,
  cancelled: 0,
};

export const resolveContractProgress = (contract) =>
  CONTRACT_PROGRESS_BY_STATUS[contract?.status] ?? 0;