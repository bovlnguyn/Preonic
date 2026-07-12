import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/auth.service';
import './Register.css';
import { VN_DISTRICTS, VN_WARDS } from "../../data/vn-locations.js";
import bgImage from '../../assets/branding/background1.jpg';
import Header from '../Common/Header';

const INITIAL = {
  role: 'farmer', lastName: '', firstName: '',
  email: '', phone: '', province: '',
  district: '', ward: '',
  password: '', confirmPassword: '',
};

// Danh sách tỉnh/thành lấy từ key của VN_DISTRICTS
const VN_PROVINCES = Object.keys(VN_DISTRICTS || {});

/* ───────── Icon nhỏ (inline SVG, không phụ thuộc thư viện) ───────── */
const Icon = ({ d, children, ...props }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round" {...props}>
    <path d={d} />
    {children}   {/* ← dòng này bắt buộc phải có */}
  </svg>
);
const IconUser   = (p) => <Icon d="M20 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" {...p}><circle cx="12" cy="7" r="4" /></Icon>;
const IconMail   = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" />
  </svg>
);
const IconPhone  = (p) => <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.19 4.18 2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72c.13.99.36 1.96.69 2.89a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.19-1.19a2 2 0 0 1 2.11-.45c.93.33 1.9.56 2.89.69A2 2 0 0 1 22 16.92Z" {...p} />;
const IconPin    = (p) => <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" {...p}><circle cx="12" cy="10" r="3" /></Icon>;
const IconLock   = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye    = (p) => <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" {...p}><circle cx="12" cy="12" r="3" /></Icon>;
const IconEyeOff = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.53 13.53 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
    <path d="M1 1l22 22" />
  </svg>
);
const IconShield   = (p) => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" {...p} />;
const IconTrending = (p) => <Icon d="M22 7 13.5 15.5 8.5 10.5 2 17" {...p}><path d="M16 7h6v6" /></Icon>;
const IconCheck    = (p) => <Icon d="M20 6 9 17l-5-5" {...p} />;
const IconBuilding = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 22v-4h6v4M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
  </svg>
);

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agree, setAgree]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showTerms, setShowTerms]     = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // ── Cập nhật field ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => {
      const next = { ...p, [name]: value };
      if (name === 'province') { next.district = ''; next.ward = ''; }
      if (name === 'district') { next.ward = ''; }
      return next;
    });
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  // ── Chọn vai trò ──
  const selectRole = (role) => setForm(p => ({ ...p, role }));

  // ── Validate phía client ──
  const validate = () => {
    const e = {};
    if (!form.lastName.trim())  e.lastName  = 'Họ là bắt buộc';
    else if (/\d/.test(form.lastName)) e.lastName = 'Họ không được chứa số';
    if (!form.firstName.trim()) e.firstName = 'Tên là bắt buộc';
    else if (/\d/.test(form.firstName)) e.firstName = 'Tên không được chứa số';
    if (!form.email)            e.email     = 'Email là bắt buộc';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.phone)            e.phone = 'Số điện thoại là bắt buộc';
        else if (!/^[0-9]{10,11}$/.test(form.phone))
        e.phone = 'SĐT không được chứa chữ và phải có 10-11 chữ số';
