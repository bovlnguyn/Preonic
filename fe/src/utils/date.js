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
