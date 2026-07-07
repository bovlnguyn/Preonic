import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiPhone, FiMapPin, FiImage, FiMail,
  FiHome, FiBriefcase, FiHash, FiSave, FiStar, FiArrowLeft,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import authService from '../../services/auth.service';
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
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => buildForm(user));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildForm(user));
  }, [user]);

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
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.trim())) {
      e.phone = 'Số điện thoại phải có 10-11 chữ số';
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
      avatar: form.avatar.trim(),
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
      const result = await authService.updateProfile(payload);
      if (result?.data?.user) updateUser(result.data.user);
      toast.success('Cập nhật hồ sơ thành công');
    } catch (err) {
      setApiError(err?.message || 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.');
      toast.error(err?.message || 'Cập nhật hồ sơ thất bại');
    } finally {
      setSaving(false);
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

      {apiError && (
        <div className="profile-alert profile-alert--error">{apiError}</div>
      )}

      <form className="profile-layout" onSubmit={handleSubmit} noValidate>
        <aside className="profile-card profile-card--side">
          <div className="profile-avatar">
            {form.avatar
              ? <img src={form.avatar} alt="Ảnh đại diện" onError={(e) => { e.target.style.display = 'none'; }} />
              : <span>{getInitials(fullName)}</span>}
          </div>
          <h3 className="profile-avatar__name">{fullName}</h3>
          <span className="profile-avatar__role">{ROLE_LABEL[user?.role] || user?.role}</span>

          <div className="profile-field">
            <label>Ảnh đại diện (URL)</label>
            <div className="profile-input-icon">
              <FiImage />
              <input
                type="text" name="avatar" placeholder="https://..."
                value={form.avatar} onChange={handleChange}
              />
            </div>
          </div>

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
                <label>Họ</label>
                <div className={`profile-input-icon ${errors.lastName ? 'profile-input-icon--invalid' : ''}`}>
                  <FiUser />
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Nhập họ" />
                </div>
                {errors.lastName && <div className="profile-field-error">{errors.lastName}</div>}
              </div>
              <div className="profile-field">
                <label>Tên</label>
                <div className={`profile-input-icon ${errors.firstName ? 'profile-input-icon--invalid' : ''}`}>
                  <FiUser />
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Nhập tên" />
                </div>
                {errors.firstName && <div className="profile-field-error">{errors.firstName}</div>}
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label>Số điện thoại</label>
                <div className={`profile-input-icon ${errors.phone ? 'profile-input-icon--invalid' : ''}`}>
                  <FiPhone />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="09xx xxx xxx" />
                </div>
                {errors.phone && <div className="profile-field-error">{errors.phone}</div>}
              </div>
              <div className="profile-field">
                <label>Địa chỉ cụ thể</label>
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
                <label>Tỉnh / Thành phố</label>
                <div className="profile-input-icon">
                  <FiMapPin />
                  <select name="province" value={form.province} onChange={handleChange}>
                    <option value="">Chọn tỉnh / thành phố</option>
                    {VN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="profile-field">
                <label>Quận / Huyện</label>
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
    </div>
  );
}

export default Profile;