if (!form.province)         e.province = 'Vui lòng chọn tỉnh / thành phố';
if (!form.district)         e.district = 'Vui lòng chọn quận / huyện';
    if (!form.password)         e.password  = 'Mật khẩu là bắt buộc';
    else if (form.password.length < 6) e.password = 'Tối thiểu 6 ký tự';
    if (!form.confirmPassword)  e.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Mật khẩu không khớp';
    if (!agree) e.agree = 'Bạn cần đồng ý với điều khoản sử dụng và chính sách bảo mật';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
  e.preventDefault();
  setApiError('');
  
  console.log('Form khi submit:', form);
  
  if (!validate()) return;

  setLoading(true);
  try {
    // ✅ Gửi explicit từng field thay vì spread form
    await authService.register({
      firstName:       form.firstName.trim(),
      lastName:        form.lastName.trim(),
      email:           form.email.trim(),
      phone:           form.phone.trim(),
      province:        form.province,
      district:        form.district,
      ward:            form.ward,
      password:        form.password,
      confirmPassword: form.confirmPassword,
      role:            form.role,
      agreeTerms:      true,  // ← thêm dòng này
    });
    navigate('/auth', {
      state: { message: '🎉 Đăng ký thành công! Vui lòng đăng nhập.' }
    });
  } catch (err) {
    setApiError(err?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};
  const districtOptions = VN_DISTRICTS?.[form.province] || [];
  const wardOptions     = VN_WARDS?.[form.district] || [];

  const TermsModal = () => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
    display:'flex', alignItems:'center', justifyContent:'center'
  }}>
    <div style={{
      background:'#fff', borderRadius:16,
      maxWidth:660, width:'90%', maxHeight:'85vh',
      display:'flex', flexDirection:'column',
      boxShadow:'0 24px 64px rgba(0,0,0,0.18)', overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{ padding:'28px 32px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'#111' }}>Điều khoản Sử dụng PreOnic</h2>
        <button onClick={() => setShowTerms(false)} style={{
          background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#555', lineHeight:1, padding:4
        }}>✕</button>
      </div>
      <hr style={{ margin:0, border:'none', borderTop:'1px solid #e5e7eb' }} />

      {/* Body */}
      <div style={{ padding:'16px 24px', overflowY:'auto', flex:1 }}>
        {[
          { title:'Chấp nhận điều khoản', content:'Bằng việc đăng ký tài khoản trên PreOnic, bạn đồng ý tuân thủ toàn bộ các điều khoản sử dụng này.' },
          { title:'Điều kiện sử dụng tài khoản', content:'Bạn phải từ 18 tuổi trở lên và có đủ năng lực pháp lý để sử dụng dịch vụ. Thông tin đăng ký phải trung thực và chính xác.' },
          { title:'Hành vi bị cấm', content:'Nghiêm cấm: đăng tải thông tin sai lệch; sử dụng nền tảng để lừa đảo; phá hoại hệ thống; thu thập thông tin người dùng khác trái phép.' },
          { title:'Trách nhiệm của người dùng', content:'Người dùng tự chịu trách nhiệm về tính chính xác của thông tin sản phẩm, hợp đồng và giao dịch.' },
          { title:'Giới hạn trách nhiệm', content:'PreOnic không chịu trách nhiệm về thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ.' },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom:16 }}>
            <p style={{ margin:'0 0 6px', fontWeight:700, fontSize:15, color:'#111' }}>{i+1}. {item.title}</p>
            <p style={{ margin:0, fontSize:14.5, color:'#374151', lineHeight:1.75 }}>{item.content}</p>
          </div>
        ))}
      </div>

      <hr style={{ margin:0, border:'none', borderTop:'1px solid #e5e7eb' }} />
      {/* Footer */}
      <div style={{ padding:'14px 24px', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => setShowTerms(false)} style={{
          background:'#16a34a', color:'#fff', border:'none', borderRadius:10,
          padding:'13px 36px', fontSize:15, fontWeight:700, cursor:'pointer'
        }}>Tôi đã hiểu</button>
      </div>
    </div>
  </div>
);

