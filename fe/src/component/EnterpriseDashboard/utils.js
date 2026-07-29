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
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(value));
}

export function getInitials(name = 'Doanh nghiệp') {
  return name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
}

export function getStatusClass(status = '') {
  const v = status.toLowerCase();
  if (v.includes('chờ') || v.includes('chuẩn bị') || v.includes('đang ký quỹ'))                                return 'warning';
  if (v.includes('hoàn thành') || v.includes('đã ký') || v.includes('đang hợp tác') || v.includes('đã giao'))  return 'success';
  if (v.includes('đang') || v.includes('vận chuyển') || v.includes('kiểm tra') || v.includes('giải ngân'))     return 'info';
  if (v.includes('hủy') || v.includes('rủi ro'))                                                                return 'danger';
  return 'neutral';
}