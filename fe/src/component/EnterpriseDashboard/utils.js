// utils.js

export function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'Chưa cập nhật';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function getInitials(name = 'Doanh nghiệp') {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function getStatusClass(status = '') {
  const value = String(status || '')
    .trim()
    .toLowerCase();

  // Tranh chấp: cam nhạt + chữ cam đậm
  if (
    value.includes('tranh chấp') ||
    value.includes('dispute')
  ) {
    return 'dispute';
  }

  // Hoàn thành thành công: xanh lá nhạt + chữ xanh lá đậm
  if (
    value.includes('hoàn tất') ||
    value.includes('hoàn thành') ||
    value.includes('completed') ||
    value.includes('đã giao') ||
    value.includes('đã thanh toán')
  ) {
    return 'success';
  }

  // Đã hủy / lỗi
  if (
    value.includes('hủy') ||
    value.includes('cancel') ||
    value.includes('rủi ro') ||
    value.includes('thất bại')
  ) {
    return 'danger';
  }

  // Các trạng thái đang chờ
  if (
    value.includes('chờ') ||
    value.includes('chuẩn bị') ||
    value.includes('đang ký quỹ') ||
    value.includes('pending')
  ) {
    return 'warning';
  }

  // Các trạng thái đang hoạt động / xử lý
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

  // Các trạng thái thành công khác
  if (
    value.includes('đã ký') ||
    value.includes('đang hợp tác')
  ) {
    return 'success';
  }

  return 'neutral';
}