const PrivacyModal = () => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
    display:'flex', alignItems:'center', justifyContent:'center'
  }}>
    <div style={{
      background:'#fff', borderRadius:16,
      maxWidth:660, width:'90%', maxHeight:'85vh',
      display:'flex', flexDirection:'column',
      boxShadow:'0 24px 64px rgba(0,0,0,0.18)', overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{ padding:'28px 32px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'#111' }}>Chính sách Bảo mật PreOnic</h2>
        <button onClick={() => setShowPrivacy(false)} style={{
          background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#555', lineHeight:1, padding:4
        }}>✕</button>
      </div>
      <hr style={{ margin:0, border:'none', borderTop:'1px solid #e5e7eb' }} />

      {/* Body */}
      <div style={{ padding:'24px 32px', overflowY:'auto', flex:1 }}>
        {[
          { title:'Thông tin chúng tôi thu thập', content:'Họ tên, email, số điện thoại, địa chỉ + dữ liệu hoạt động trên nền tảng + dữ liệu kỹ thuật (IP, thiết bị).' },
          { title:'Mục đích sử dụng', content:'Xác minh tài khoản, xử lý giao dịch Escrow, gửi thông báo hợp đồng, cải thiện trải nghiệm, tuân thủ pháp luật.' },
          { title:'Chia sẻ thông tin', bold:'không bán', content1:'PreOnic ', content2:' thông tin của bạn. Chỉ chia sẻ với đối tác giao dịch + đơn vị thanh toán + cơ quan nhà nước khi có yêu cầu hợp pháp.' },
          { title:'Bảo mật', content:'Mã hóa SSL 256-bit, mật khẩu băm bcrypt, kiểm tra bảo mật định kỳ.' },
          { title:'Liên hệ', content:'privacy@preonic.vn', boldAll: true },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom:16 }}>
            <p style={{ margin:'0 0 6px', fontWeight:700, fontSize:15, color:'#111' }}>{i+1}. {item.title}</p>
            <p style={{ margin:0, fontSize:14.5, color:'#374151', lineHeight:1.75 }}>
              {item.bold
                ? <>{item.content1}<strong>{item.bold}</strong>{item.content2}</>
                : item.boldAll
                ? <strong>{item.content}</strong>
                : item.content
              }
            </p>
          </div>
        ))}
      </div>

      <hr style={{ margin:0, border:'none', borderTop:'1px solid #e5e7eb' }} />
      {/* Footer */}
      <div style={{ padding:'20px 32px', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => setShowPrivacy(false)} style={{
          background:'#16a34a', color:'#fff', border:'none', borderRadius:10,
          padding:'13px 36px', fontSize:15, fontWeight:700, cursor:'pointer'
        }}>Tôi đã hiểu</button>
      </div>
    </div>
  </div>
);

  return (
    <div className="register-page">
      {showTerms   && <TermsModal />}
      {showPrivacy && <PrivacyModal />}

      {/* ───────── Navbar ───────── */}
      <Header />

      <div className="register-layout">

        {/* ───────── Bên trái: Form ───────── */}
        <div className="register-form-panel">
          <div className="register-form-wrap">
            <span className="register-badge">Đăng ký</span>
            <h1 className="register-title">Tạo tài khoản PreOnic</h1>
            <p className="register-subtitle">
              Bắt đầu hành trình kết nối nông nghiệp bền vững cùng hàng ngàn đối tác.
            </p>

            {apiError && (
              <div className="alert alert-danger alert-dismissible py-2 rounded-3 small">
                {apiError}
                <button type="button" className="btn-close btn-sm" onClick={() => setApiError('')} />
              </div>
            )}

            {/* Role toggle */}
            <div className="role-toggle">
              <button
                type="button"
                className={`role-toggle__btn ${form.role === 'farmer' ? 'role-toggle__btn--success' : ''}`}
                onClick={() => selectRole('farmer')}
              >
                <IconUser /> Nông dân
              </button>
              <button
                type="button"
                className={`role-toggle__btn ${form.role === 'enterprise' ? 'role-toggle__btn--primary' : ''}`}
                onClick={() => selectRole('enterprise')}
              >
                <IconBuilding /> Doanh nghiệp
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* Họ & Tên */}
              <div className="form-row">
                <div className="form-group">
                  <label>Họ <span className="required-mark">*</span></label>
                  <div className={`input-icon ${errors.lastName ? 'input-icon--invalid' : ''}`}>
                    <IconUser className="input-icon__icon" />
                    <input
                      type="text" name="lastName" placeholder="Nhập họ"
                      value={form.lastName} onChange={handleChange}
                    />
                  </div>
                  {errors.lastName && <div className="field-error">{errors.lastName}</div>}
                </div>
                <div className="form-group">
                  <label>Tên <span className="required-mark">*</span></label>
                  <div className={`input-icon ${errors.firstName ? 'input-icon--invalid' : ''}`}>
                    <IconUser className="input-icon__icon" />
                    <input
                      type="text" name="firstName" placeholder="Nhập tên"
                      value={form.firstName} onChange={handleChange}
                    />
                  </div>
                  {errors.firstName && <div className="field-error">{errors.firstName}</div>}
                </div>
              </div>

              {/* Email & SĐT */}
              <div className="form-row">
                <div className="form-group">
                  <label>Email <span className="required-mark">*</span></label>
                  <div className={`input-icon ${errors.email ? 'input-icon--invalid' : ''}`}>
                    <IconMail className="input-icon__icon" />
                    <input
                      type="email" name="email" placeholder="example@gmail.com"
                      value={form.email} onChange={handleChange}
                    />
                  </div>
                  {errors.email && <div className="field-error">{errors.email}</div>}
                </div>
                <div className="form-group">
                  <label>Số điện thoại <span className="required-mark">*</span></label>
                  <div className={`input-icon ${errors.phone ? 'input-icon--invalid' : ''}`}>
                    <IconPhone className="input-icon__icon" />
                    <input
                      type="tel" name="phone" placeholder="09xx xxx xxx"
                      value={form.phone} onChange={handleChange}
                    />
                  </div>
                  {errors.phone && <div className="field-error">{errors.phone}</div>}
                </div>
              </div>

              {/* Tỉnh / Huyện */}
              <div className="form-row">
                <div className="form-group">
                  <label>Tỉnh / Thành phố</label>
                  <div className={`input-icon ${errors.province ? 'input-icon--invalid' : ''}`}>
  <IconPin className="input-icon__icon" />
  <select name="province" value={form.province} onChange={handleChange}>
    <option value="">Chọn tỉnh / thành phố</option>
    {VN_PROVINCES.map(p => (
      <option key={p} value={p}>{p}</option>
    ))}
  </select>
