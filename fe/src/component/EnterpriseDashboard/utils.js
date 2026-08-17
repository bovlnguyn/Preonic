import {
  formatDate,
  formatMoney,
  getInitials as getSharedInitials,
} from '../../utils/dashboard';

export { formatDate, formatMoney };

export function getInitials(name = 'Doanh nghiệp') {
  return getSharedInitials(name, 'Doanh nghiệp');
}

export function getStatusClass(status = '') {
  const value = String(status || '')
    .trim()
    .toLowerCase();

  if (value.includes('tranh chấp') || value.includes('dispute')) {
    return 'dispute';
  }

  if (
    value.includes('hoàn tất') ||
    value.includes('hoàn thành') ||
    value.includes('completed') ||
    value.includes('đã giao') ||
    value.includes('đã thanh toán')
  ) {
    return 'success';
  }

  if (
    value.includes('hủy') ||
    value.includes('cancel') ||
    value.includes('rủi ro') ||
    value.includes('thất bại')
  ) {
    return 'danger';
  }

  if (
    value.includes('chờ') ||
    value.includes('chuẩn bị') ||
    value.includes('đang ký quỹ') ||
    value.includes('pending')
  ) {
    return 'warning';
  }

  if (
    value.includes('đang hiệu lực') ||
    value.includes('đang thực hiện') ||
    value.includes('vận chuyển') ||
    value.includes('kiểm tra') ||
    value.includes('giải ngân') ||
    value.includes('active')
  ) {
    return 'info';
  }

  if (
    value.includes('đã ký') ||
    value.includes('đang hợp tác')
  ) {
    return 'success';
  }

  return 'neutral';
}
