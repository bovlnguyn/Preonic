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


export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function getInitials(name = '', fallback = '') {
  const source = String(name || fallback || '').trim();
  if (!source) return '';

  return source
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getDashboardUserName(user, role, fallback) {
  const fullName = user?.fullName || user?.name;
  const splitName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  if (role === 'enterprise') {
    return fullName || splitName || user?.companyName || fallback || 'Doanh nghiệp PreOnic';
  }

  return fullName || splitName || fallback || 'Nông dân PreOnic';
}
