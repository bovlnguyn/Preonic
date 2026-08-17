import {
  formatDate,
  formatMoney,
  getInitials as getSharedInitials,
} from '../../utils/dashboard';

export { formatDate, formatMoney };

export function getInitials(name = 'Nông dân') {
  return getSharedInitials(name, 'Nông dân');
}

export function getStatusClass(status = '') {
  const value = String(status || '').trim().toLowerCase();

  if (
    value === 'active' ||
    value.includes('đang hoạt động') ||
    value.includes('hiệu lực') ||
    value.includes('hoàn tất') ||
    value.includes('hoàn thành') ||
    value.includes('completed') ||
    value.includes('sẵn') ||
    value.includes('đã ký')
  ) return 'success';

  if (value.includes('tranh chấp') || value.includes('dispute')) return 'dispute';

  if (
    value.includes('chờ') ||
    value.includes('chuẩn bị') ||
    value.includes('đợi') ||
    value.includes('pending')
  ) return 'warning';

  if (
    value.includes('đàm phán') ||
    value.includes('giao') ||
    value.includes('tạo lệnh') ||
    value.includes('chăm sóc') ||
    value.includes('vận chuyển') ||
    value.includes('kiểm tra')
  ) return 'info';

  if (
    value.includes('hủy') ||
    value.includes('cancel') ||
    value.includes('rủi ro') ||
    value.includes('thất bại')
  ) return 'danger';

  if (
    value === 'inactive' ||
    value.includes('tạm ngừng') ||
    value.includes('ngừng bán')
  ) return 'neutral';

  return 'neutral';
}
