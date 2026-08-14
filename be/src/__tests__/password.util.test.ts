import {
  getPasswordPolicyChecks,
  getPasswordPolicyError,
} from '../utils/password.util';

describe('password policy', () => {
  it('accepts password matching the shared FE/BE policy', () => {
    expect(getPasswordPolicyError('PreOnic@2026')).toBeNull();
    expect(getPasswordPolicyChecks('PreOnic@2026')).toEqual({
      minLength: true,
      maxLength: true,
      hasLetter: true,
      hasNumber: true,
      hasSpecialCharacter: true,
      hasNoWhitespace: true,
    });
  });

  it.each([
    ['abc', 'ít nhất'],
    ['abcdef!', 'chữ số'],
    ['123456!', 'chữ cái'],
    ['abc123', 'ký tự đặc biệt'],
    ['abc 123!', 'khoảng trắng'],
  ])('rejects weak password %s', (password, expectedMessage) => {
    expect(getPasswordPolicyError(password)).toContain(expectedMessage);
  });
});
