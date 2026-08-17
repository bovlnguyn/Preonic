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
  both: 'Cả hai bên',
};

// Mốc đầu tiên chưa hoàn tất — bước hiện tại của quy trình giao nhận.
export const getActiveMilestone = (escrow) =>
  escrow?.milestones?.find((m) => m.status !== 'completed') || null;

export const getCurrentMilestoneLabel = (escrow) =>
  getActiveMilestone(escrow)?.name || 'Đã hoàn tất tất cả các mốc';

// Nhãn trạng thái đơn hàng dùng chung cho trang "Đơn hàng" của farmer/enterprise.
// Đơn hàng = hợp đồng đã active, tiến độ giao nhận theo dõi qua các mốc ký quỹ.
// Lưu ý: mốc số 5 có tên là "Hoàn tất" nhưng khi nó còn pending thì đơn hàng
// CHƯA xong — nên phải ghi rõ "đang chờ xác nhận", không được trả thẳng tên mốc,
// kẻo trùng với nhãn "Hoàn tất" của escrow đã thực sự đóng (escrow.status === 'completed').
export const getOrderStatusLabel = (contract, escrow) => {
  if (!escrow) return 'Đợi ký quỹ';
  if (escrow.status === 'disputed') return 'Tranh chấp';
  if (escrow.status === 'completed') return 'Hoàn tất';
  const current = getActiveMilestone(escrow);
  return current ? `Đang chờ xác nhận: ${current.name}` : 'Hoàn tất';
};
