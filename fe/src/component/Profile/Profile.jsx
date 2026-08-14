import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiUser, FiPhone, FiMapPin, FiCamera, FiMail,
  FiHome, FiBriefcase, FiHash, FiSave, FiStar, FiArrowLeft,
  FiLock, FiEye, FiEyeOff, FiShield, FiCheck, FiX,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import authService from '../../services/auth.service';
import { resolveImageUrl } from '../../services/product.service';
import { VN_DISTRICTS, VN_WARDS } from '../../data/vn-locations';
import { formatReputation } from '../../utils/rating';
import { getPasswordPolicyChecks, getPasswordPolicyError } from '../../utils/password';
import './Profile.css';

const VN_PROVINCES = Object.keys(VN_DISTRICTS || {});

const ROLE_LABEL = {
  farmer: 'Nông dân',
  enterprise: 'Doanh nghiệp',
  admin: 'Quản trị viên',
};

const buildForm = (user) => ({
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  phone: user?.phone || '',
  avatar: user?.avatar || '',
  province: user?.province || '',
  district: user?.district || '',
  ward: user?.ward || '',
  address: user?.address || '',
  farmName: user?.farmName || '',
  farmSize: user?.farmSize ?? '',
  companyName: user?.companyName || '',
  taxCode: user?.taxCode || '',
});

