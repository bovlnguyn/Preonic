export const TRANSACTION_STATUS_LABELS = {
  completed: 'Hoàn tất',
  pending: 'Đang chờ',
  active: 'Đang hiệu lực',
  approved: 'Đã ký',
  draft: 'Nháp',
  disputed: 'Tranh chấp',
  refunded: 'Đã hoàn tiền',
  cancelled: 'Đã hủy',
};

export const getTransactionStatusTone = (status = '') => {
  if (['completed', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'draft'].includes(status)) return 'warning';
  if (['cancelled', 'disputed'].includes(status)) return 'danger';
  return 'neutral';
};
