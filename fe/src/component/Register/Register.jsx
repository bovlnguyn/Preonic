import { useState } from "react";
import "./Register.css";
import { VN_DISTRICTS, VN_WARDS } from "../../data/vn-locations.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import authService from "../../services/auth.service";

const PROVINCE_OPTIONS = [
  { key: "Ha Noi",         label: "Hà Nội" },
  { key: "Ho Chi Minh",    label: "TP. Hồ Chí Minh" },
  { key: "Da Nang",        label: "Đà Nẵng" },
  { key: "Can Tho",        label: "Cần Thơ" },
  { key: "Hai Phong",      label: "Hải Phòng" },
  { key: "Binh Duong",     label: "Bình Dương" },
  { key: "Dong Nai",       label: "Đồng Nai" },
  { key: "Lam Dong",       label: "Lâm Đồng" },
  { key: "Khanh Hoa",      label: "Khánh Hòa" },
  { key: "Thua Thien Hue", label: "Thừa Thiên Huế" },
  { key: "Nghe An",        label: "Nghệ An" },
  { key: "Thanh Hoa",      label: "Thanh Hóa" },
  { key: "Quang Nam",      label: "Quảng Nam" },
  { key: "Binh Thuan",     label: "Bình Thuận" },
  { key: "Long An",        label: "Long An" },
  { key: "Tien Giang",     label: "Tiền Giang" },
  { key: "An Giang",       label: "An Giang" },
  { key: "Kien Giang",     label: "Kiên Giang" },
  { key: "Dak Lak",        label: "Đắk Lắk" },
  { key: "Gia Lai",        label: "Gia Lai" },
  { key: "Kon Tum",        label: "Kon Tum" },
  { key: "Son La",         label: "Sơn La" },
  { key: "Lai Chau",       label: "Lai Châu" },
  { key: "Ha Giang",       label: "Hà Giang" },
  { key: "Phu Tho",        label: "Phú Thọ" },
  { key: "Thai Nguyen",    label: "Thái Nguyên" },
  { key: "Lang Son",       label: "Lạng Sơn" },
  { key: "Quang Ninh",     label: "Quảng Ninh" },
];

// ── Icons ──────────────────────────────────────────────
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const MapPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = ({ show }) =>
  show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
const BuildingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const TrendingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const PreOnicLogo = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
    <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="#4ade80" strokeWidth="2" />
    <path d="M20 4 L20 36" stroke="#4ade80" strokeWidth="1.5" opacity="0.5" />
    <path d="M6 12 L34 28" stroke="#4ade80" strokeWidth="1.5" opacity="0.5" />
    <path d="M34 12 L6 28" stroke="#4ade80" strokeWidth="1.5" opacity="0.5" />
    <circle cx="20" cy="20" r="4" fill="#4ade80" />
  </svg>
);

// ── Component ──────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState("farmer"); // "farmer" | "business"
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | "terms" | "privacy"

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    province: "", district: "", ward: "",
    password: "", confirmPassword: "",
  });

  const set = (k) => (e) => {
  const val = e.target.value;
  if (k === "province") setForm({ ...form, province: val, district: "", ward: "" });
  else if (k === "district") setForm({ ...form, district: val, ward: "" });
  else setForm({ ...form, [k]: val });
};

