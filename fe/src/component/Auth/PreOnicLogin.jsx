import { useState, useEffect } from "react";
import "./PreOnicLogin.css";
import { useNavigate } from "react-router-dom";


// ── Icons ──────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const TrendingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
const ArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
const PreOnicLogo = () => (
  <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
    <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="#4ade80" strokeWidth="2" />
    <path d="M20 4 L20 36" stroke="#4ade80" strokeWidth="1.5" opacity="0.5" />
    <path d="M6 12 L34 28" stroke="#4ade80" strokeWidth="1.5" opacity="0.5" />
    <path d="M34 12 L6 28" stroke="#4ade80" strokeWidth="1.5" opacity="0.5" />
    <circle cx="20" cy="20" r="4" fill="#4ade80" />
  </svg>
);

const features = [
  { icon: <ShieldIcon />, title: "Bảo mật tuyệt đối", desc: "Mã hóa SSL 256-bit, OAuth chuẩn Google." },
  { icon: <UsersIcon />, title: "Cộng đồng 5,000+", desc: "Hàng ngàn nông dân và doanh nghiệp đã tin tưởng." },
  { icon: <TrendingIcon />, title: "Giao dịch minh bạch", desc: "Escrow bảo lãnh, hợp đồng điện tử có pháp lý." },
];

export default function PreOnicLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Bắt token sau khi Google callback về
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem("token", token);
    navigate("/dashboard");
  }
}, []);

// Hàm Google login
const handleGoogleLogin = () => {
  window.location.href = "http://localhost:5000/auth/google";
};

  const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  try {
    const res = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } else {
      setError(data.message || "Email hoặc mật khẩu không đúng.");
    }
  } catch (err) {
    console.error(err);
    setError("Có lỗi xảy ra, vui lòng thử lại.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="ln-page">
      <div className="ln-card">

        {/* ── Left panel ── */}
        <div className="ln-left">
          <button className="ln-back-btn">
            <ArrowLeft />
            <span>Quay lại trang chủ</span>
          </button>

          <div className="ln-brand-row">
            <PreOnicLogo />
            <span className="ln-brand-name">PreOnic</span>
          </div>

          <h1 className="ln-hero-title">
            Chào mừng bạn{" "}
            <span className="ln-hero-accent">trở lại với PreOnic</span>
          </h1>

          <p className="ln-hero-sub">
            Nền tảng nông nghiệp số kết nối nông dân và doanh nghiệp
            <br />— minh bạch, an toàn, bền vững.
          </p>

          <div className="ln-feature-list">
            {features.map((f, i) => (
              <div key={i} className="ln-feature-item">
                <div className="ln-feature-icon">{f.icon}</div>
                <div>
                  <div className="ln-feature-title">{f.title}</div>
                  <div className="ln-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="ln-right">
          <div className="ln-form-wrap">
            <span className="ln-badge">🌿 Đăng nhập</span>
            <h2 className="ln-form-title">Chào mừng quay lại</h2>
            <p className="ln-form-sub">Đăng nhập để tiếp tục với nền tảng PreOnic.</p>

            <form onSubmit={handleLogin} className="ln-form">
              <div className="ln-field">
                <label className="ln-label">Email hoặc Số điện thoại</label>
                <div className="ln-input-wrap">
                  <span className="ln-input-icon"><MailIcon /></span>
                  <input
                    className="ln-input"
                    type="text"
                    placeholder="Nhập email hoặc số điện thoại"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="ln-field">
                <label className="ln-label">Mật khẩu</label>
                <div className="ln-input-wrap">
                  <span className="ln-input-icon"><LockIcon /></span>
                  <input
                    className="ln-input ln-input--pw"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ln-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <EyeIcon show={showPassword} />
                  </button>
                </div>
              </div>

              <div className="ln-remember-row">
                <label className="ln-check-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="ln-checkbox"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" className="ln-forgot-btn">Quên mật khẩu?</button>
              </div>
              {error && <p className="ln-error">{error}</p>}
              <button type="submit" className="ln-submit-btn" disabled={loading}>
                {loading ? <span className="ln-spinner" /> : <><span>Đăng nhập</span><ArrowRight /></>}
              </button>
            </form>

            <div className="ln-divider">
              <div className="ln-divider-line" />
              <span className="ln-divider-text">Hoặc</span>
              <div className="ln-divider-line" />
            </div>

            <button className="ln-google-btn" onClick={handleGoogleLogin}>
              <GoogleIcon />
              <span>Đăng nhập với Google</span>
            </button>

            <p className="ln-signup-row">
              Chưa có tài khoản?{" "}
              <button className="ln-signup-link" onClick={() => navigate("/register")}>Đăng ký ngay</button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
