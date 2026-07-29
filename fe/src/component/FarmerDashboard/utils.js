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
  const value = status.toLowerCase();
  if (value.includes('chờ') || value.includes('chuẩn bị') || value.includes('đợi')) return 'warning';
  if (value.includes('hiệu lực') || value.includes('hoàn') || value.includes('sẵn') || value.includes('đã ký')) return 'success';
  if (value.includes('đàm phán') || value.includes('giao') || value.includes('tạo lệnh') || value.includes('chăm sóc')) return 'info';
  if (value.includes('hủy') || value.includes('rủi ro')) return 'danger';
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