function getInitials(name = '') {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function Profile() {
  const { user, updateUser, setAccessToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isIncomplete = searchParams.get('incomplete') === '1';

  const [form, setForm] = useState(() => buildForm(user));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const avatarInputRef = useRef();

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwTouched, setPwTouched] = useState({});
  const [pwApiError, setPwApiError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setForm(buildForm(user));
  }, [user]);

  useEffect(() => {
    authService.getMe()
      .then((res) => {
        if (res.success && res.data?.user) updateUser(res.data.user);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(''); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Ảnh đại diện không được vượt quá 5MB');
      e.target.value = '';
      return;
    }
    setAvatarFile(file);
    e.target.value = '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'province') { next.district = ''; next.ward = ''; }
      if (name === 'district') { next.ward = ''; }
      return next;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Tên là bắt buộc';
    if (!form.lastName.trim()) e.lastName = 'Họ là bắt buộc';

    const phoneVal = form.phone.trim();
    if (!phoneVal) {
      e.phone = 'Số điện thoại là bắt buộc';
    } else if (/[^0-9]/.test(phoneVal)) {
      e.phone = 'Số điện thoại không được chứa chữ hoặc ký tự đặc biệt';
    } else if (!/^[0-9]{10,11}$/.test(phoneVal)) {
      e.phone = 'Số điện thoại phải có 10-11 chữ số';
    }

    if (!form.address.trim()) e.address = 'Địa chỉ cụ thể là bắt buộc';
    else if (form.address.trim().length > 500) e.address = 'Địa chỉ không được vượt quá 500 ký tự';
    if (!form.province.trim()) e.province = 'Vui lòng chọn tỉnh / thành phố';
    if (!form.district.trim()) e.district = 'Vui lòng chọn quận / huyện';

    if (user?.role === 'farmer') {
      if (!form.farmName.trim()) e.farmName = 'Tên trang trại là bắt buộc';
      else if (form.farmName.trim().length > 255) e.farmName = 'Tên trang trại không được vượt quá 255 ký tự';
    }

    if (user?.role === 'enterprise') {
      if (!form.companyName.trim()) e.companyName = 'Tên doanh nghiệp là bắt buộc';
      else if (form.companyName.trim().length > 255) e.companyName = 'Tên doanh nghiệp không được vượt quá 255 ký tự';
      if (!form.taxCode.trim()) e.taxCode = 'Mã số thuế là bắt buộc';
      else if (form.taxCode.trim().length > 20) e.taxCode = 'Mã số thuế không được vượt quá 20 ký tự';
    }

    if (form.farmSize !== '' && Number(form.farmSize) < 0) {
      e.farmSize = 'Diện tích phải là số không âm';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      province: form.province,
      district: form.district,
      ward: form.ward,
      address: form.address.trim(),
    };

    if (user?.role === 'farmer') {
      payload.farmName = form.farmName.trim();
      payload.farmSize = form.farmSize === '' ? undefined : Number(form.farmSize);
    }
    if (user?.role === 'enterprise') {
      payload.companyName = form.companyName.trim();
      payload.taxCode = form.taxCode.trim();
    }

    setSaving(true);
    try {
      const result = await authService.updateProfile(payload, avatarFile);
      if (result?.data?.user) updateUser(result.data.user);
      setAvatarFile(null);
      toast.success('Cập nhật hồ sơ thành công');
    } catch (err) {
      setApiError(err?.message || 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.');
      toast.error(err?.message || 'Cập nhật hồ sơ thất bại');
    } finally {
      setSaving(false);
    }
  };

  const isGoogleAccount = user?.authProvider === 'google';

  const getPasswordChecks = (passwordForm = pwForm) => {
    const currentPassword = passwordForm.currentPassword || '';
    const newPassword = passwordForm.newPassword || '';

    return {
      ...getPasswordPolicyChecks(newPassword),
      differsFromCurrent:
        isGoogleAccount ||
        !currentPassword ||
        !newPassword ||
        newPassword !== currentPassword,
    };
  };

  const getPasswordErrors = (passwordForm = pwForm) => {
    const passwordErrors = {};
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;
    const checks = getPasswordChecks(passwordForm);

    if (!isGoogleAccount && !currentPassword) {
      passwordErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!newPassword) {
      passwordErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else {
      const policyError = getPasswordPolicyError(newPassword, 'Mật khẩu mới');
      if (policyError) passwordErrors.newPassword = policyError;
      else if (!checks.differsFromCurrent) {
        passwordErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
      }
    }

    if (!confirmNewPassword) {
      passwordErrors.confirmNewPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (newPassword !== confirmNewPassword) {
      passwordErrors.confirmNewPassword = 'Mật khẩu xác nhận không khớp';
    }

    return passwordErrors;
  };

  const getVisiblePasswordErrors = (passwordForm, touchedFields) => {
    const allErrors = getPasswordErrors(passwordForm);

    return Object.keys(allErrors).reduce((visibleErrors, fieldName) => {
      if (touchedFields[fieldName]) {
        visibleErrors[fieldName] = allErrors[fieldName];
      }
      return visibleErrors;
    }, {});
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...pwForm, [name]: value };
    const nextTouched = { ...pwTouched, [name]: true };

    // Khi mật khẩu mới thay đổi, kiểm tra lại ô xác nhận nếu người dùng đã nhập ô này.
    if (name === 'newPassword' && pwForm.confirmNewPassword) {
      nextTouched.confirmNewPassword = true;
    }

    setPwForm(nextForm);
    setPwTouched(nextTouched);
    setPwErrors(getVisiblePasswordErrors(nextForm, nextTouched));
    setPwApiError('');
  };

  const handlePasswordBlur = (e) => {
    const { name } = e.target;
    const nextTouched = { ...pwTouched, [name]: true };

    setPwTouched(nextTouched);
    setPwErrors(getVisiblePasswordErrors(pwForm, nextTouched));
  };

  const validatePassword = () => {
    const touchedFields = {
      currentPassword: !isGoogleAccount,
      newPassword: true,
      confirmNewPassword: true,
    };
    const passwordErrors = getPasswordErrors(pwForm);

    setPwTouched(touchedFields);
    setPwErrors(passwordErrors);

    return Object.keys(passwordErrors).length === 0;
  };

  const passwordChecks = getPasswordChecks();
  const hasNewPassword = pwForm.newPassword.length > 0;

  const getRuleClassName = (isValid, isNeutral = !hasNewPassword) => {
    if (isNeutral) return 'profile-password-rule profile-password-rule--neutral';
    return `profile-password-rule ${isValid ? 'profile-password-rule--valid' : 'profile-password-rule--invalid'}`;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwApiError('');
    if (!validatePassword()) return;

    setPwSaving(true);
    try {
      const result = await authService.updatePassword(pwForm);
      if (result?.data?.accessToken) setAccessToken(result.data.accessToken);
      if (result?.data?.authProvider && result.data.authProvider !== user?.authProvider) {
        updateUser({ ...user, authProvider: result.data.authProvider });
      }
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setPwErrors({});
      setPwTouched({});
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      toast.success('Đổi mật khẩu thành công');
    } catch (err) {
      setPwApiError(err?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      toast.error(err?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setPwSaving(false);
    }
  };

  const districtOptions = VN_DISTRICTS?.[form.province] || [];
  const wardOptions = VN_WARDS?.[form.district] || [];
  const fullName = `${form.firstName} ${form.lastName}`.trim() || 'Chưa cập nhật';

  return (
    <div className="profile-page">
      <button type="button" className="profile-back-btn" onClick={() => navigate(-1)}>
        <FiArrowLeft /> Quay lại
      </button>

      <div className="profile-heading">
        <h1>Hồ sơ của tôi</h1>
        <p>Cập nhật thông tin cá nhân để đối tác dễ dàng liên hệ và xác minh giao dịch.</p>
      </div>

      {isIncomplete && !apiError && (
        <div className="profile-alert profile-alert--info">
          Vui lòng hoàn thiện đầy đủ thông tin bên dưới (đặc biệt là tên trang trại nếu bạn là Nông dân)
          để có thể đăng bán sản phẩm.
        </div>
      )}

      {apiError && (
        <div className="profile-alert profile-alert--error">{apiError}</div>
      )}

      <form className="profile-layout" onSubmit={handleSubmit} noValidate>
        <aside className="profile-card profile-card--side">
          <div
            className="profile-avatar profile-avatar--upload"
            onClick={() => avatarInputRef.current.click()}
            title="Nhấn để đổi ảnh đại diện"
          >
            {avatarPreview || form.avatar
              ? (
                <img
                  src={avatarPreview || resolveImageUrl(form.avatar)}
                  alt="Ảnh đại diện"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )
              : <span>{getInitials(fullName)}</span>}
            <div className="profile-avatar__overlay">
              <FiCamera />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={handleAvatarChange}
            />
          </div>
          <h3 className="profile-avatar__name">{fullName}</h3>
          <span className="profile-avatar__role">{ROLE_LABEL[user?.role] || user?.role}</span>
          <button
            type="button"
            className="profile-avatar__change-btn"
            onClick={() => avatarInputRef.current.click()}
          >
            <FiCamera /> Đổi ảnh đại diện
          </button>

          <div className="profile-meta">
            <div className="profile-meta__row">
              <span><FiMail /> Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div className="profile-meta__row">
              <span><FiStar /> Điểm uy tín</span>
              <strong>{formatReputation(user?.reputationScore, user?.totalRatings)}</strong>
            </div>
          </div>
        </aside>

        <div className="profile-card profile-card--main">
          <section className="profile-section">
            <h2>Thông tin cá nhân</h2>
            <div className="profile-row">
              <div className="profile-field">
                <label>Họ <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.lastName ? 'profile-input-icon--invalid' : ''}`}>
                  <FiUser />
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Nhập họ" />
                </div>
                {errors.lastName && <div className="profile-field-error">{errors.lastName}</div>}
              </div>
              <div className="profile-field">
                <label>Tên <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.firstName ? 'profile-input-icon--invalid' : ''}`}>
                  <FiUser />
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Nhập tên" />
                </div>
                {errors.firstName && <div className="profile-field-error">{errors.firstName}</div>}
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label>Số điện thoại <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.phone ? 'profile-input-icon--invalid' : ''}`}>
                  <FiPhone />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="09xx xxx xxx" />
                </div>
                {errors.phone && <div className="profile-field-error">{errors.phone}</div>}
              </div>
              <div className="profile-field">
                <label>Địa chỉ cụ thể <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.address ? 'profile-input-icon--invalid' : ''}`}>
                  <FiHome />
                  <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, tên đường..." />
                </div>
                {errors.address && <div className="profile-field-error">{errors.address}</div>}
              </div>
            </div>
          </section>

          <section className="profile-section">
            <h2>Địa chỉ hành chính</h2>
            <div className="profile-row">
              <div className="profile-field">
                <label>Tỉnh / Thành phố <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.province ? 'profile-input-icon--invalid' : ''}`}>
                  <FiMapPin />
                  <select name="province" value={form.province} onChange={handleChange}>
                    <option value="">Chọn tỉnh / thành phố</option>
                    {VN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {errors.province && <div className="profile-field-error">{errors.province}</div>}
              </div>
              <div className="profile-field">
                <label>Quận / Huyện <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.district ? 'profile-input-icon--invalid' : ''}`}>
                  <FiMapPin />
                  <select name="district" value={form.district} onChange={handleChange} disabled={!form.province}>
                    <option value="">{form.province ? 'Chọn quận / huyện' : '— chọn tỉnh trước —'}</option>
                    {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {errors.district && <div className="profile-field-error">{errors.district}</div>}
              </div>
            </div>

            <div className="profile-field">
              <label>Xã / Phường / Thị trấn <span className="profile-optional">(tùy chọn)</span></label>
              <div className="profile-input-icon">
                <FiMapPin />
                {wardOptions.length > 0 ? (
                  <select name="ward" value={form.ward} onChange={handleChange} disabled={!form.district}>
                    <option value="">{form.district ? 'Chọn xã / phường / thị trấn' : '— chọn quận/huyện trước —'}</option>
                    {wardOptions.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                ) : (
                  <input type="text" name="ward" value={form.ward} onChange={handleChange} placeholder="VD: Phường Dịch Vọng..." />
                )}
              </div>
            </div>
          </section>

          {user?.role === 'farmer' && (
            <section className="profile-section">
              <h2>Thông tin trang trại</h2>
              <div className="profile-row">
                <div className="profile-field">
                  <label>Tên trang trại <span className="profile-required">*</span></label>
                  <div className="profile-input-icon">
                    <FiBriefcase />
                    <input type="text" name="farmName" value={form.farmName} onChange={handleChange} placeholder="VD: Trang trại Xuân Thọ" />
                  </div>
                  {errors.farmName && <div className="profile-field-error">{errors.farmName}</div>}
                </div>
                <div className="profile-field">
                  <label>Diện tích canh tác (ha)</label>
                  <div className={`profile-input-icon ${errors.farmSize ? 'profile-input-icon--invalid' : ''}`}>
                    <FiHash />
                    <input type="number" min="0" step="0.1" name="farmSize" value={form.farmSize} onChange={handleChange} placeholder="0.0" />
                  </div>
                  {errors.farmSize && <div className="profile-field-error">{errors.farmSize}</div>}
                </div>
              </div>
            </section>
          )}

          {user?.role === 'enterprise' && (
            <section className="profile-section">
              <h2>Thông tin doanh nghiệp</h2>
              <div className="profile-row">
                <div className="profile-field">
                  <label>Tên doanh nghiệp <span className="profile-required">*</span></label>
                  <div className="profile-input-icon">
                    <FiBriefcase />
                    <input type="text" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Công ty TNHH..." />
                  </div>
                  {errors.companyName && <div className="profile-field-error">{errors.companyName}</div>}
                </div>
                <div className="profile-field">
                  <label>Mã số thuế <span className="profile-required">*</span></label>
                  <div className="profile-input-icon">
                    <FiHash />
                    <input type="text" name="taxCode" value={form.taxCode} onChange={handleChange} placeholder="VD: 0312345678" />
                  </div>
                  {errors.taxCode && <div className="profile-field-error">{errors.taxCode}</div>}
                </div>
              </div>
            </section>
          )}

          <div className="profile-actions">
            <button type="submit" className="profile-submit" disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />Đang lưu...</>
                : <><FiSave /> Lưu thay đổi</>}
            </button>
          </div>
        </div>
      </form>

      <form className="profile-card profile-password-card" onSubmit={handlePasswordSubmit} noValidate>
        <div className="profile-password-header">
          <div className="profile-password-header__icon" aria-hidden="true">
            <FiShield />
          </div>
          <div>
            <h2>Đổi mật khẩu</h2>
            <p className="profile-password-hint">
              {isGoogleAccount
                ? 'Thiết lập mật khẩu để có thể đăng nhập bằng email bên cạnh tài khoản Google.'
                : 'Mật khẩu mới cần đủ mạnh và không được trùng với mật khẩu hiện tại.'}
            </p>
          </div>
        </div>

        {pwApiError && (
          <div className="profile-alert profile-alert--error">{pwApiError}</div>
        )}

        <div className="profile-password-fields">
          {isGoogleAccount ? (
            <div className="profile-field profile-password-field--new">
              <label htmlFor="profile-new-password">Mật khẩu mới</label>
              <div className={`profile-input-icon ${pwErrors.newPassword ? 'profile-input-icon--invalid' : ''}`}>
                <FiLock />
                <input
                  id="profile-new-password"
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Nhập mật khẩu mới"
                  aria-invalid={Boolean(pwErrors.newPassword)}
                  aria-describedby="profile-password-rules profile-new-password-error"
                />
                <button
                  type="button"
                  className="profile-input-icon__toggle"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                >
                  {showNew ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {pwErrors.newPassword && (
                <div id="profile-new-password-error" className="profile-field-error" role="alert">
                  {pwErrors.newPassword}
                </div>
              )}
              <div id="profile-password-rules" className="profile-password-rules" aria-live="polite">
                <p className="profile-password-rules__title">Mật khẩu cần đáp ứng:</p>
                <div className="profile-password-rules__grid">
                  <div className={getRuleClassName(passwordChecks.minLength)}>
                    <span>{passwordChecks.minLength ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                    Ít nhất 6 ký tự
                  </div>
                  <div className={getRuleClassName(passwordChecks.hasLetter)}>
                    <span>{passwordChecks.hasLetter ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                    Có ít nhất một chữ cái
                  </div>
                  <div className={getRuleClassName(passwordChecks.hasNumber)}>
                    <span>{passwordChecks.hasNumber ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                    Có ít nhất một chữ số
                  </div>
                  <div className={getRuleClassName(passwordChecks.hasSpecialCharacter)}>
                    <span>{passwordChecks.hasSpecialCharacter ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                    Có ít nhất một ký tự đặc biệt
                  </div>
                  <div className={getRuleClassName(passwordChecks.hasNoWhitespace)}>
                    <span>{passwordChecks.hasNoWhitespace ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                    Không chứa khoảng trắng
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="profile-password-row">
              <div className="profile-field">
                <label htmlFor="profile-current-password">Mật khẩu hiện tại</label>
                <div className={`profile-input-icon ${pwErrors.currentPassword ? 'profile-input-icon--invalid' : ''}`}>
                  <FiLock />
                  <input
                    id="profile-current-password"
                    type={showCurrent ? 'text' : 'password'}
                    name="currentPassword"
                    autoComplete="current-password"
                    value={pwForm.currentPassword}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="Nhập mật khẩu hiện tại"
                    aria-invalid={Boolean(pwErrors.currentPassword)}
                    aria-describedby="profile-current-password-error"
                  />
                  <button
                    type="button"
                    className="profile-input-icon__toggle"
                    onClick={() => setShowCurrent((s) => !s)}
                    aria-label={showCurrent ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                  >
                    {showCurrent ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {pwErrors.currentPassword && (
                  <div id="profile-current-password-error" className="profile-field-error" role="alert">
                    {pwErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className="profile-field profile-password-field--new">
                <label htmlFor="profile-new-password">Mật khẩu mới</label>
                <div className={`profile-input-icon ${pwErrors.newPassword ? 'profile-input-icon--invalid' : ''}`}>
                  <FiLock />
                  <input
                    id="profile-new-password"
                    type={showNew ? 'text' : 'password'}
                    name="newPassword"
                    autoComplete="new-password"
                    value={pwForm.newPassword}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="Nhập mật khẩu mới"
                    aria-invalid={Boolean(pwErrors.newPassword)}
                    aria-describedby="profile-password-rules profile-new-password-error"
                  />
                  <button
                    type="button"
                    className="profile-input-icon__toggle"
                    onClick={() => setShowNew((s) => !s)}
                    aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                  >
                    {showNew ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {pwErrors.newPassword && (
                  <div id="profile-new-password-error" className="profile-field-error" role="alert">
                    {pwErrors.newPassword}
                  </div>
                )}

                <div id="profile-password-rules" className="profile-password-rules" aria-live="polite">
                  <p className="profile-password-rules__title">Mật khẩu cần đáp ứng:</p>
                  <div className="profile-password-rules__grid">
                    <div className={getRuleClassName(passwordChecks.minLength)}>
                      <span>{passwordChecks.minLength ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                      Ít nhất 6 ký tự
                    </div>
                    <div className={getRuleClassName(passwordChecks.hasLetter)}>
                      <span>{passwordChecks.hasLetter ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                      Có ít nhất một chữ cái
                    </div>
                    <div className={getRuleClassName(passwordChecks.hasNumber)}>
                      <span>{passwordChecks.hasNumber ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                      Có ít nhất một chữ số
                    </div>
                    <div className={getRuleClassName(passwordChecks.hasSpecialCharacter)}>
                      <span>{passwordChecks.hasSpecialCharacter ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                      Có ít nhất một ký tự đặc biệt
                    </div>
                    <div className={getRuleClassName(passwordChecks.hasNoWhitespace)}>
                      <span>{passwordChecks.hasNoWhitespace ? <FiCheck /> : hasNewPassword ? <FiX /> : '•'}</span>
                      Không chứa khoảng trắng
                    </div>
                    <div
                      className={getRuleClassName(
                        passwordChecks.differsFromCurrent,
                        !pwForm.currentPassword || !pwForm.newPassword,
                      )}
                    >
                      <span>
                        {!pwForm.currentPassword || !pwForm.newPassword
                          ? '•'
                          : passwordChecks.differsFromCurrent
                            ? <FiCheck />
                            : <FiX />}
                      </span>
                      Không trùng mật khẩu hiện tại
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="profile-field profile-password-confirm">
            <label htmlFor="profile-confirm-password">Xác nhận mật khẩu mới</label>
            <div className={`profile-input-icon ${pwErrors.confirmNewPassword ? 'profile-input-icon--invalid' : ''}`}>
              <FiLock />
              <input
                id="profile-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                name="confirmNewPassword"
                autoComplete="new-password"
                value={pwForm.confirmNewPassword}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                placeholder="Nhập lại mật khẩu mới"
                aria-invalid={Boolean(pwErrors.confirmNewPassword)}
                aria-describedby="profile-confirm-password-error"
              />
              <button
                type="button"
                className="profile-input-icon__toggle"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'}
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {pwErrors.confirmNewPassword && (
              <div id="profile-confirm-password-error" className="profile-field-error" role="alert">
                {pwErrors.confirmNewPassword}
              </div>
            )}
            {pwForm.confirmNewPassword && !pwErrors.confirmNewPassword && (
              <div className="profile-field-success">
                <FiCheck /> Mật khẩu xác nhận đã khớp
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions profile-password-actions">
          <button type="submit" className="profile-submit profile-password-submit" disabled={pwSaving}>
            {pwSaving
              ? <><span className="spinner-border spinner-border-sm me-2" />Đang lưu...</>
              : <><FiLock /> Đổi mật khẩu</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
