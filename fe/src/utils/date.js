/**
 * YYYY-MM-DD theo ngày local của trình duyệt.
 * Không dùng toISOString() trực tiếp vì UTC có thể làm lùi ngày tại Việt Nam.
 */
export const toLocalDateInputValue = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

/**
 * Hiển thị thời gian tương đối theo tiếng Việt, sau một số ngày sẽ chuyển về ngày cụ thể.
 * dayThreshold cho phép từng màn hình giữ ngưỡng hiển thị hiện tại (chat: 7, thông báo: 30).
 */
export const formatRelativeTime = (
  value,
  { dayThreshold = 30, timeZone = 'Asia/Ho_Chi_Minh', fallback = '' } = {},
) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Vừa xong';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < dayThreshold) return `${diffDay} ngày trước`;

  return date.toLocaleDateString('vi-VN', { timeZone });
};
