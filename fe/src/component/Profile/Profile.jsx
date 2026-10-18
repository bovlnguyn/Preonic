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
import { matchProvince, VN_DISTRICTS, VN_WARDS } from '../../data/vn-locations';
import { formatReputation } from '../../utils/rating';
import { getPasswordPolicyChecks, getPasswordPolicyError } from '../../utils/password';
import { getInitials } from '../../utils/dashboard';
import './Profile.css';

const VN_PROVINCES = Object.keys(VN_DISTRICTS || {});
const PERSON_NAME_PATTERN = /^[\p{L}\s.'’-]+$/u;
const GENERAL_TEXT_PATTERN = /^[\p{L}\p{N}\s.,'’/&()#-]+$/u;
const VN_PHONE_PATTERN = /^0(?:3|5|7|8|9)[0-9]{8}$/;
const VN_TAX_CODE_PATTERN = /^[0-9]{10}(?:-[0-9]{3})?$/;
const normalizeSpaces = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROLE_LABEL = {
  farmer: 'Nông dân',
  enterprise: 'Doanh nghiệp',
  admin: 'Quản trị viên',
};

const normalizeLocationText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .trim();

const resolveDistrict = (province, district) => {
  const options = VN_DISTRICTS?.[province] || [];
  const normalized = normalizeLocationText(district);
  return options.find((option) => {
    const candidate = normalizeLocationText(option);
    return candidate === normalized || candidate.endsWith(` ${normalized}`);
  }) || district || '';
};

const buildForm = (user) => {
  const province = matchProvince(user?.province) || user?.province || '';
  return ({
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  phone: user?.phone || '',
  avatar: user?.avatar || '',
  province,
  district: resolveDistrict(province, user?.district),
  ward: user?.ward || '',
  address: user?.address || '',
  farmName: user?.farmName || '',
  farmSize: user?.farmSize ?? '',
  companyName: user?.companyName || '',
  taxCode: user?.taxCode || '',
  });
};

const validateProfileForm = (values, role) => {
  const nextErrors = {};
  const firstName = normalizeSpaces(values.firstName);
  const lastName = normalizeSpaces(values.lastName);
  const address = normalizeSpaces(values.address);

  const validateName = (value, label, key) => {
    if (!value) nextErrors[key] = `${label} là bắt buộc`;
    else if (value.length > 100) nextErrors[key] = `${label} không được vượt quá 100 ký tự`;
    else if (!PERSON_NAME_PATTERN.test(value) || !/\p{L}/u.test(value)) {
      nextErrors[key] = `${label} chỉ được chứa chữ cái và dấu phân cách tên`;
    }
  };
  validateName(firstName, 'Tên', 'firstName');
  validateName(lastName, 'Họ', 'lastName');

  const phone = String(values.phone || '').trim();
  if (!phone) nextErrors.phone = 'Số điện thoại là bắt buộc';
  else if (!VN_PHONE_PATTERN.test(phone)) nextErrors.phone = 'Nhập số di động Việt Nam hợp lệ gồm 10 chữ số';

  if (!address) nextErrors.address = 'Địa chỉ cụ thể là bắt buộc';
  else if (address.length < 5 || address.length > 500 || !GENERAL_TEXT_PATTERN.test(address)) {
    nextErrors.address = 'Địa chỉ phải từ 5-500 ký tự và không chứa ký tự lạ';
  }

  if (!VN_PROVINCES.includes(values.province)) nextErrors.province = 'Vui lòng chọn tỉnh / thành phố hợp lệ';
  const districts = VN_DISTRICTS?.[values.province] || [];
  if (!districts.includes(values.district)) nextErrors.district = 'Vui lòng chọn quận / huyện hợp lệ';
  const wards = VN_WARDS?.[values.district] || [];
  const ward = normalizeSpaces(values.ward);
  if (ward && ((wards.length > 0 && !wards.includes(ward)) || (wards.length === 0 && !GENERAL_TEXT_PATTERN.test(ward)))) {
    nextErrors.ward = 'Xã / phường / thị trấn không hợp lệ';
  }

  if (role === 'farmer') {
    const farmName = normalizeSpaces(values.farmName);
    if (!farmName) nextErrors.farmName = 'Tên trang trại là bắt buộc';
    else if (farmName.length < 2 || farmName.length > 255 || !GENERAL_TEXT_PATTERN.test(farmName) || !/\p{L}/u.test(farmName)) {
      nextErrors.farmName = 'Tên trang trại phải từ 2-255 ký tự và có chữ cái';
    }
    if (values.farmSize !== '') {
      const farmSize = Number(values.farmSize);
      if (!Number.isFinite(farmSize) || farmSize < 0 || farmSize > 1000000) {
        nextErrors.farmSize = 'Diện tích phải từ 0 đến 1.000.000 ha';
      }
    }
  }

  if (role === 'enterprise') {
    const companyName = normalizeSpaces(values.companyName);
    if (!companyName) nextErrors.companyName = 'Tên doanh nghiệp là bắt buộc';
    else if (companyName.length < 2 || companyName.length > 255 || !GENERAL_TEXT_PATTERN.test(companyName) || !/\p{L}/u.test(companyName)) {
      nextErrors.companyName = 'Tên doanh nghiệp phải từ 2-255 ký tự và có chữ cái';
    }
    const taxCode = String(values.taxCode || '').trim();
    if (!taxCode) nextErrors.taxCode = 'Mã số thuế là bắt buộc';
    else if (!VN_TAX_CODE_PATTERN.test(taxCode)) nextErrors.taxCode = 'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số';
  }

  return nextErrors;
};


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
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Ảnh đại diện chỉ hỗ trợ định dạng JPG hoặc PNG');
      e.target.value = '';
      return;
    }
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

  const handleBlur = (e) => {
    const { name } = e.target;
    const fieldError = validateProfileForm(form, user?.role)[name];
    setErrors((prev) => ({ ...prev, [name]: fieldError || '' }));
  };

  const validate = () => {
    const e = validateProfileForm(form, user?.role);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    const payload = {
      firstName: normalizeSpaces(form.firstName),
      lastName: normalizeSpaces(form.lastName),
      phone: form.phone.trim(),
      province: form.province,
      district: form.district,
      ward: form.ward,
      address: normalizeSpaces(form.address),
    };

    if (user?.role === 'farmer') {
      payload.farmName = normalizeSpaces(form.farmName);
      payload.farmSize = form.farmSize === '' ? undefined : Number(form.farmSize);
    }
    if (user?.role === 'enterprise') {
      payload.companyName = normalizeSpaces(form.companyName);
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
    <div className={`profile-page profile-page--${user?.role || 'farmer'}`}>
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
              : <span>{getInitials(fullName, '?')}</span>}
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
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange} onBlur={handleBlur} maxLength={100} autoComplete="family-name" placeholder="Nhập họ" />
                </div>
                {errors.lastName && <div className="profile-field-error">{errors.lastName}</div>}
              </div>
              <div className="profile-field">
                <label>Tên <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.firstName ? 'profile-input-icon--invalid' : ''}`}>
                  <FiUser />
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} onBlur={handleBlur} maxLength={100} autoComplete="given-name" placeholder="Nhập tên" />
                </div>
                {errors.firstName && <div className="profile-field-error">{errors.firstName}</div>}
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label>Số điện thoại <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.phone ? 'profile-input-icon--invalid' : ''}`}>
                  <FiPhone />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" maxLength={10} autoComplete="tel" placeholder="09xx xxx xxx" />
                </div>
                {errors.phone && <div className="profile-field-error">{errors.phone}</div>}
              </div>
              <div className="profile-field">
                <label>Địa chỉ cụ thể <span className="profile-required">*</span></label>
                <div className={`profile-input-icon ${errors.address ? 'profile-input-icon--invalid' : ''}`}>
                  <FiHome />
                  <input type="text" name="address" value={form.address} onChange={handleChange} onBlur={handleBlur} maxLength={500} autoComplete="street-address" placeholder="Số nhà, tên đường..." />
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
                  <select name="province" value={form.province} onChange={handleChange} onBlur={handleBlur}>
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
                  <select name="district" value={form.district} onChange={handleChange} onBlur={handleBlur} disabled={!form.province}>
                    <option value="">{form.province ? 'Chọn quận / huyện' : '— chọn tỉnh trước —'}</option>
                    {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {errors.district && <div className="profile-field-error">{errors.district}</div>}
              </div>
            </div>

            <div className="profile-field">
              <label>Xã / Phường / Thị trấn <span className="profile-optional">(tùy chọn)</span></label>
              <div className={`profile-input-icon ${errors.ward ? 'profile-input-icon--invalid' : ''}`}>
                <FiMapPin />
                {wardOptions.length > 0 ? (
                  <select name="ward" value={form.ward} onChange={handleChange} onBlur={handleBlur} disabled={!form.district}>
                    <option value="">{form.district ? 'Chọn xã / phường / thị trấn' : '— chọn quận/huyện trước —'}</option>
                    {wardOptions.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                ) : (
                  <input type="text" name="ward" value={form.ward} onChange={handleChange} onBlur={handleBlur} maxLength={100} placeholder="VD: Phường Dịch Vọng..." />
                )}
              </div>
              {errors.ward && <div className="profile-field-error">{errors.ward}</div>}
            </div>
          </section>

          {user?.role === 'farmer' && (
            <section className="profile-section">
              <h2>Thông tin trang trại</h2>
              <div className="profile-row">
                <div className="profile-field">
                  <label>Tên trang trại <span className="profile-required">*</span></label>
                  <div className={`profile-input-icon ${errors.farmName ? 'profile-input-icon--invalid' : ''}`}>
                    <FiBriefcase />
                    <input type="text" name="farmName" value={form.farmName} onChange={handleChange} onBlur={handleBlur} maxLength={255} placeholder="VD: Trang trại Xuân Thọ" />
                  </div>
                  {errors.farmName && <div className="profile-field-error">{errors.farmName}</div>}
                </div>
                <div className="profile-field">
                  <label>Diện tích canh tác (ha)</label>
                  <div className={`profile-input-icon ${errors.farmSize ? 'profile-input-icon--invalid' : ''}`}>
                    <FiHash />
                    <input type="number" min="0" max="1000000" step="0.1" name="farmSize" value={form.farmSize} onChange={handleChange} onBlur={handleBlur} placeholder="0.0" />
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
                  <div className={`profile-input-icon ${errors.companyName ? 'profile-input-icon--invalid' : ''}`}>
                    <FiBriefcase />
                    <input type="text" name="companyName" value={form.companyName} onChange={handleChange} onBlur={handleBlur} maxLength={255} autoComplete="organization" placeholder="Công ty TNHH..." />
                  </div>
                  {errors.companyName && <div className="profile-field-error">{errors.companyName}</div>}
                </div>
                <div className="profile-field">
                  <label>Mã số thuế <span className="profile-required">*</span></label>
                  <div className={`profile-input-icon ${errors.taxCode ? 'profile-input-icon--invalid' : ''}`}>
                    <FiHash />
                    <input type="text" name="taxCode" value={form.taxCode} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" maxLength={14} placeholder="VD: 0312345678" />
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