</div>
{errors.province && <div className="field-error">{errors.province}</div>} 
                </div>
                <div className="form-group">
                  <label>Quận / Huyện</label>
                  <div className={`input-icon ${errors.district ? 'input-icon--invalid' : ''}`}>
  <IconPin className="input-icon__icon" />
  <select
    name="district" value={form.district} onChange={handleChange}
    disabled={!form.province}
  >
    <option value="">
      {form.province ? 'Chọn quận / huyện' : '— chọn tỉnh trước —'}
    </option>
    {districtOptions.map(d => (
      <option key={d} value={d}>{d}</option>
    ))}
  </select>
</div>
{errors.district && <div className="field-error">{errors.district}</div>}
                </div>
              </div>

              {/* Xã / Phường */}
              <div className="form-group">
                <label>Xã / Phường / Thị trấn <span className="text-muted">(tùy chọn)</span></label>
                <div className="input-icon">
                  <IconPin className="input-icon__icon" />
                  {wardOptions.length > 0 ? (
                    <select name="ward" value={form.ward} onChange={handleChange} disabled={!form.district}>
                      <option value="">
                        {form.district ? 'Chọn xã / phường / thị trấn' : '— chọn quận/huyện trước —'}
                      </option>
                      {wardOptions.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text" name="ward"
                      placeholder="VD: Phường Dịch Vọng, Xã Xuân Thọ..."
                      value={form.ward} onChange={handleChange}
                    />
                  )}
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="form-row">
                <div className="form-group">
                  <label>Mật khẩu <span className="required-mark">*</span></label>
                  <div className={`input-icon ${errors.password ? 'input-icon--invalid' : ''}`}>
                    <IconLock className="input-icon__icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={form.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button" className="input-icon__toggle"
                      onClick={() => setShowPassword(s => !s)}
                      aria-label="Hiện/ẩn mật khẩu"
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.password && <div className="field-error">{errors.password}</div>}
                </div>

                {/* Xác nhận mật khẩu */}
                <div className="form-group">
                  <label>Xác nhận mật khẩu <span className="required-mark">*</span></label>
                  <div className={`input-icon ${errors.confirmPassword ? 'input-icon--invalid' : ''}`}>
                    <IconLock className="input-icon__icon" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu"
                      value={form.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button" className="input-icon__toggle"
                      onClick={() => setShowConfirm(s => !s)}
                      aria-label="Hiện/ẩn xác nhận mật khẩu"
                    >
                      {showConfirm ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
                </div>
              </div>

              {/* Điều khoản */}
              <div className="form-check-agree">
                <input
                  type="checkbox" id="agree" checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked);
                    if (errors.agree) setErrors(p => ({ ...p, agree: '' }));
                  }}
                />
                <label htmlFor="agree">
                  Tôi đồng ý với{' '}
                  <button type="button" onClick={() => setShowTerms(true)}
  style={{background:'none',border:'none',padding:0,color:'#16a34a',textDecoration:'underline',cursor:'pointer'}}>
  Điều khoản sử dụng
