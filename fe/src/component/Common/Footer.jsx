import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiFileText,
  FiLock,
  FiMail,
  FiMapPin,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import logo from "../../assets/branding/preonic-logo-main.png";
import { useAuth } from "../../contexts/AuthContext";
import { COMPANY } from "../../constants";
import "./Footer.css";

const ROLE_CONFIG = {
  farmer: {
    home: "/farmer-home",
    products: "/farmer-products",
    solutions: "/farmer-solutions",
    contact: "/farmer-contact",
    ai: "/farmer-ai-agriculture",
    dashboard: "/farmer",
  },
  enterprise: {
    home: "/enterprise-home",
    products: "/enterprise-products",
    solutions: "/enterprise-solutions",
    contact: "/enterprise-contact",
    ai: "/enterprise-ai-agriculture",
    dashboard: "/enterprise",
  },
  guest: {
    home: "/",
    products: "/products",
    solutions: "/solutions",
    contact: "/contact",
    ai: "/ai-agriculture",
    dashboard: null,
  },
};

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <span>{children}</span>
      <FiArrowRight aria-hidden="true" />
    </Link>
  );
}

function Footer() {
  const { user } = useAuth();
  const role = user?.role || "guest";
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.guest;
  const year = new Date().getFullYear();

  const platformLinks = [
    { label: "Trang chủ", path: config.home },
    {
      label:
        role === "farmer"
          ? "Sản phẩm của tôi"
          : role === "enterprise"
            ? "Nguồn cung"
            : "Danh sách sản phẩm",
      path: config.products,
    },
    { label: "Giải pháp", path: config.solutions },
    ...(config.dashboard
      ? [{ label: "Dashboard", path: config.dashboard }]
      : []),
  ];

  const supportLinks =
    role === "guest"
      ? [
          { label: "Đăng nhập", path: "/auth" },
          { label: "Đăng ký tài khoản", path: "/register" },
          { label: "Khám phá sản phẩm", path: "/products" },
          { label: "Liên hệ hỗ trợ", path: config.contact },
          { label: "AI nông nghiệp", path: config.ai },
        ]
      : [
          { label: "Hồ sơ cá nhân", path: "/profile" },
          { label: "Liên hệ hỗ trợ", path: config.contact },
          {
            label: role === "farmer" ? "AI nông nghiệp" : "AI thu mua",
            path: config.ai,
          },
        ];

  return (
    <footer className="preonic-footer">
      <div className="preonic-footer__ambient preonic-footer__ambient--one" />
      <div className="preonic-footer__ambient preonic-footer__ambient--two" />

      <div className="preonic-footer__container">
        <div className="preonic-footer__content">
          <div className="preonic-footer__brand-column">
            <Link className="preonic-footer__brand" to={config.home}>
              <span className="preonic-footer__logo-shell">
                <img src={logo} alt="PreOnic" />
              </span>
              <span>
                <strong>PreOnic</strong>
                <small>Nông nghiệp số minh bạch</small>
              </span>
            </Link>

            <p className="preonic-footer__description">
              Nền tảng kết nối nông dân và doanh nghiệp, hỗ trợ quản lý nguồn
              cung, hợp đồng, đặt cọc và uy tín đối tác trong một luồng thống
              nhất.
            </p>

            <div className="preonic-footer__contact-list">
              <a href={`mailto:${COMPANY.SUPPORT_EMAIL}`}>
                <FiMail /> {COMPANY.SUPPORT_EMAIL}
              </a>
              <span>
                <FiMapPin /> Việt Nam
              </span>
            </div>
          </div>

          <div className="preonic-footer__link-column">
            <h3>Nền tảng</h3>
            <nav aria-label="Liên kết nền tảng">
              {platformLinks.map((item) => (
                <FooterLink key={`${item.label}-${item.path}`} to={item.path}>
                  {item.label}
                </FooterLink>
              ))}
            </nav>
          </div>

          <div className="preonic-footer__link-column">
            <h3>Hỗ trợ</h3>
            <nav aria-label="Liên kết hỗ trợ">
              {supportLinks.map((item) => (
                <FooterLink key={`${item.label}-${item.path}`} to={item.path}>
                  {item.label}
                </FooterLink>
              ))}
            </nav>
          </div>

          <div className="preonic-footer__trust-column">
            <h3>Giao dịch đáng tin cậy</h3>

            <div className="preonic-footer__trust-card">
              <span>
                <FiFileText />
              </span>
              <div>
                <strong>Hợp đồng rõ ràng</strong>
                <small>Theo dõi trạng thái ký và điều khoản giao dịch.</small>
              </div>
            </div>

            <div className="preonic-footer__trust-card">
              <span>
                <FiLock />
              </span>
              <div>
                <strong>Đặt cọc minh bạch</strong>
                <small>Quản lý escrow và lịch sử thanh toán tập trung.</small>
              </div>
            </div>

            <div className="preonic-footer__trust-card">
              <span>
                <FiUsers />
              </span>
              <div>
                <strong>Uy tín đối tác</strong>
                <small>Đánh giá dựa trên lịch sử hợp tác thực tế.</small>
              </div>
            </div>
          </div>
        </div>

        <div className="preonic-footer__assurance">
          <span>
            <FiShield /> Bảo vệ thông tin tài khoản
          </span>
          <span>
            <FiCheckCircle /> Quy trình giao dịch có trạng thái rõ ràng
          </span>
          <span>
            <FiCheckCircle /> Tối ưu cho Farmer và Enterprise
          </span>
        </div>

        <div className="preonic-footer__bottom">
          <p>© {year} PreOnic. All rights reserved.</p>
          <p>Sản phẩm phát triển cho hệ sinh thái kết nối nông nghiệp số.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
