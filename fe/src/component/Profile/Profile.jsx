import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiUser, FiPhone, FiMapPin, FiCamera, FiMail,
  FiHome, FiBriefcase, FiHash, FiSave, FiStar, FiArrowLeft,
  FiLock, FiEye, FiEyeOff,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import authService from '../../services/auth.service';
import { resolveImageUrl } from '../../services/product.service';
import { VN_DISTRICTS, VN_WARDS } from '../../data/vn-locations';
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
  const [pwApiError, setPwApiError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setForm(buildForm(user));
  }, [user]);

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
    if (form.phone) {
      const phoneVal = form.phone.trim();
      if (/[^0-9]/.test(phoneVal)) {
        e.phone = 'Số điện thoại không được chứa chữ hoặc ký tự đặc biệt';
      } else if (!/^[0-9]{10,11}$/.test(phoneVal)) {
        e.phone = 'Số điện thoại phải có 10-11 chữ số';
      }
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    if (pwErrors[name]) setPwErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const isGoogleAccount = user?.authProvider === 'google';

  const validatePassword = () => {
    const e = {};
    if (!isGoogleAccount && !pwForm.currentPassword) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!pwForm.newPassword) e.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (pwForm.newPassword.length < 6) e.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (!pwForm.confirmNewPassword) e.confirmNewPassword = 'Vui lòng xác nhận mật khẩu mới';
    else if (pwForm.newPassword !== pwForm.confirmNewPassword) e.confirmNewPassword = 'Mật khẩu xác nhận không khớp';
    setPwErrors(e);
    return Object.keys(e).length === 0;
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
              <strong>{Number(user?.reputationScore || 0).toFixed(1)}/5</strong>
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
                <div className="profile-input-icon">
                  <FiHome />
                  <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, tên đường..." />
                </div>
              </div>
            </div>
          </section>

          <section className="profile-section">
            <h2>Địa chỉ hành chính</h2>
            <div className="profile-row">
              <div className="profile-field">
                <label>Tỉnh / Thành phố <span className="profile-required">*</span></label>
                <div className="profile-input-icon">
                  <FiMapPin />
                  <select name="province" value={form.province} onChange={handleChange}>
                    <option value="">Chọn tỉnh / thành phố</option>
                    {VN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="profile-field">
                <label>Quận / Huyện <span className="profile-required">*</span></label>
                <div className="profile-input-icon">
                  <FiMapPin />
                  <select name="district" value={form.district} onChange={handleChange} disabled={!form.province}>
                    <option value="">{form.province ? 'Chọn quận / huyện' : '— chọn tỉnh trước —'}</option>
                    {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
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
                  <label>Tên trang trại</label>
                  <div className="profile-input-icon">
                    <FiBriefcase />
                    <input type="text" name="farmName" value={form.farmName} onChange={handleChange} placeholder="VD: Trang trại Xuân Thọ" />
                  </div>
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
                  <label>Tên doanh nghiệp</label>
                  <div className="profile-input-icon">
                    <FiBriefcase />
                    <input type="text" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Công ty TNHH..." />
                  </div>
                </div>
                <div className="profile-field">
                  <label>Mã số thuế</label>
                  <div className="profile-input-icon">
                    <FiHash />
                    <input type="text" name="taxCode" value={form.taxCode} onChange={handleChange} placeholder="VD: 0312345678" />
                  </div>
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
        <h2>Đổi mật khẩu</h2>
        <p className="profile-password-hint">
          {isGoogleAccount
            ? 'Tài khoản đăng nhập bằng Google chưa có mật khẩu do bạn tự đặt — hãy đặt mật khẩu lần đầu để có thể đăng nhập bằng email/mật khẩu.'
            : 'Dùng mật khẩu mạnh, tối thiểu 6 ký tự, không trùng mật khẩu cũ.'}
        </p>

        {pwApiError && (
          <div className="profile-alert profile-alert--error">{pwApiError}</div>
        )}

        {isGoogleAccount ? (
          <div className="profile-field">
            <label>Mật khẩu mới</label>
            <div className={`profile-input-icon ${pwErrors.newPassword ? 'profile-input-icon--invalid' : ''}`}>
              <FiLock />
              <input
                type={showNew ? 'text' : 'password'}
                name="newPassword"
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={handlePasswordChange}
                placeholder="Tối thiểu 6 ký tự"
              />
              <button
                type="button" className="profile-input-icon__toggle"
                onClick={() => setShowNew((s) => !s)}
                aria-label="Hiện/ẩn mật khẩu mới"
              >
                {showNew ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {pwErrors.newPassword && <div className="profile-field-error">{pwErrors.newPassword}</div>}
          </div>
        ) : (
          <div className="profile-row">
            <div className="profile-field">
              <label>Mật khẩu hiện tại</label>
              <div className={`profile-input-icon ${pwErrors.currentPassword ? 'profile-input-icon--invalid' : ''}`}>
                <FiLock />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  name="currentPassword"
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button" className="profile-input-icon__toggle"
                  onClick={() => setShowCurrent((s) => !s)}
                  aria-label="Hiện/ẩn mật khẩu hiện tại"
                >
                  {showCurrent ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {pwErrors.currentPassword && <div className="profile-field-error">{pwErrors.currentPassword}</div>}
            </div>

            <div className="profile-field">
              <label>Mật khẩu mới</label>
              <div className={`profile-input-icon ${pwErrors.newPassword ? 'profile-input-icon--invalid' : ''}`}>
                <FiLock />
                <input
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Tối thiểu 6 ký tự"
                />
                <button
                  type="button" className="profile-input-icon__toggle"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label="Hiện/ẩn mật khẩu mới"
                >
                  {showNew ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {pwErrors.newPassword && <div className="profile-field-error">{pwErrors.newPassword}</div>}
            </div>
          </div>
        )}

        <div className="profile-field">
          <label>Xác nhận mật khẩu mới</label>
          <div className={`profile-input-icon ${pwErrors.confirmNewPassword ? 'profile-input-icon--invalid' : ''}`}>
            <FiLock />
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmNewPassword"
              autoComplete="new-password"
              value={pwForm.confirmNewPassword}
              onChange={handlePasswordChange}
              placeholder="Nhập lại mật khẩu mới"
            />
            <button
              type="button" className="profile-input-icon__toggle"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label="Hiện/ẩn xác nhận mật khẩu mới"
            >
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {pwErrors.confirmNewPassword && <div className="profile-field-error">{pwErrors.confirmNewPassword}</div>}
        </div>

        <div className="profile-actions">
          <button type="submit" className="profile-submit" disabled={pwSaving}>
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
