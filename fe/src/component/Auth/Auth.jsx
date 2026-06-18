import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle, FiMail, FiLock, FiEye, FiEyeOff,
  FiArrowLeft, FiArrowRight, FiCheckCircle, FiShield,
  FiUsers, FiTrendingUp,
} from "react-icons/fi";
import { LuLeaf } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants";
import authService from "../../services/auth.service";
//import { fadeIn, fadeInUp } from '../../constants/animations';
import "./Auth.css";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1530507629858-e4977d930e95?w=1400&q=85&auto=format&fit=crop";

const HIGHLIGHTS = [
  {
    icon: <FiShield />,
    title: "Bảo mật tuyệt đối",
    desc: "Mã hóa SSL 256-bit, bảo vệ thông tin người dùng.",
  },
  {
    icon: <FiUsers />,
    title: "Cộng đồng 5,000+",
    desc: "Hàng ngàn nông dân và doanh nghiệp đã tin tưởng.",
  },
  {
    icon: <FiTrendingUp />,
    title: "Giao dịch minh bạch",
    desc: "Escrow bảo lãnh, hợp đồng điện tử có pháp lý.",
  },
];

const Auth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail,     setForgotEmail]     = useState("");
  const [forgotLoading,   setForgotLoading]   = useState(false);
  const [forgotSuccess,   setForgotSuccess]   = useState(false);

  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password:     "",
    rememberMe:   false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // ── Đăng nhập ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Gọi authService.login — giữ nguyên auth.service.js cũ
      const response = await authService.login({
        emailOrPhone: formData.emailOrPhone,
        password:     formData.password,
        rememberMe:   formData.rememberMe,
      });

      if (response.success) {
        const { user, accessToken } = response.data;

        // Cập nhật AuthContext
        login(accessToken, user);

        // Redirect theo role
        setTimeout(() => {
          if (user.role === "admin")           navigate(ROUTES.ADMIN ?? "/admin");
          else if (user.role === "farmer")     navigate(ROUTES.FARMER_HOME);
          else if (user.role === "enterprise") navigate(ROUTES.ENTERPRISE ?? "/enterprise");
          else navigate(ROUTES.HOME);
        }, 600);
      }
    } catch (err) {
      setError(err?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ── Quên mật khẩu ──
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await authService.forgotPassword({ email: forgotEmail.trim() });
      setForgotSuccess(true);
    } catch (err) {
      setError(err?.message || "Không tìm thấy tài khoản với email này.");
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail("");
    setForgotSuccess(false);
  };

  return (
    <div className="auth-v3-page">
      <div className="auth-v3-grid">

        {/* ── LEFT HERO ── */}
        <motion.aside
          className="auth-v3-hero"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="auth-v3-hero-overlay" />
          <div className="auth-v3-hero-inner">
            <button className="auth-v3-back" onClick={() => navigate(ROUTES.HOME ?? "/")}>
              <FiArrowLeft /> Quay lại trang chủ
            </button>

            <div className="auth-v3-hero-mid">
              <div className="auth-v3-brand">
                <span style={{ fontSize: 36 }}>🌾</span>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 24, marginLeft: 10 }}>
                  PreOnic
                </span>
              </div>
              <h1>
                Chào mừng bạn<br />
                <span>trở lại với PreOnic</span>
              </h1>
              <p>
                Nền tảng nông nghiệp số kết nối nông dân và doanh nghiệp —
                minh bạch, an toàn, bền vững.
              </p>
            </div>

            <div className="auth-v3-highlights">
              {HIGHLIGHTS.map((h, i) => (
                <motion.div
                  className="auth-v3-highlight"
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                >
                  <span className="auth-v3-highlight-icon">{h.icon}</span>
                  <div>
                    <div className="auth-v3-highlight-title">{h.title}</div>
                    <div className="auth-v3-highlight-desc">{h.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.aside>

        {/* ── RIGHT FORM ── */}
        <motion.main
          className="auth-v3-form-wrap"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="auth-v3-card">

            <div className="auth-v3-brand-mobile">
              <span style={{ fontSize: 28 }}>🌾</span>
              <span style={{ fontWeight: 800, fontSize: 20, marginLeft: 8 }}>PreOnic</span>
            </div>

            <div className="auth-v3-header">
              <span className="auth-v3-badge">
                <LuLeaf /> Đăng nhập
              </span>
              <h2>Chào mừng quay lại</h2>
              <p>Đăng nhập để tiếp tục với nền tảng PreOnic.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-v3-form">

              {error && (
                <motion.div
                  className="auth-v3-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FiAlertTriangle /> {error}
                </motion.div>
              )}

              {/* Email / SĐT */}
              <div className="auth-v3-field">
                <label>Email hoặc Số điện thoại</label>
                <div className="auth-v3-input-wrap">
                  <FiMail className="auth-v3-input-icon" />
                  <input
                    type="text"
                    name="emailOrPhone"
                    value={formData.emailOrPhone}
                    onChange={handleChange}
                    placeholder="Nhập email hoặc số điện thoại"
                    required
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="auth-v3-field">
                <label>Mật khẩu</label>
                <div className="auth-v3-input-wrap">
                  <FiLock className="auth-v3-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button
                    type="button"
                    className="auth-v3-eye"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="auth-v3-extras">
                <label className="auth-v3-remember">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  className="auth-v3-forgot"
                  onClick={() => setShowForgotModal(true)}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                className="auth-v3-btn-primary"
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Đang xử lý..." : "Đăng nhập"}{" "}
                {!loading && <FiArrowRight />}
              </motion.button>
              {/* ← Thêm vào đây */}
<div className="auth-v3-divider">
  <span>Hoặc</span>
</div>

<button
  type="button"
  className="auth-v3-btn-google"
  onClick={() => { window.open('http://localhost:8080/api/v1/auth/google', '_self'); }}
>
  <img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/%3E%3Cpath fill='%234285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/%3E%3Cpath fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/%3E%3Cpath fill='%2334A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/%3E%3C/svg%3E"
    alt="Google"
    width="20"
    height="20"
  />
  <span>Đăng nhập với Google</span>
</button>

              <p className="auth-v3-register-link">
                Chưa có tài khoản?{" "}
                <button type="button" onClick={() => navigate(ROUTES.REGISTER ?? "/register")}>
                  Đăng ký ngay
                </button>
              </p>

            </form>
          </div>
        </motion.main>
      </div>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            className="auth-v3-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeForgotModal}
          >
            <motion.div
              className="auth-v3-modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="auth-v3-modal-header">
                <h3>{forgotSuccess ? "Đã gửi hướng dẫn" : "Quên mật khẩu"}</h3>
                <button className="auth-v3-modal-close" onClick={closeForgotModal}>✕</button>
              </div>

              {forgotSuccess ? (
                <div className="auth-v3-forgot-success">
                  <div className="auth-v3-success-icon"><FiCheckCircle /></div>
                  <p>Kiểm tra email <strong>{forgotEmail}</strong> để nhận link đặt lại mật khẩu.</p>
                  <p className="auth-v3-note">Nếu không thấy, kiểm tra thư mục Spam.</p>
                  <button className="auth-v3-btn-primary" onClick={closeForgotModal}>Đóng</button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="auth-v3-form">
                  <p className="auth-v3-forgot-desc">
                    Nhập email đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                  </p>
                  <div className="auth-v3-field">
                    <label>Email</label>
                    <div className="auth-v3-input-wrap">
                      <FiMail className="auth-v3-input-icon" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="email@example.com"
                        required autoFocus
                      />
                    </div>
                  </div>
                  <div className="auth-v3-modal-actions">
                    <button type="button" className="auth-v3-btn-ghost" onClick={closeForgotModal}>
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="auth-v3-btn-primary"
                      disabled={forgotLoading || !forgotEmail.trim()}
                    >
                      {forgotLoading ? "Đang gửi..." : "Gửi hướng dẫn"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;