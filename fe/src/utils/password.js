export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export const getPasswordPolicyChecks = (password = '') => {
  const value = String(password || '');
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    maxLength: value.length <= PASSWORD_MAX_LENGTH,
    hasLetter: /[A-Za-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecialCharacter: /[^A-Za-z0-9\s]/.test(value),
    hasNoWhitespace: value.length > 0 && !/\s/.test(value),
  };
};

export const getPasswordPolicyError = (password, label = 'Mật khẩu') => {
  const checks = getPasswordPolicyChecks(password);
  if (!checks.minLength) return `${label} phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  if (!checks.maxLength) return `${label} không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự`;
  if (!checks.hasLetter) return `${label} phải có ít nhất một chữ cái`;
  if (!checks.hasNumber) return `${label} phải có ít nhất một chữ số`;
  if (!checks.hasSpecialCharacter) return `${label} phải có ít nhất một ký tự đặc biệt`;
  if (!checks.hasNoWhitespace) return `${label} không được chứa khoảng trắng`;
  return '';
};
