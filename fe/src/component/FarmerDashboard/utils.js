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

export function getInitials(name = 'Nông dân') {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function getStatusClass(status = '') {
  const value = String(status || '').trim().toLowerCase();

  // Nông sản đang hoạt động + các trạng thái hoàn tất/thành công
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

  // Tranh chấp cần tách riêng khỏi warning để dễ nhận biết
  if (value.includes('tranh chấp') || value.includes('dispute')) return 'dispute';

  // Các trạng thái đang chờ / chuẩn bị
  if (
    value.includes('chờ') ||
    value.includes('chuẩn bị') ||
    value.includes('đợi') ||
    value.includes('pending')
  ) return 'warning';

  // Các trạng thái đang thực hiện
  if (
    value.includes('đàm phán') ||
    value.includes('giao') ||
    value.includes('tạo lệnh') ||
    value.includes('chăm sóc') ||
    value.includes('vận chuyển') ||
    value.includes('kiểm tra')
  ) return 'info';

  // Hủy / rủi ro
  if (
    value.includes('hủy') ||
    value.includes('cancel') ||
    value.includes('rủi ro') ||
    value.includes('thất bại')
  ) return 'danger';

  // Nông sản tạm ngừng/inactive giữ màu xám trung tính
  if (
    value === 'inactive' ||
    value.includes('tạm ngừng') ||
    value.includes('ngừng bán')
  ) return 'neutral';

  return 'neutral';
}

export function getStoredProducts() {
  try {
    const raw = localStorage.getItem('preonic_farmer_products');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredProduct(product) {
  const current = getStoredProducts();
  const next = [product, ...current];
  localStorage.setItem('preonic_farmer_products', JSON.stringify(next));
  return next;
}