</button>{' '}
và{' '}
<button type="button" onClick={() => setShowPrivacy(true)}
  style={{background:'none',border:'none',padding:0,color:'#16a34a',textDecoration:'underline',cursor:'pointer'}}>
  Chính sách bảo mật
</button>{' '}
                  của PreOnic.
                </label>
              </div>
              {errors.agree && <div className="field-error mb-2">{errors.agree}</div>}

              {/* Submit */}
              <button
                type="submit"
                className={`submit-btn ${form.role === 'farmer' ? 'submit-btn--success' : 'submit-btn--primary'}`}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Đang xử lý...</>
                  : <>Tạo tài khoản <span className="submit-btn__arrow">→</span></>
                }
              </button>

              <p className="register-login-hint">
                Đã có tài khoản?{' '}
                <Link to="/auth">Đăng nhập ngay</Link>
              </p>

            </form>
          </div>
        </div>

        {/* ───────── Bên phải: Banner ───────── */}
        <aside className="register-aside" style={{
  backgroundImage: `linear-gradient(180deg, rgba(5,46,22,.55) 0%, rgba(5,46,22,.85) 100%), url(${bgImage})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}}>
          <div className="register-aside__overlay">
            <span className="register-aside__badge">🌱 Nông nghiệp 4.0</span>

            <h2 className="register-aside__title">
              Kết nối <span className="highlight">5,000+ nông dân</span> và{' '}
              <span className="highlight">1,200+ doanh nghiệp</span>
            </h2>

            <p className="register-aside__desc">
              Gia nhập nền tảng bao tiêu nông sản hàng đầu Việt Nam — minh bạch,
              an toàn, công bằng.
            </p>

            <div className="register-aside__features">
              <div className="feature">
                <span className="feature__icon"><IconShield /></span>
                <div>
                  <h4>Giao dịch an toàn</h4>
                  <p>Ký quỹ Escrow bảo lãnh 100%, không lo mất tiền.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature__icon"><IconTrending /></span>
                <div>
                  <h4>Tăng trưởng bền vững</h4>
                  <p>Phân tích thị trường + dự báo giá bằng AI.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature__icon"><IconCheck /></span>
                <div>
                  <h4>Đối tác uy tín</h4>
                  <p>Chứng nhận và đánh giá minh bạch hai chiều.</p>
                </div>
              </div>
            </div>

            <div className="register-aside__footer">
              <IconCheck /> Tham gia miễn phí&nbsp;·&nbsp;Bảo mật SSL 256-bit&nbsp;·&nbsp;Hỗ trợ 24/7
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default Register;