import { PASSWORD_MIN_LENGTH } from '../constants';

export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyChecks = {
  minLength: boolean;
  maxLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialCharacter: boolean;
  hasNoWhitespace: boolean;
};

export const getPasswordPolicyChecks = (password: unknown): PasswordPolicyChecks => {
  const value = typeof password === 'string' ? password : '';
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    maxLength: value.length <= PASSWORD_MAX_LENGTH,
    hasLetter: /[A-Za-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecialCharacter: /[^A-Za-z0-9\s]/.test(value),
    hasNoWhitespace: value.length > 0 && !/\s/.test(value),
  };
};

export const getPasswordPolicyError = (
  password: unknown,
  label: string = 'Mật khẩu'
): string | null => {
  const checks = getPasswordPolicyChecks(password);

  if (!checks.minLength) return `${label} phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  if (!checks.maxLength) return `${label} không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự`;
  if (!checks.hasLetter) return `${label} phải có ít nhất một chữ cái`;
  if (!checks.hasNumber) return `${label} phải có ít nhất một chữ số`;
  if (!checks.hasSpecialCharacter) return `${label} phải có ít nhất một ký tự đặc biệt`;
  if (!checks.hasNoWhitespace) return `${label} không được chứa khoảng trắng`;
  return null;
};

export const assertStrongPassword = (password: unknown, label: string = 'Mật khẩu'): true => {
  const error = getPasswordPolicyError(password, label);
  if (error) throw new Error(error);
  return true;
};