const districtOptions = form.province ? (VN_DISTRICTS[form.province] || []) : [];
const wardOptions     = form.district ? (VN_WARDS[form.district]     || []) : [];
const hasWards        = wardOptions.length > 0;

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (form.password !== form.confirmPassword) {
    setError("Mật khẩu xác nhận không khớp.");
    return;
  }
  setLoading(true);
  setError("");
  try {
    const data = await authService.register({
      fullName: form.fullName,
      email:    form.email,
      phone:    form.phone,
      province: form.province,
      district: form.district,
      ward:     form.ward,
      password: form.password,
      role,
    });
    login(data.accessToken, data.user);
    navigate("/dashboard");
  } catch (err) {
    setError(err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại.");
  } finally {
    setLoading(false);
  }
};

  const MODALS = {
  terms: {
    title: "Điều khoản Sử dụng PreOnic",
    content: [
      { heading: "1. Chấp nhận điều khoản", body: "Bằng việc đăng ký tài khoản trên PreOnic, bạn đồng ý tuân thủ toàn bộ các điều khoản sử dụng này." },
      { heading: "2. Điều kiện sử dụng tài khoản", body: "Bạn phải từ 18 tuổi trở lên và có đủ năng lực pháp lý để sử dụng dịch vụ. Thông tin đăng ký phải trung thực và chính xác." },
      { heading: "3. Hành vi bị cấm", body: "Nghiêm cấm: đăng tải thông tin sai lệch; sử dụng nền tảng để lừa đảo; phá hoại hệ thống; thu thập thông tin người dùng khác trái phép." },
      { heading: "4. Trách nhiệm của người dùng", body: "Người dùng tự chịu trách nhiệm về tính chính xác của thông tin sản phẩm, hợp đồng và giao dịch." },
      { heading: "5. Giới hạn trách nhiệm", body: "PreOnic không chịu trách nhiệm về thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ." },
    ]
  },
  privacy: {
    title: "Chính sách Bảo mật PreOnic",
    content: [
      { heading: "1. Thông tin chúng tôi thu thập", body: "Họ tên, email, số điện thoại, địa chỉ + dữ liệu hoạt động trên nền tảng + dữ liệu kỹ thuật (IP, thiết bị)." },
      { heading: "2. Mục đích sử dụng", body: "Xác minh tài khoản, xử lý giao dịch Escrow, gửi thông báo hợp đồng, cải thiện trải nghiệm, tuân thủ pháp luật." },
      { heading: "3. Chia sẻ thông tin", body: "PreOnic không bán thông tin của bạn. Chỉ chia sẻ với đối tác giao dịch + đơn vị thanh toán + cơ quan nhà nước khi có yêu cầu hợp pháp." },
      { heading: "4. Bảo mật", body: "Mã hóa SSL 256-bit, mật khẩu băm bcrypt, kiểm tra bảo mật định kỳ." },
      { heading: "5. Liên hệ", body: "privacy@preonic.vn" },
    ]
  }
};

  return (
    <div className="rg-page">
      {/* ── Navbar ── */}
      <nav className="rg-nav">
        <div className="rg-nav-brand">
          <PreOnicLogo />
          <span className="rg-nav-name">PreOnic</span>
        </div>
        <ul className="rg-nav-links">
          <li>Trang chủ</li>
          <li>Sản phẩm</li>
          <li>Giải pháp</li>
          <li>Liên hệ</li>
        </ul>
        <div className="rg-nav-actions">
          <button className="rg-btn-outline" onClick={() => navigate("/login")}>Đăng nhập</button>
          <button className="rg-btn-solid">Đăng ký</button>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="rg-main">
        {/* Left: Form */}
        <div className="rg-form-panel">
          <span className="rg-badge">🌿 Đăng ký</span>
          <h1 className="rg-title">Tạo tài khoản PreOnic</h1>
          <p className="rg-sub">Bắt đầu hành trình kết nối nông nghiệp bền vững cùng hàng ngàn đối tác.</p>

          {/* Role tabs */}
          <div className="rg-tabs">
            <button
              className={`rg-tab ${role === "farmer" ? "rg-tab--active" : ""}`}
              onClick={() => setRole("farmer")}
            >
              <UserIcon /> Nông dân
            </button>
            <button
              className={`rg-tab ${role === "business" ? "rg-tab--active" : ""}`}
              onClick={() => setRole("business")}
            >
              <BuildingIcon /> Doanh nghiệp
            </button>
          </div>

          <form onSubmit={handleSubmit} className="rg-form">
            {/* Full name */}
            <div className="rg-field rg-field--full">
              <label className="rg-label">Họ và tên</label>
              <div className="rg-input-wrap">
                <span className="rg-icon"><UserIcon /></span>
                <input
                  className="rg-input"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={form.fullName}
                  onChange={set("fullName")}
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="rg-row">
              <div className="rg-field">
                <label className="rg-label">Email</label>
                <div className="rg-input-wrap">
                  <span className="rg-icon"><MailIcon /></span>
                  <input className="rg-input" type="email" placeholder="example@gmail.com" value={form.email} onChange={set("email")} />
                </div>
              </div>
              <div className="rg-field">
                <label className="rg-label">Số điện thoại</label>
                <div className="rg-input-wrap">
                  <span className="rg-icon"><PhoneIcon /></span>
                  <input className="rg-input" type="tel" placeholder="09xx xxx xxx" value={form.phone} onChange={set("phone")} />
                </div>
              </div>
            </div>

            {/* Province + District */}
            <div className="rg-row">
              <div className="rg-field">
                <label className="rg-label">Tỉnh / Thành phố</label>
                <div className="rg-input-wrap">
                  <span className="rg-icon"><MapPinIcon /></span>
                  <select className="rg-input rg-select" value={form.province} onChange={set("province")}>
                    <option value="">Chọn tỉnh / thành phố</option>
                    {PROVINCE_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="rg-field">
                <label className="rg-label">Quận / Huyện</label>
                <div className="rg-input-wrap">
                  <span className="rg-icon"><MapPinIcon /></span>
                  <select className="rg-input rg-select" value={form.district} onChange={set("district")} disabled={!form.province}>
                    <option value="">{form.province ? "Chọn quận / huyện" : "— chọn tỉnh trước —"}</option>
                     {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Ward */}
            <div className="rg-field rg-field--full">
              <label className="rg-label">Xã / Phường / Thị trấn <span className="rg-optional">(tùy chọn)</span></label>
              <div className="rg-input-wrap">
                <span className="rg-icon"><MapPinIcon /></span>
                {hasWards ? (
                  <select className="rg-input rg-select" value={form.ward} onChange={set("ward")}>
                    <option value="">Chọn xã / phường / thị trấn</option>
                    {wardOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                ) : (
                  <input className="rg-input" type="text" placeholder="VD: Phường Dịch Vọng, Xã Xuân Thọ..." value={form.ward} onChange={set("ward")} disabled={!form.district} />
        )}
              </div>
            </div>

            {/* Password + Confirm */}
            <div className="rg-row">
              <div className="rg-field">
                <label className="rg-label">Mật khẩu</label>
                <div className="rg-input-wrap">
                  <span className="rg-icon"><LockIcon /></span>
                  <input className="rg-input rg-input--pw" type={showPw ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={set("password")} />
                  <button type="button" className="rg-eye" onClick={() => setShowPw(!showPw)}><EyeIcon show={showPw} /></button>
                </div>
              </div>
              <div className="rg-field">
                <label className="rg-label">Xác nhận mật khẩu</label>
                <div className="rg-input-wrap">
                  <span className="rg-icon"><LockIcon /></span>
                  <input className="rg-input rg-input--pw" type={showCpw ? "text" : "password"} placeholder="••••••••" value={form.confirmPassword} onChange={set("confirmPassword")} />
                  <button type="button" className="rg-eye" onClick={() => setShowCpw(!showCpw)}><EyeIcon show={showCpw} /></button>
                </div>
              </div>
            </div>
            
            {/* Modal */}
            {modal && (
              <div className="rg-modal-overlay" onClick={() => setModal(null)}>
               <div className="rg-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rg-modal-header">
              <h3 className="rg-modal-title">{MODALS[modal].title}</h3>
              <button className="rg-modal-close" onClick={() => setModal(null)}>✕</button>
              </div>
            <div className="rg-modal-body">
        {MODALS[modal].content.map((item, i) => (
          <div key={i} className="rg-modal-section">
            <strong>{item.heading}</strong>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
      <div className="rg-modal-footer">
        <button className="rg-modal-btn" onClick={() => setModal(null)}>Tôi đã hiểu</button>
      </div>
    </div>
  </div>
)}

            {/* Terms */}
            <label className="rg-terms">
  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rg-checkbox" />
  <span>Tôi đồng ý với{" "}
    <a href="#!" className="rg-link" onClick={(e) => { e.preventDefault(); setModal("terms"); }}>Điều khoản sử dụng</a>
    {" "}và{" "}
    <a href="#!" className="rg-link" onClick={(e) => { e.preventDefault(); setModal("privacy"); }}>Chính sách bảo mật</a>
    {" "}của PreOnic.
  </span>
</label>

            {/* Submit */}
            {error && <p className="rg-error">{error}</p>}
            <button type="submit" className="rg-submit" disabled={loading || !agreed}>
              {loading
                ? <span className="rg-spinner" />
                : <><span>Tạo tài khoản</span><ArrowRight /></>
              }
            </button>
          </form>

          <p className="rg-login-row">
            Đã có tài khoản? <button className="rg-login-link" onClick={() => navigate("/")}>Đăng nhập ngay</button>
          </p>
        </div>

        {/* Right: Hero panel */}
        <div className="rg-hero">
          <div className="rg-hero-overlay" />
          <div className="rg-hero-content">
            <span className="rg-hero-badge">🌿 Nông nghiệp 4.0</span>
            <h2 className="rg-hero-title">
              Kết nối <span className="rg-hero-accent">5,000+ nông dân</span>{" "}
              và <span className="rg-hero-accent">1,200+ doanh nghiệp</span>
            </h2>
            <p className="rg-hero-desc">
              Gia nhập nền tảng bao tiêu nông sản hàng đầu Việt Nam — minh bạch, an toàn, công bằng.
            </p>

            <div className="rg-hero-features">
              <div className="rg-hero-feat">
                <span className="rg-feat-icon"><ShieldIcon /></span>
                <div>
                  <div className="rg-feat-title">Giao dịch an toàn</div>
                  <div className="rg-feat-desc">Ký quỹ Escrow bảo lãnh 100%, không lo mất tiền.</div>
                </div>
              </div>
              <div className="rg-hero-feat">
                <span className="rg-feat-icon"><TrendingIcon /></span>
                <div>
                  <div className="rg-feat-title">Tăng trưởng bền vững</div>
                  <div className="rg-feat-desc">Phân tích thị trường + dự báo giá bằng AI.</div>
                </div>
              </div>
              <div className="rg-hero-feat">
                <span className="rg-feat-icon"><CheckCircleIcon /></span>
                <div>
                  <div className="rg-feat-title">Đối tác uy tín</div>
                  <div className="rg-feat-desc">Chứng nhận và đánh giá minh bạch hai chiều.</div>
                </div>
              </div>
            </div>

            <div className="rg-hero-footer">
              ✅ Tham gia miễn phí · Bảo mật SSL 256-bit · Hỗ trợ 24/7
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
